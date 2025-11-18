import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const XENDIT_BASE_URL = 'https://api.xendit.co';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }

  try {
    // Get Supabase URL and keys
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const xenditSecretKey = Deno.env.get('XENDIT_SECRET_KEY');

    if (!xenditSecretKey) {
      return new Response(
        JSON.stringify({
          error: 'XENDIT_SECRET_KEY not configured',
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error: 'Missing authorization header',
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Extract token
    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client with user's token for RLS
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Parse request body
    const { subscriptionId, planType, paymentMethod } = await req.json();

    if (!subscriptionId || !planType || !paymentMethod) {
      return new Response(
        JSON.stringify({
          error: 'Missing subscriptionId, planType, or paymentMethod',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Verify subscription belongs to user
    const { data: subscription, error: subError } = await supabase
      .from('caterer_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('caterer_id', user.id)
      .single();

    if (subError || !subscription) {
      return new Response(
        JSON.stringify({
          error: 'Subscription not found',
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Get user email for invoice
    const { data: userData } = await supabase
      .from('users')
      .select('email, username')
      .eq('id', user.id)
      .single();

    const amount = planType === 'monthly' ? 200 : 2000;
    const planName = planType === 'monthly' ? 'Monthly Premium' : 'Yearly Premium';
    const externalId = `subscription_${subscriptionId}_${Date.now()}`;

    // Get channel code for payment method
    const getChannelCode = (method: string) => {
      switch (method.toLowerCase()) {
        case 'gcash':
          return 'PH_GCASH';
        case 'paymaya':
          return 'PH_PAYMAYA';
        default:
          throw new Error(`Unsupported payment method: ${method}`);
      }
    };

    const channelCode = getChannelCode(paymentMethod);
    const authHeaderValue = `Basic ${btoa(xenditSecretKey + ':')}`;

    // Direct app redirect URLs - bypass browser completely
    const successUrl = `caterhub://subscription/success?subscriptionId=${subscriptionId}`;
    const failureUrl = `caterhub://subscription/failed?subscriptionId=${subscriptionId}`;

    // Build channel_properties - PayMaya requires cancel_redirect_url
    const channelProperties: any = {
      success_redirect_url: successUrl,
      failure_redirect_url: failureUrl,
    };

    // PayMaya requires cancel_redirect_url
    if (channelCode === 'PH_PAYMAYA') {
      channelProperties.cancel_redirect_url = failureUrl;
    }

    // Create Xendit eWallet charge (same as customer payments)
    const ewalletResponse = await fetch(`${XENDIT_BASE_URL}/ewallets/charges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeaderValue,
      },
      body: JSON.stringify({
        reference_id: externalId,
        currency: 'PHP',
        amount: amount,
        checkout_method: 'ONE_TIME_PAYMENT',
        channel_code: channelCode,
        channel_properties: channelProperties,
        customer_id: user.id,
        callback_url: `${supabaseUrl}/functions/v1/xendit-webhook`,
        metadata: {
          subscription_id: subscriptionId.toString(),
          caterer_id: user.id,
          plan_type: planType,
        },
      }),
    });

    if (!ewalletResponse.ok) {
      const errorData = await ewalletResponse.json();
      console.error('[create-subscription-payment] eWallet charge creation failed:', errorData);
      return new Response(
        JSON.stringify({
          error: 'Failed to create payment',
          details: errorData,
        }),
        {
          status: ewalletResponse.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const ewalletData = await ewalletResponse.json();
    console.log('[create-subscription-payment] eWallet charge created:', ewalletData);

    // Update subscription with charge ID
    const { error: updateError } = await supabase
      .from('caterer_subscriptions')
      .update({
        xendit_invoice_id: ewalletData.id, // Store charge ID in invoice_id field for compatibility
        xendit_payment_id: ewalletData.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);

    if (updateError) {
      console.error('[create-subscription-payment] Error updating subscription:', updateError);
    }

    // Get checkout URL from actions
    const checkoutUrl = ewalletData.actions?.mobile_web_checkout_url || 
                        ewalletData.actions?.desktop_web_checkout_url || 
                        ewalletData.actions?.mobile_deeplink_checkout_url ||
                        ewalletData.actions?.qr_checkout_string || // Fallback for QR codes
                        null;

    console.log('[create-subscription-payment] eWallet charge created:', {
      chargeId: ewalletData.id,
      status: ewalletData.status,
      actions: ewalletData.actions,
      checkoutUrl: checkoutUrl
    });

    if (!checkoutUrl) {
      console.error('[create-subscription-payment] No checkout URL found in eWallet response');
      return new Response(
        JSON.stringify({
          error: 'No checkout URL available. Payment may be pending.',
          details: {
            chargeId: ewalletData.id,
            status: ewalletData.status,
            actions: ewalletData.actions
          }
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        type: 'ewallet',
        chargeId: ewalletData.id,
        referenceId: ewalletData.reference_id,
        checkoutUrl: checkoutUrl,
        status: ewalletData.status,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('[create-subscription-payment] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

