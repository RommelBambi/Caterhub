import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAYMONGO_BASE_URL = 'https://api.paymongo.com/v1';

interface CheckPaymentRequest {
  paymentIntentId?: string;
  paymentSourceId?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
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
    // This ensures RLS policies work correctly
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

    // Get PayMongo secret key
    const paymongoSecretKey = Deno.env.get('PAYMONGO_SECRET_KEY');
    if (!paymongoSecretKey) {
      console.error('PAYMONGO_SECRET_KEY not set in Supabase secrets');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: CheckPaymentRequest = await req.json();
    const { paymentIntentId, paymentSourceId } = body;

    if (!paymentIntentId && !paymentSourceId) {
      return new Response(
        JSON.stringify({ error: 'Missing paymentIntentId or paymentSourceId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create auth header for PayMongo
    const authHeaderValue = `Basic ${btoa(paymongoSecretKey + ':')}`;

    // Check Payment Intent status (prioritize this)
    if (paymentIntentId) {
      const intentResponse = await fetch(`${PAYMONGO_BASE_URL}/payment_intents/${paymentIntentId}`, {
        method: 'GET',
        headers: {
          'Authorization': authHeaderValue,
        },
      });

      if (intentResponse.ok) {
        const intentData = await intentResponse.json();
        const paymentIntent = intentData.data;

        return new Response(
          JSON.stringify({
            success: true,
            type: 'payment_intent',
            status: paymentIntent.attributes.status,
            paymentIntent: paymentIntent,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else if (intentResponse.status === 404) {
        // Payment intent not found - might have been consumed or doesn't exist
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Payment intent not found',
            status: 'unknown',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        const errorData = await intentResponse.json();
        console.error('Payment Intent check failed:', errorData);
        return new Response(
          JSON.stringify({ error: 'Failed to check payment intent', details: errorData }),
          { status: intentResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fallback: Check Payment Source status
    if (paymentSourceId) {
      const sourceResponse = await fetch(`${PAYMONGO_BASE_URL}/sources/${paymentSourceId}`, {
        method: 'GET',
        headers: {
          'Authorization': authHeaderValue,
        },
      });

      if (sourceResponse.ok) {
        const sourceData = await sourceResponse.json();
        const source = sourceData.data;

        return new Response(
          JSON.stringify({
            success: true,
            type: 'payment_source',
            status: source.attributes.status,
            source: source,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        const errorData = await sourceResponse.json();
        console.error('Payment Source check failed:', errorData);
        return new Response(
          JSON.stringify({ error: 'Failed to check payment source', details: errorData }),
          { status: sourceResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'No payment method provided' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

