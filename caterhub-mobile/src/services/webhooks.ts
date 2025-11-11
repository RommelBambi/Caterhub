/**
 * PayMongo Webhook Handler Service
 * Processes webhook events from PayMongo and updates bookings
 */

import { supabase } from './supabase';

export interface PaymentWebhook {
  id: number;
  event_id: string;
  event_type: string;
  payment_intent_id: string | null;
  payment_source_id: string | null;
  status: string | null;
  payload: any;
  processed: boolean | null;
  processed_at: string | null;
  created_at: string;
}

/**
 * Save webhook event to database
 * This should be called by a Supabase Edge Function when PayMongo sends a webhook
 */
export async function saveWebhookEvent(
  eventId: string,
  eventType: string,
  payload: any,
  paymentIntentId?: string,
  paymentSourceId?: string,
  status?: string
): Promise<PaymentWebhook> {
  const { data, error } = await supabase
    .from('payment_webhooks')
    .insert({
      event_id: eventId,
      event_type: eventType,
      payment_intent_id: paymentIntentId || null,
      payment_source_id: paymentSourceId || null,
      status: status || null,
      payload: payload,
      processed: false,
    })
    .select()
    .single();

  if (error) {
    console.error('[saveWebhookEvent] Error saving webhook:', error);
    throw error;
  }

  console.log('[saveWebhookEvent] Webhook saved:', data.id);
  return data;
}

/**
 * Process a webhook event
 * Updates booking status based on payment event
 */
export async function processWebhook(webhookId: number): Promise<void> {
  // Fetch the webhook
  const { data: webhook, error: fetchError } = await supabase
    .from('payment_webhooks')
    .select('*')
    .eq('id', webhookId)
    .single();

  if (fetchError || !webhook) {
    console.error('[processWebhook] Error fetching webhook:', fetchError);
    throw new Error('Webhook not found');
  }

  if (webhook.processed) {
    console.log('[processWebhook] Webhook already processed:', webhookId);
    return;
  }

  try {
    // Extract payment information from payload
    const payload = webhook.payload;
    const eventType = webhook.event_type;
    const paymentIntentId = webhook.payment_intent_id;
    const status = webhook.status || payload?.data?.attributes?.status;

    console.log('[processWebhook] Processing webhook:', {
      id: webhookId,
      eventType,
      paymentIntentId,
      status,
    });

    // Find booking by payment_intent_id
    if (paymentIntentId) {
      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('payment_intent_id', paymentIntentId)
        .limit(1);

      if (bookingError) {
        console.error('[processWebhook] Error fetching booking:', bookingError);
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
            // Payment succeeded
            updateData = {
              payment_status: 'COMPLETED',
              deposit_paid: true,
              paid_at: new Date().toISOString(),
              status: 'CONFIRMED',
            };
            break;

          case 'payment.failed':
          case 'payment_intent.failed':
            // Payment failed
            updateData = {
              payment_status: 'FAILED',
              deposit_paid: false,
              status: 'PENDING',
            };
            break;

          case 'payment.refunded':
          case 'payment_intent.refunded':
            // Payment refunded
            updateData = {
              payment_status: 'REFUNDED',
              deposit_paid: false,
              status: 'CANCELLED',
            };
            break;

          case 'payment.pending':
          case 'payment_intent.awaiting_payment_method':
            // Payment pending
            updateData = {
              payment_status: 'PENDING',
              deposit_paid: false,
            };
            break;

          default:
            console.log('[processWebhook] Unknown event type:', eventType);
            // Still mark as processed but don't update booking
            break;
        }

        // Update booking if we have changes
        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from('bookings')
            .update(updateData)
            .eq('id', booking.id);

          if (updateError) {
            console.error('[processWebhook] Error updating booking:', updateError);
            throw updateError;
          }

          console.log('[processWebhook] Booking updated:', booking.id, updateData);
        }
      } else {
        console.warn('[processWebhook] No booking found for payment_intent_id:', paymentIntentId);
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
      console.error('[processWebhook] Error marking webhook as processed:', markError);
      throw markError;
    }

    console.log('[processWebhook] Webhook processed successfully:', webhookId);
  } catch (error) {
    console.error('[processWebhook] Error processing webhook:', error);
    throw error;
  }
}

/**
 * Get unprocessed webhooks
 * Useful for retry logic or manual processing
 */
export async function getUnprocessedWebhooks(): Promise<PaymentWebhook[]> {
  const { data, error } = await supabase
    .from('payment_webhooks')
    .select('*')
    .eq('processed', false)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[getUnprocessedWebhooks] Error:', error);
    throw error;
  }

  return data || [];
}

/**
 * Retry processing failed webhooks
 */
export async function retryUnprocessedWebhooks(): Promise<void> {
  const unprocessed = await getUnprocessedWebhooks();
  console.log(`[retryUnprocessedWebhooks] Found ${unprocessed.length} unprocessed webhooks`);

  for (const webhook of unprocessed) {
    try {
      await processWebhook(webhook.id);
    } catch (error) {
      console.error(`[retryUnprocessedWebhooks] Error processing webhook ${webhook.id}:`, error);
      // Continue with next webhook
    }
  }
}

