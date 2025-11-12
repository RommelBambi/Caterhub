import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const XENDIT_BASE_URL = 'https://api.xendit.co';
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Get Supabase URL and keys
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: 'Missing authorization header'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Extract token
    const token = authHeader.replace('Bearer ', '');
    // Create Supabase client with user's token for RLS
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const xenditSecretKey = Deno.env.get('XENDIT_SECRET_KEY');
    if (!xenditSecretKey) {
      return new Response(JSON.stringify({
        error: 'Server configuration error'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const body = await req.json();
    const { amount, currency, description, bookingId, userId, paymentMethod, customerInfo, returnUrl } = body;
    if (!amount || !description || !bookingId || !userId || !paymentMethod) {
      return new Response(JSON.stringify({
        error: 'Missing required fields'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Convert bookingId to integer if it's a string
    const bookingIdInt = typeof bookingId === 'string' ? parseInt(bookingId, 10) : bookingId;
    console.log('[create-xendit-payment] Checking booking:', {
      bookingId,
      bookingIdInt,
      userId
    });
    const { data: booking, error: bookingError } = await supabase.from('bookings').select('id, user_id').eq('id', bookingIdInt).eq('user_id', userId).single();
    console.log('[create-xendit-payment] Booking query result:', {
      booking,
      bookingError
    });
    if (bookingError || !booking) {
      console.error('[create-xendit-payment] Booking verification failed:', {
        bookingId: bookingIdInt,
        userId,
        error: bookingError,
        booking
      });
      return new Response(JSON.stringify({
        error: 'Booking not found or unauthorized',
        details: {
          bookingId: bookingIdInt,
          userId,
          error: bookingError?.message || bookingError?.code || 'Unknown error'
        }
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('[create-xendit-payment] Booking verified successfully:', booking);
    const authHeaderValue = `Basic ${btoa(xenditSecretKey + ':')}`;
    const externalId = `booking_${bookingId}_${Date.now()}`;
    // Default redirect URLs
    const successUrl = returnUrl || `${supabaseUrl}/functions/v1/xendit-redirect?status=success&booking_id=${bookingId}`;
    const failureUrl = `${supabaseUrl}/functions/v1/xendit-redirect?status=failed&booking_id=${bookingId}`;
    if (paymentMethod === 'invoice') {
      // Use Xendit Invoice API for multiple payment methods
      const invoiceResponse = await fetch(`${XENDIT_BASE_URL}/v2/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeaderValue
        },
        body: JSON.stringify({
          external_id: externalId,
          amount: amount,
          currency: currency || 'PHP',
          description: description,
          invoice_duration: 86400,
          customer: customerInfo ? {
            given_names: customerInfo.name?.split(' ')[0] || 'Customer',
            surname: customerInfo.name?.split(' ').slice(1).join(' ') || '',
            email: customerInfo.email || user.email || '',
            mobile_number: customerInfo.phone || ''
          } : undefined,
          success_redirect_url: successUrl,
          failure_redirect_url: failureUrl,
          callback_url: `${supabaseUrl}/functions/v1/xendit-webhook`,
          payment_methods: [
            'GCASH',
            'PAYMAYA',
            'BPI',
            'BDO',
            'UNIONBANK',
            'DRAGONPAY'
          ],
          metadata: {
            bookingId: bookingId.toString(),
            userId: userId
          }
        })
      });
      if (!invoiceResponse.ok) {
        const errorData = await invoiceResponse.json();
        console.error('[create-xendit-payment] Invoice creation failed:', errorData);
        return new Response(JSON.stringify({
          error: 'Failed to create invoice',
          details: errorData
        }), {
          status: invoiceResponse.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      const invoiceData = await invoiceResponse.json();
      console.log('[create-xendit-payment] Invoice created:', invoiceData);
      // Update booking with Xendit invoice info
      await supabase.from('bookings').update({
        payment_method: 'xendit_invoice',
        payment_status: 'PENDING',
        xendit_invoice_id: invoiceData.id,
        xendit_external_id: invoiceData.external_id,
        deposit_paid: false,
        remaining_paid: false
      }).eq('id', bookingIdInt);
      return new Response(JSON.stringify({
        success: true,
        type: 'invoice',
        invoiceId: invoiceData.id,
        externalId: invoiceData.external_id,
        checkoutUrl: invoiceData.invoice_url,
        expiryDate: invoiceData.expiry_date
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    } else {
      // Use Xendit eWallet API for specific payment methods
      const channelCode = getChannelCode(paymentMethod);
      const ewalletResponse = await fetch(`${XENDIT_BASE_URL}/ewallets/charges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeaderValue
        },
        body: JSON.stringify({
          reference_id: externalId,
          currency: currency || 'PHP',
          amount: amount,
          checkout_method: 'ONE_TIME_PAYMENT',
          channel_code: channelCode,
          channel_properties: {
            success_redirect_url: successUrl,
            failure_redirect_url: failureUrl
          },
          customer_id: userId,
          callback_url: `${supabaseUrl}/functions/v1/xendit-webhook`,
          metadata: {
            bookingId: bookingId.toString(),
            userId: userId
          }
        })
      });
      if (!ewalletResponse.ok) {
        const errorData = await ewalletResponse.json();
        console.error('[create-xendit-payment] eWallet charge creation failed:', errorData);
        return new Response(JSON.stringify({
          error: 'Failed to create eWallet charge',
          details: errorData
        }), {
          status: ewalletResponse.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      const ewalletData = await ewalletResponse.json();
      console.log('[create-xendit-payment] eWallet charge created:', ewalletData);
      // Update booking with Xendit eWallet info
      await supabase.from('bookings').update({
        payment_method: paymentMethod,
        payment_status: 'PENDING',
        xendit_charge_id: ewalletData.id,
        xendit_external_id: ewalletData.reference_id,
        deposit_paid: false,
        remaining_paid: false
      }).eq('id', bookingIdInt);
      // Get checkout URL from actions
      const checkoutUrl = ewalletData.actions?.mobile_web_checkout_url || ewalletData.actions?.desktop_web_checkout_url || ewalletData.actions?.mobile_deeplink_checkout_url;
      return new Response(JSON.stringify({
        success: true,
        type: 'ewallet',
        chargeId: ewalletData.id,
        referenceId: ewalletData.reference_id,
        checkoutUrl: checkoutUrl,
        status: ewalletData.status
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({
      error: error?.message || 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
function getChannelCode(paymentMethod) {
  switch(paymentMethod.toLowerCase()){
    case 'gcash':
      return 'PH_GCASH';
    case 'paymaya':
      return 'PH_PAYMAYA';
    case 'grabpay':
    case 'grab_pay':
      return 'PH_GRABPAY';
    default:
      throw new Error(`Unsupported payment method: ${paymentMethod}`);
  }
}
