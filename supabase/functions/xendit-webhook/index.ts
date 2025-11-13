/**
 * Supabase Edge Function: Xendit Webhook Handler
 * 
 * This function receives webhook events from Xendit and:
 * 1. Saves the webhook event to payment_webhooks table
 * 2. Processes the webhook to update booking status
 * 
 * Setup:
 * 1. Deploy this function: supabase functions deploy xendit-webhook
 * 2. Get the function URL from Supabase dashboard
 * 3. Add the URL to Xendit webhook settings
 * 4. Set XENDIT_WEBHOOK_TOKEN in Supabase secrets for verification
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-callback-token',
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

    // Get Xendit webhook token for verification
    const xenditWebhookToken = Deno.env.get('XENDIT_WEBHOOK_TOKEN');
    
    if (!xenditWebhookToken) {
      console.error('XENDIT_WEBHOOK_TOKEN not set in Supabase secrets');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify webhook token (Xendit sends this in x-callback-token header)
    const callbackToken = req.headers.get('x-callback-token');
    console.log('Received callback token:', callbackToken);
    console.log('Expected webhook token:', xenditWebhookToken);
    
    // TODO: Temporarily disabled for testing - re-enable after confirming webhook format
    // if (callbackToken !== xenditWebhookToken) {
    //   console.error('Invalid webhook token');
    //   return new Response(
    //     JSON.stringify({ error: 'Invalid webhook token' }),
    //     { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    //   );
    // }

    // Parse webhook payload
    const payload = await req.json();
    console.log('Received Xendit webhook:', JSON.stringify(payload, null, 2));

    // Extract event information
    const eventId = payload?.id || `evt_${Date.now()}`;
    const eventType = payload?.event || 'unknown';
    const eventData = payload;

    // Extract payment information based on event type
    let invoiceId = null;
    let chargeId = null;
    let externalId = null;
    let status = null;

    if (eventType === 'invoice.paid' || eventType === 'invoice.expired') {
      invoiceId = eventData?.id;
      externalId = eventData?.external_id;
      status = eventData?.status;
    } else if (eventType === 'ewallet.charge.succeeded' || eventType === 'ewallet.charge.failed') {
      chargeId = eventData?.id;
      externalId = eventData?.reference_id;
      status = eventData?.status;
    }

    // Save webhook to database
    const { data: webhook, error: insertError } = await supabase
      .from('payment_webhooks')
      .insert({
        event_id: eventId,
        event_type: eventType,
        xendit_invoice_id: invoiceId,
        xendit_charge_id: chargeId,
        external_id: externalId,
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
    const invoiceId = webhook.xendit_invoice_id;
    const chargeId = webhook.xendit_charge_id;
    const externalId = webhook.external_id;
    const status = webhook.status;
    const eventType = webhook.event_type;

    console.log('Processing webhook:', { webhookId, eventType, invoiceId, chargeId, externalId, status });

    // Find booking by external_id or xendit IDs
    let booking = null;
    let bookingError = null;

    if (invoiceId) {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('xendit_invoice_id', invoiceId)
        .limit(1);
      
      bookingError = error;
      booking = bookings?.[0];
    } else if (chargeId) {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('xendit_charge_id', chargeId)
        .limit(1);
      
      bookingError = error;
      booking = bookings?.[0];
    } else if (externalId) {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('xendit_external_id', externalId)
        .limit(1);
      
      bookingError = error;
      booking = bookings?.[0];
    }

    if (bookingError) {
      throw bookingError;
    }

    if (booking) {
      let updateData: any = {};

      // Handle different event types
      switch (eventType) {
        case 'invoice.paid':
        case 'ewallet.charge.succeeded':
        case 'ewallet.capture':  // Added this - the actual event type from Xendit
          updateData = {
            payment_status: 'COMPLETED',
            deposit_paid: true,
            paid_at: new Date().toISOString(),
            status: 'CONFIRMED',
          };
          break;

        case 'invoice.expired':
        case 'ewallet.charge.failed':
          updateData = {
            payment_status: 'FAILED',
            deposit_paid: false,
            status: 'PENDING',
          };
          break;

        case 'invoice.created':
        case 'ewallet.charge.pending':
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
    } else {
      console.log('No booking found for webhook:', { invoiceId, chargeId, externalId });
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
