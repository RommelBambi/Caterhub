/**
 * Supabase Edge Function: PayMongo Webhook Handler
 * 
 * This function receives webhook events from PayMongo and:
 * 1. Saves the webhook event to payment_webhooks table
 * 2. Processes the webhook to update booking status
 * 
 * Setup:
 * 1. Deploy this function: supabase functions deploy paymongo-webhook
 * 2. Get the function URL from Supabase dashboard
 * 3. Add the URL to PayMongo webhook settings
 * 4. Set PAYMONGO_SECRET_KEY in Supabase secrets
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get PayMongo secret key for webhook verification
    const paymongoSecretKey = Deno.env.get('PAYMONGO_SECRET_KEY');
    
    if (!paymongoSecretKey) {
      console.error('PAYMONGO_SECRET_KEY not set in Supabase secrets');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse webhook payload
    const payload = await req.json();
    console.log('Received webhook:', JSON.stringify(payload, null, 2));

    // Extract event information
    const eventId = payload?.data?.id || `evt_${Date.now()}`;
    const eventType = payload?.type || 'unknown';
    const eventData = payload?.data;

    // Extract payment information
    const paymentIntentId = eventData?.attributes?.payment_intent?.id || 
                           eventData?.attributes?.payment_intent_id ||
                           null;
    const paymentSourceId = eventData?.attributes?.source?.id || 
                           eventData?.attributes?.payment_source_id ||
                           null;
    const status = eventData?.attributes?.status || null;

    // Verify webhook signature (optional but recommended)
    // PayMongo sends webhook signature in headers
    const signature = req.headers.get('paymongo-signature');
    if (signature) {
      // TODO: Implement signature verification
      // const isValid = verifyPayMongoSignature(payload, signature, paymongoSecretKey);
      // if (!isValid) {
      //   return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 });
      // }
    }

    // Save webhook to database
    const { data: webhook, error: insertError } = await supabase
      .from('payment_webhooks')
      .insert({
        event_id: eventId,
        event_type: eventType,
        payment_intent_id: paymentIntentId,
        payment_source_id: paymentSourceId,
        status: status,
        payload: payload,
        processed: false,
      })
      .select()
      .single();

    if (insertError) {
      // Check if it's a duplicate (event_id already exists)
      if (insertError.code === '23505') {
        console.log('Webhook already processed:', eventId);
        return new Response(
          JSON.stringify({ message: 'Webhook already processed' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.error('Error saving webhook:', insertError);
      throw insertError;
    }

    console.log('Webhook saved:', webhook.id);

    // Process webhook asynchronously (don't wait for it)
    // This allows PayMongo to get a quick response
    processWebhookAsync(supabase, webhook.id).catch(err => {
      console.error('Error processing webhook:', err);
    });

    // Return success immediately
    return new Response(
      JSON.stringify({ 
        message: 'Webhook received',
        webhook_id: webhook.id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Webhook handler error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/**
 * Process webhook asynchronously
 */
async function processWebhookAsync(supabase: any, webhookId: number) {
  try {
    // Fetch the webhook
    const { data: webhook, error: fetchError } = await supabase
      .from('payment_webhooks')
      .select('*')
      .eq('id', webhookId)
      .single();

    if (fetchError || !webhook) {
      throw new Error('Webhook not found');
    }

    if (webhook.processed) {
      console.log('Webhook already processed:', webhookId);
      return;
    }

    // Extract payment information
    const paymentIntentId = webhook.payment_intent_id;
    const status = webhook.status;
    const eventType = webhook.event_type;

    console.log('Processing webhook:', { webhookId, eventType, paymentIntentId, status });

    // Find booking by payment_intent_id
    if (paymentIntentId) {
      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('payment_intent_id', paymentIntentId)
        .limit(1);

      if (bookingError) {
        throw bookingError;
      }

      if (bookings && bookings.length > 0) {
        const booking = bookings[0];
        let updateData: any = {};

        // Handle different event types
        switch (eventType) {
          case 'payment.paid':
          case 'payment.succeeded':
          case 'payment_intent.succeeded':
            updateData = {
              payment_status: 'COMPLETED',
              deposit_paid: true,
              paid_at: new Date().toISOString(),
              status: 'CONFIRMED',
            };
            break;

          case 'payment.failed':
          case 'payment_intent.failed':
            updateData = {
              payment_status: 'FAILED',
              deposit_paid: false,
              status: 'PENDING',
            };
            break;

          case 'payment.refunded':
          case 'payment_intent.refunded':
            updateData = {
              payment_status: 'REFUNDED',
              deposit_paid: false,
              status: 'CANCELLED',
            };
            break;

          case 'payment.pending':
          case 'payment_intent.awaiting_payment_method':
            updateData = {
              payment_status: 'PENDING',
              deposit_paid: false,
            };
            break;
        }

        // Update booking if we have changes
        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from('bookings')
            .update(updateData)
            .eq('id', booking.id);

          if (updateError) {
            throw updateError;
          }

          console.log('Booking updated:', booking.id, updateData);
        }
      }
    }

    // Mark webhook as processed
    const { error: markError } = await supabase
      .from('payment_webhooks')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq('id', webhookId);

    if (markError) {
      throw markError;
    }

    console.log('Webhook processed successfully:', webhookId);
  } catch (error) {
    console.error('Error processing webhook:', error);
    throw error;
  }
}

