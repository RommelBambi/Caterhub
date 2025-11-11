import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAYMONGO_BASE_URL = 'https://api.paymongo.com/v1';

interface PaymentRequest {
  amount: number;
  currency: 'PHP';
  description: string;
  bookingId: string;
  userId: string;
  paymentMethod: 'gcash' | 'paymaya' | 'grab_pay' | 'card';
  returnUrl?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Supabase URL and keys
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract token
    const token = authHeader.replace('Bearer ', '');
    
    // Create Supabase client with user's token for RLS
    // This ensures RLS policies work correctly - the client will use the user's JWT
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymongoSecretKey = Deno.env.get('PAYMONGO_SECRET_KEY');
    if (!paymongoSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: PaymentRequest = await req.json();
    const { amount, currency, description, bookingId, userId, paymentMethod, returnUrl } = body;

    if (!amount || !description || !bookingId || !userId || !paymentMethod) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert bookingId to integer if it's a string (database stores as integer)
    const bookingIdInt = typeof bookingId === 'string' ? parseInt(bookingId, 10) : bookingId;
    
    console.log('[create-payment] Checking booking:', { bookingId, bookingIdInt, userId });
    
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, user_id')
      .eq('id', bookingIdInt)
      .eq('user_id', userId)
      .single();

    console.log('[create-payment] Booking query result:', { booking, bookingError });

    if (bookingError || !booking) {
      console.error('[create-payment] Booking verification failed:', {
        bookingId: bookingIdInt,
        userId,
        error: bookingError,
        booking,
      });
      return new Response(
        JSON.stringify({ 
          error: 'Booking not found or unauthorized',
          details: {
            bookingId: bookingIdInt,
            userId,
            error: bookingError?.message || bookingError?.code || 'Unknown error',
          }
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-payment] Booking verified successfully:', booking);

    const authHeaderValue = `Basic ${btoa(paymongoSecretKey + ':')}`;

    const intentResponse = await fetch(`${PAYMONGO_BASE_URL}/payment_intents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeaderValue,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount,
            currency: currency || 'PHP',
            description,
            statement_descriptor: 'CaterHub',
            payment_method_allowed: ['gcash', 'grab_pay', 'paymaya', 'card'],
            metadata: {
              bookingId,
              userId,
            },
          },
        },
      }),
    });

    if (!intentResponse.ok) {
      const errorData = await intentResponse.json();
      return new Response(
        JSON.stringify({ error: 'Failed to create payment intent', details: errorData }),
        { status: intentResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const intentData = await intentResponse.json();
    const paymentIntent = intentData.data;

    if (paymentMethod === 'gcash' || paymentMethod === 'paymaya') {
      const { data: userProfile } = await supabase
        .from('users')
        .select('username, email')
        .eq('id', userId)
        .single();

      const methodResponse = await fetch(`${PAYMONGO_BASE_URL}/payment_methods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeaderValue,
        },
        body: JSON.stringify({
          data: {
            attributes: {
              type: paymentMethod,
              billing: {
                name: userProfile?.username || user?.email || 'Customer',
                email: user?.email || '',
                phone: '',
              },
            },
          },
        }),
      });

      if (!methodResponse.ok) {
        const errorData = await methodResponse.json();
        return new Response(
          JSON.stringify({ error: 'Failed to create payment method', details: errorData }),
          { status: methodResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const methodData = await methodResponse.json();
      const paymentMethodObj = methodData.data;

      const attachResponse = await fetch(
        `${PAYMONGO_BASE_URL}/payment_intents/${paymentIntent.id}/attach`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeaderValue,
          },
          body: JSON.stringify({
            data: {
              attributes: {
                payment_method: paymentMethodObj.id,
                client_key: paymentIntent.attributes.client_key,
                return_url: returnUrl || 'https://www.paymongo.com/success',
              },
            },
          }),
        }
      );

      if (!attachResponse.ok) {
        const errorData = await attachResponse.json();
        return new Response(
          JSON.stringify({ error: 'Failed to attach payment method', details: errorData }),
          { status: attachResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const attachedData = await attachResponse.json();
      const attachedIntent = attachedData.data;
      
      console.log('[create-payment] Attached Payment Intent:', {
        id: attachedIntent.id,
        status: attachedIntent.attributes.status,
        next_action: attachedIntent.attributes.next_action,
      });
      
      // Check for checkout URL in next_action
      let checkoutUrl = attachedIntent.attributes.next_action?.redirect?.url;
      
      // Also check if next_action is an array (some PayMongo responses use arrays)
      if (!checkoutUrl && Array.isArray(attachedIntent.attributes.next_action?.redirect)) {
        checkoutUrl = attachedIntent.attributes.next_action.redirect[0]?.url;
      }

      console.log('[create-payment] Checkout URL from Payment Intent:', checkoutUrl);

      if (!checkoutUrl) {
        console.log('[create-payment] No checkout URL in Payment Intent, falling back to Source method');
        const sourceResponse = await fetch(`${PAYMONGO_BASE_URL}/sources`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeaderValue,
          },
          body: JSON.stringify({
            data: {
              attributes: {
                amount,
                redirect: {
                  success: returnUrl || 'https://www.paymongo.com/success',
                  failed: 'https://www.paymongo.com/failed',
                },
                type: paymentMethod,
                currency: 'PHP',
                description,
                statement_descriptor: 'CaterHub',
                metadata: {
                  bookingId,
                  paymentIntentId: paymentIntent.id,
                },
              },
            },
          }),
        });

        if (!sourceResponse.ok) {
          const errorData = await sourceResponse.json();
          return new Response(
            JSON.stringify({ error: 'Failed to create payment source', details: errorData }),
            { status: sourceResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const sourceData = await sourceResponse.json();
        const source = sourceData.data;

        await supabase
          .from('bookings')
          .update({
            payment_method: paymentMethod,
            payment_status: 'PENDING',
            payment_intent_id: paymentIntent.id,
            payment_source_id: source.id,
            deposit_paid: false,
            remaining_paid: false,
          })
          .eq('id', bookingId);

        return new Response(
          JSON.stringify({
            success: true,
            paymentIntentId: paymentIntent.id,
            paymentSourceId: source.id,
            checkoutUrl: source.attributes.redirect?.checkout_url,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabase
        .from('bookings')
        .update({
          payment_method: paymentMethod,
          payment_status: 'PENDING',
          payment_intent_id: paymentIntent.id,
          payment_source_id: null,
          deposit_paid: false,
          remaining_paid: false,
        })
        .eq('id', bookingId);

      return new Response(
        JSON.stringify({
          success: true,
          paymentIntentId: paymentIntent.id,
          paymentSourceId: null,
          checkoutUrl: checkoutUrl,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentIntentId: paymentIntent.id,
        clientKey: paymentIntent.attributes.client_key,
        message: 'Payment intent created. Use client key for frontend payment processing.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
