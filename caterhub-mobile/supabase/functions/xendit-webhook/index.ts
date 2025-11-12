// xendit-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-callback-token'
};
serve(async (req)=>{
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // IMPORTANT: Skip token validation for now
    console.log('XENDIT_WEBHOOK_TOKEN not set - skipping validation for testing');
    // Parse webhook payload
    const payload = await req.json();
    console.log('Received Xendit webhook:', JSON.stringify(payload, null, 2));
    // Handle eWallet webhook format
    let eventId;
    let eventType;
    let status;
    let invoiceId = null;
    let chargeId = null;
    let externalId = null;
    // Check if this is an eWallet webhook (your format: {data: {id, status, ...}})
    if (payload.data && payload.data.id && payload.data.status) {
      const data = payload.data;
      eventId = data.id;
      eventType = 'ewallet.charge.' + data.status.toLowerCase();
      status = data.status;
      chargeId = data.id;
      externalId = data.reference_id || null;
      console.log('eWallet webhook detected:', {
        eventId,
        eventType,
        status,
        chargeId,
        externalId
      });
    } else {
      // Handle standard Xendit webhook format
      eventId = payload?.id || `evt_${Date.now()}`;
      eventType = payload?.event || 'unknown';
      status = payload?.status || 'unknown';
      if (eventType === 'invoice.paid' || eventType === 'invoice.expired') {
        invoiceId = payload?.id;
        externalId = payload?.external_id;
      } else if (eventType.includes('ewallet')) {
        chargeId = payload?.id;
        externalId = payload?.reference_id;
      }
    }
    // Save webhook to database
    const { data: webhook, error: insertError } = await supabase.from('payment_webhooks').insert({
      event_id: eventId,
      event_type: eventType,
      xendit_invoice_id: invoiceId,
      xendit_charge_id: chargeId,
      external_id: externalId,
      status: status,
      payload: payload,
      processed: false
    }).select().single();
    if (insertError) {
      // Check if it's a duplicate (event_id already exists)
      if (insertError.code === '23505') {
        console.log('Webhook already processed:', eventId);
        return new Response(JSON.stringify({
          message: 'Webhook already processed'
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      console.error('Error saving webhook:', insertError);
      throw insertError;
    }
    console.log('Webhook saved:', webhook.id);
    // Process webhook asynchronously (don't wait for it)
    processWebhookAsync(supabase, webhook.id).catch((err)=>{
      console.error('Error processing webhook:', err);
    });
    // Return success immediately
    return new Response(JSON.stringify({
      message: 'Webhook received',
      webhook_id: webhook.id
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
/**
 * Process webhook asynchronously
 */ async function processWebhookAsync(supabase, webhookId) {
  try {
    // Fetch the webhook
    const { data: webhook, error: fetchError } = await supabase.from('payment_webhooks').select('*').eq('id', webhookId).single();
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
    console.log('Processing webhook:', {
      webhookId,
      eventType,
      invoiceId,
      chargeId,
      externalId,
      status
    });
    // Better booking lookup with reference_id pattern matching
    let booking = null;
    let bookingError = null;
    // First try direct ID matches
    if (invoiceId) {
      const { data: bookings, error } = await supabase.from('bookings').select('*').eq('xendit_invoice_id', invoiceId).limit(1);
      bookingError = error;
      booking = bookings?.[0];
    } else if (chargeId) {
      const { data: bookings, error } = await supabase.from('bookings').select('*').eq('xendit_charge_id', chargeId).limit(1);
      bookingError = error;
      booking = bookings?.[0];
    }
    // If not found, try external_id
    if (!booking && externalId) {
      const { data: bookings, error } = await supabase.from('bookings').select('*').eq('xendit_external_id', externalId).limit(1);
      bookingError = error;
      booking = bookings?.[0];
    }
    // If still not found, try to extract booking ID from reference_id pattern (booking_54_timestamp)
    if (!booking && externalId) {
      const match = externalId.match(/booking_(\d+)_/);
      if (match) {
        const bookingId = parseInt(match[1]);
        const { data: bookings, error } = await supabase.from('bookings').select('*').eq('id', bookingId).limit(1);
        bookingError = error;
        booking = bookings?.[0];
        console.log('Found booking by ID extraction:', {
          bookingId,
          found: !!booking
        });
      }
    }
    if (bookingError) {
      throw bookingError;
    }
    if (booking) {
      let updateData = {};
      // Handle different event types
      switch(eventType){
        case 'invoice.paid':
        case 'ewallet.charge.succeeded':
        case 'ewallet.capture':
          updateData = {
            payment_status: 'COMPLETED',
            deposit_paid: true,
            paid_at: new Date().toISOString(),
            status: 'CONFIRMED'
          };
          break;
        case 'invoice.expired':
        case 'ewallet.charge.failed':
          updateData = {
            payment_status: 'FAILED',
            deposit_paid: false,
            status: 'PENDING'
          };
          break;
        case 'invoice.created':
        case 'ewallet.charge.pending':
          updateData = {
            payment_status: 'PENDING',
            deposit_paid: false
          };
          break;
      }
      // Update booking if we have changes
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase.from('bookings').update(updateData).eq('id', booking.id);
        if (updateError) {
          throw updateError;
        }
        console.log('Booking updated:', booking.id, updateData);
      }
    } else {
      console.log('No booking found for webhook:', {
        invoiceId,
        chargeId,
        externalId
      });
    }
    // Mark webhook as processed
    const { error: markError } = await supabase.from('payment_webhooks').update({
      processed: true,
      processed_at: new Date().toISOString()
    }).eq('id', webhookId);
    if (markError) {
      throw markError;
    }
    console.log('Webhook processed successfully:', webhookId);
  } catch (error) {
    console.error('Error processing webhook:', error);
    throw error;
  }
}
