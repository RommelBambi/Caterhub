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
    console.log('📥 Received Xendit webhook at:', new Date().toISOString());
    console.log('📦 Webhook payload:', JSON.stringify(payload, null, 2));
    // Handle webhook format
    let eventId;
    let eventType;
    let status;
    let invoiceId = null;
    let chargeId = null;
    let payoutId = null;
    let externalId = null;
    
    // Check for payout/disbursement events FIRST (they can also have payload.data structure)
    // Xendit payout webhooks have: { event: "payout.succeeded", data: { id, status, ... } }
    if (payload?.event && (payload.event.includes('payout') || payload.event.includes('disbursement'))) {
      // This is a payout webhook - handle it as payout, not eWallet
      eventId = payload?.data?.id || payload?.id || `evt_${Date.now()}`;
      eventType = payload.event; // Use the event field directly: "payout.succeeded"
      status = payload?.data?.status || payload?.status || 'unknown';
      
      // Extract payout ID and external ID from data
      payoutId = payload?.data?.id || payload?.id || null;
      externalId = payload?.data?.reference_id || payload?.data?.external_id || payload?.reference_id || payload?.external_id || null;
      
      console.log('🔔 Payout/Disbursement webhook detected (from event field):', {
        eventId,
        eventType,
        status,
        payoutId,
        externalId,
        payloadEvent: payload.event,
        payloadData: payload.data
      });
    } else if (payload.data && payload.data.id && payload.data.status && !payload.event) {
      // Check if this is an eWallet webhook (format: {data: {id, status, ...}} without event field)
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
      
      // If we haven't already detected it as a payout, check for other payout indicators
      if (!payoutId && (eventType.includes('payout') || eventType.includes('disbursement'))) {
        // Extract payout ID from multiple possible locations
        payoutId = payload?.id || 
                   payload?.data?.id || 
                   payload?.payout_id ||
                   payload?.data?.payout_id ||
                   payload?.disbursement_id ||
                   payload?.data?.disbursement_id ||
                   null;
        
        // Extract external/reference ID from multiple possible locations
        externalId = payload?.reference_id || 
                     payload?.data?.reference_id || 
                     payload?.external_id || 
                     payload?.data?.external_id ||
                     payload?.referenceId ||
                     payload?.data?.referenceId ||
                     null;
        
        console.log('🔔 Payout/Disbursement webhook detected (from eventType):', {
          eventId,
          eventType,
          status,
          payoutId,
          externalId,
          payloadType: payload?.type,
          payloadDataType: payload?.data?.type,
          payloadKeys: payload ? Object.keys(payload) : []
        });
      }
      
      // Handle invoice webhooks
      if (eventType === 'invoice.paid' || eventType === 'invoice.expired') {
        invoiceId = payload?.id;
        externalId = payload?.external_id;
      } else if (eventType.includes('ewallet')) {
        chargeId = payload?.id;
        externalId = payload?.reference_id;
      }
    }
    // Save webhook to database
    // Note: If payment_webhooks table doesn't have xendit_payout_id column, 
    // we'll store it in the payload or use external_id for lookup
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
    
    // Extract payout ID from payload if it's a payout webhook
    // Xendit payout webhooks can have the payout ID in various places
    let payoutId = null;
    if (eventType.includes('payout') || eventType.includes('disbursement')) {
      const payload = webhook.payload;
      // Try multiple possible locations for payout ID
      payoutId = payload?.id || 
                 payload?.data?.id || 
                 payload?.payout_id ||
                 payload?.data?.payout_id ||
                 payload?.disbursement_id ||
                 payload?.data?.disbursement_id ||
                 null;
      
      console.log('Extracting payout ID from webhook payload:', {
        eventType,
        payloadId: payload?.id,
        payloadDataId: payload?.data?.id,
        payloadPayoutId: payload?.payout_id,
        payloadDataPayoutId: payload?.data?.payout_id,
        extractedPayoutId: payoutId,
        fullPayloadKeys: payload ? Object.keys(payload) : [],
        payloadDataKeys: payload?.data ? Object.keys(payload.data) : []
      });
    }
    
    console.log('Processing webhook:', {
      webhookId,
      eventType,
      invoiceId,
      chargeId,
      payoutId,
      externalId,
      status,
      payloadPreview: webhook.payload ? JSON.stringify(webhook.payload).substring(0, 500) : 'null'
    });
    // Handle subscription payment webhooks (invoice.paid or ewallet.charge.succeeded for subscriptions)
    const payload = webhook.payload;
    const metadata = payload?.metadata || payload?.data?.metadata;
    
    // Check if this is a subscription payment (invoice or eWallet)
    if (metadata?.subscription_id && (eventType === 'invoice.paid' || eventType === 'ewallet.charge.succeeded' || eventType === 'ewallet.capture')) {
      const subscriptionId = parseInt(metadata.subscription_id);
      const paymentId = invoiceId || chargeId; // Can be invoice ID or charge ID
      
      console.log('🔔 Processing subscription payment webhook:', {
        subscriptionId,
        paymentId,
        eventType,
        catererId: metadata.caterer_id,
        planType: metadata.plan_type
      });
      
      // Find subscription
      const { data: subscription, error: subError } = await supabase
        .from('caterer_subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();
      
      if (subError || !subscription) {
        console.error('❌ Subscription not found:', subscriptionId, subError);
      } else {
        // Update subscription to active
        const { error: updateError } = await supabase
          .from('caterer_subscriptions')
          .update({
            status: 'active',
            xendit_payment_id: paymentId,
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscriptionId);
        
        if (updateError) {
          console.error('❌ Error updating subscription:', updateError);
        } else {
          console.log('✅ Subscription activated:', subscriptionId);
          
          // Create notification for caterer
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              user_id: subscription.caterer_id,
              title: 'Premium Subscription Activated',
              message: `Your ${subscription.plan_type === 'monthly' ? 'monthly' : 'yearly'} premium subscription has been activated! You are now featured in our premium section.`,
              type: 'payment',
              related_id: subscriptionId,
            });
          
          if (notificationError) {
            console.error('Error creating subscription notification:', notificationError);
          } else {
            console.log('✅ Subscription notification created');
          }
        }
      }
      
      // Return early - subscription payment processed
      const { error: markError } = await supabase.from('payment_webhooks').update({
        processed: true,
        processed_at: new Date().toISOString()
      }).eq('id', webhookId);
      
      if (markError) {
        console.error('Error marking webhook as processed:', markError);
      }
      
      return; // Don't process as booking payment
    }
    
    // Handle payout/disbursement webhooks for withdrawal requests
    // Check if this is a payout/disbursement webhook
    const isPayoutWebhook = eventType.includes('payout') || 
                            eventType.includes('disbursement') ||
                            webhook.payload?.type === 'disbursement' ||
                            webhook.payload?.data?.type === 'disbursement' ||
                            webhook.payload?.type === 'payout' ||
                            webhook.payload?.data?.type === 'payout';
    
    if (isPayoutWebhook) {
      console.log('🔔 Processing payout/disbursement webhook:', {
        eventType,
        status,
        payoutId,
        externalId,
        isPayoutWebhook: true
      });
      let withdrawalRequest = null;
      let withdrawalError = null;
      
      // First try to find by payout ID
      if (payoutId) {
        console.log('🔍 Searching for withdrawal by payout ID:', payoutId);
        const { data: withdrawals, error } = await supabase
          .from('withdrawal_requests')
          .select('*')
          .eq('xendit_payout_id', payoutId)
          .limit(1);
        withdrawalError = error;
        withdrawalRequest = withdrawals?.[0];
        if (withdrawalRequest) {
          console.log('✅ Found withdrawal request by payout ID:', {
            withdrawalRequestId: withdrawalRequest.id,
            payoutId
          });
        } else {
          console.log('❌ No withdrawal found by payout ID:', payoutId);
        }
      }
      
      // If not found, try by external_id
      if (!withdrawalRequest && externalId) {
        console.log('🔍 Searching for withdrawal by external_id:', externalId);
        const { data: withdrawals, error } = await supabase
          .from('withdrawal_requests')
          .select('*')
          .eq('xendit_external_id', externalId)
          .limit(1);
        withdrawalError = error;
        withdrawalRequest = withdrawals?.[0];
        if (withdrawalRequest) {
          console.log('✅ Found withdrawal request by external_id:', {
            withdrawalRequestId: withdrawalRequest.id,
            externalId
          });
        } else {
          console.log('❌ No withdrawal found by external_id:', externalId);
        }
      }
      
      // If still not found, try to extract withdrawal request ID from reference_id pattern (withdrawal_10_timestamp)
      if (!withdrawalRequest && externalId) {
        console.log('🔍 Trying to extract withdrawal ID from external_id pattern:', externalId);
        const match = externalId.match(/withdrawal_(\d+)_/);
        if (match) {
          const withdrawalRequestId = parseInt(match[1]);
          console.log('🔍 Searching for withdrawal by extracted ID:', withdrawalRequestId);
          const { data: withdrawals, error } = await supabase
            .from('withdrawal_requests')
            .select('*')
            .eq('id', withdrawalRequestId)
            .limit(1);
          withdrawalError = error;
          withdrawalRequest = withdrawals?.[0];
          if (withdrawalRequest) {
            console.log('✅ Found withdrawal request by ID extraction:', {
              withdrawalRequestId: withdrawalRequest.id,
              extractedId: withdrawalRequestId
            });
          } else {
            console.log('❌ No withdrawal found by extracted ID:', withdrawalRequestId);
          }
        } else {
          console.log('❌ Could not extract withdrawal ID from external_id pattern:', externalId);
        }
      }
      
      // If still not found, try searching by metadata in payload
      if (!withdrawalRequest && webhook.payload?.metadata) {
        const metadata = webhook.payload.metadata;
        const withdrawalRequestIdFromMetadata = metadata?.withdrawal_request_id || metadata?.withdrawalRequestId;
        if (withdrawalRequestIdFromMetadata) {
          console.log('🔍 Searching for withdrawal by metadata withdrawal_request_id:', withdrawalRequestIdFromMetadata);
          const { data: withdrawals, error } = await supabase
            .from('withdrawal_requests')
            .select('*')
            .eq('id', parseInt(withdrawalRequestIdFromMetadata))
            .limit(1);
          withdrawalError = error;
          withdrawalRequest = withdrawals?.[0];
          if (withdrawalRequest) {
            console.log('✅ Found withdrawal request by metadata:', {
              withdrawalRequestId: withdrawalRequest.id
            });
          }
        }
      }
      
      if (withdrawalError) {
        throw withdrawalError;
      }
      
      if (withdrawalRequest) {
        console.log('✅ Found withdrawal request for payout webhook:', {
          withdrawalRequestId: withdrawalRequest.id,
          currentStatus: withdrawalRequest.status,
          payoutId,
          externalId,
          amount: withdrawalRequest.amount,
          paymentMethod: withdrawalRequest.payment_method
        });
        
        let updateData: {
          status?: 'COMPLETED' | 'FAILED' | 'PROCESSING' | 'CANCELLED';
          processed_at?: string;
          updated_at?: string;
          error_message?: string;
        } = {};
        
        // Map Xendit payout statuses to withdrawal request statuses
        // Handle both event types and status fields
        const eventTypeLower = eventType.toLowerCase();
        const statusUpper = (status || '').toUpperCase();
        const payloadStatus = (webhook.payload?.data?.status || webhook.payload?.status || '').toUpperCase();
        const finalStatus = statusUpper || payloadStatus;
        
        console.log('Mapping payout status:', {
          eventType,
          eventTypeLower,
          status,
          statusUpper,
          payloadStatus,
          finalStatus,
          payloadKeys: webhook.payload ? Object.keys(webhook.payload) : []
        });
        
        switch(eventTypeLower) {
          case 'payout.succeeded':
          case 'disbursement.succeeded':
          case 'payout.completed':
          case 'disbursement.completed':
          case 'payout.settled':
          case 'disbursement.settled':
            updateData = {
              status: 'COMPLETED',
              processed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            console.log('✅ Mapped to COMPLETED via event type:', eventTypeLower);
            break;
          case 'payout.failed':
          case 'disbursement.failed':
          case 'payout.rejected':
          case 'disbursement.rejected':
            updateData = {
              status: 'FAILED',
              error_message: webhook.payload?.failure_reason || webhook.payload?.message || 'Payout failed',
              updated_at: new Date().toISOString()
            };
            break;
          case 'payout.pending':
          case 'disbursement.pending':
            updateData = {
              status: 'PROCESSING',
              updated_at: new Date().toISOString()
            };
            break;
          case 'payout.cancelled':
          case 'disbursement.cancelled':
            updateData = {
              status: 'CANCELLED',
              updated_at: new Date().toISOString()
            };
            break;
          default:
            // For unknown payout statuses, try to map from status field
            // Check both status field and payload.data.status (case-insensitive)
            // Also check if event type contains "succeeded" or "completed"
            if (eventTypeLower.includes('succeeded') || eventTypeLower.includes('completed') || eventTypeLower.includes('settled')) {
              updateData = {
                status: 'COMPLETED',
                processed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              console.log('✅ Mapped to COMPLETED via event type contains succeeded/completed/settled:', eventTypeLower);
            } else if (finalStatus === 'SUCCEEDED' || finalStatus === 'COMPLETED' || finalStatus === 'SETTLED') {
              updateData = {
                status: 'COMPLETED',
                processed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              console.log('✅ Mapped to COMPLETED based on status field:', finalStatus);
            } else if (finalStatus === 'FAILED' || finalStatus === 'REJECTED' || eventTypeLower.includes('failed') || eventTypeLower.includes('rejected')) {
              updateData = {
                status: 'FAILED',
                error_message: webhook.payload?.failure_reason || webhook.payload?.message || 'Payout failed',
                updated_at: new Date().toISOString()
              };
              console.log('❌ Mapped to FAILED based on status field or event type:', finalStatus, eventTypeLower);
            } else if (finalStatus === 'PENDING' || finalStatus === 'PROCESSING' || eventTypeLower.includes('pending') || eventTypeLower.includes('processing')) {
              updateData = {
                status: 'PROCESSING',
                updated_at: new Date().toISOString()
              };
              console.log('⏳ Mapped to PROCESSING based on status field or event type:', finalStatus, eventTypeLower);
            } else {
              console.log('⚠️ Could not determine status from status field or event type:', {
                finalStatus,
                eventTypeLower,
                status,
                payloadStatus
              });
            }
        }
        
        // Update withdrawal request if we have changes
        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from('withdrawal_requests')
            .update(updateData)
            .eq('id', withdrawalRequest.id);
          
          if (updateError) {
            throw updateError;
          }
          console.log('Withdrawal request updated successfully:', {
            withdrawalRequestId: withdrawalRequest.id,
            oldStatus: withdrawalRequest.status,
            newStatus: updateData.status,
            updateData
          });
          
          // Create notification for the caterer with withdrawal status
          // TypeScript type guard: we know updateData has status because Object.keys check passed
          const newStatus = updateData.status;
          
          if (newStatus) {
            const paymentMethodName = withdrawalRequest.payment_method === 'gcash' 
              ? 'GCash' 
              : withdrawalRequest.payment_method === 'paymaya' 
              ? 'PayMaya' 
              : 'Bank Transfer';
            
            let notificationTitle = '';
            let notificationMessage = '';
            
            switch(newStatus) {
              case 'COMPLETED':
                notificationTitle = 'Withdrawal Completed';
                notificationMessage = `Your withdrawal of ₱${withdrawalRequest.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to ${paymentMethodName} has been completed successfully.`;
                console.log('Creating COMPLETED notification for withdrawal:', withdrawalRequest.id);
                break;
              case 'FAILED':
                notificationTitle = 'Withdrawal Failed';
                const errorMsg = updateData.error_message || 'Unknown error';
                notificationMessage = `Your withdrawal of ₱${withdrawalRequest.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to ${paymentMethodName} has failed. ${errorMsg}`;
                console.log('Creating FAILED notification for withdrawal:', withdrawalRequest.id);
                break;
              case 'PROCESSING':
                notificationTitle = 'Withdrawal Processing';
                notificationMessage = `Your withdrawal of ₱${withdrawalRequest.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to ${paymentMethodName} is now being processed.`;
                console.log('Creating PROCESSING notification for withdrawal:', withdrawalRequest.id);
                break;
              case 'CANCELLED':
                notificationTitle = 'Withdrawal Cancelled';
                notificationMessage = `Your withdrawal of ₱${withdrawalRequest.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to ${paymentMethodName} has been cancelled.`;
                console.log('Creating CANCELLED notification for withdrawal:', withdrawalRequest.id);
                break;
              default:
                notificationTitle = 'Withdrawal Status Updated';
                notificationMessage = `Your withdrawal of ₱${withdrawalRequest.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to ${paymentMethodName} status is now: ${newStatus}`;
                console.log('Creating status update notification for withdrawal:', withdrawalRequest.id, 'status:', newStatus);
            }
            
            // Create notification - ALWAYS create notification when status changes
            const { error: notificationError } = await supabase
              .from('notifications')
              .insert({
                user_id: withdrawalRequest.caterer_id,
                title: notificationTitle,
                message: notificationMessage,
                type: 'payment',
                related_id: withdrawalRequest.id,
              });
            
            if (notificationError) {
              console.error('Error creating withdrawal notification:', {
                error: notificationError,
                withdrawalRequestId: withdrawalRequest.id,
                status: newStatus,
                catererId: withdrawalRequest.caterer_id
              });
              // Don't throw - notification failure shouldn't break the webhook processing
            } else {
              console.log('✅ Withdrawal notification created successfully:', {
                withdrawalRequestId: withdrawalRequest.id,
                status: newStatus,
                catererId: withdrawalRequest.caterer_id,
                title: notificationTitle
              });
            }
          } else {
            console.warn('No status in updateData, skipping notification:', {
              withdrawalRequestId: withdrawalRequest.id,
              updateData
            });
          }
        }
      } else {
        console.error('❌ No withdrawal request found for payout webhook!', {
          payoutId,
          externalId,
          eventType,
          status,
          webhookPayload: JSON.stringify(webhook.payload, null, 2),
          searchAttempts: [
            payoutId ? `Tried payout_id: ${payoutId}` : null,
            externalId ? `Tried external_id: ${externalId}` : null,
            externalId ? `Tried pattern extraction from: ${externalId}` : null,
            webhook.payload?.metadata ? `Tried metadata: ${JSON.stringify(webhook.payload.metadata)}` : null
          ].filter(Boolean)
        });
        console.log('💡 Tip: Check if the payout_id or external_id in the webhook matches what was saved in withdrawal_requests table');
      }
    } else {
      // Handle booking webhooks (existing logic)
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
