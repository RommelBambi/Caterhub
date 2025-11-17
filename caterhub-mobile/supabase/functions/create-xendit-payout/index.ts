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

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
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

    const xenditSecretKey = Deno.env.get('XENDIT_SECRET_KEY');
    if (!xenditSecretKey) {
      return new Response(
        JSON.stringify({
          error: 'Server configuration error',
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

    const body = await req.json();
    const { withdrawalRequestId, amount, paymentMethod, accountName, accountNumber } = body;

    if (!withdrawalRequestId || !amount || !paymentMethod || !accountName || !accountNumber) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
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

    // Verify withdrawal request belongs to user
    const { data: withdrawalRequest, error: withdrawalError } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', withdrawalRequestId)
      .eq('caterer_id', user.id)
      .single();

    if (withdrawalError || !withdrawalRequest) {
      return new Response(
        JSON.stringify({
          error: 'Withdrawal request not found or unauthorized',
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

    if (withdrawalRequest.status !== 'PENDING') {
      return new Response(
        JSON.stringify({
          error: 'Withdrawal request is not pending',
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

    // Create Xendit Disbursement
    const authHeaderValue = `Basic ${btoa(xenditSecretKey + ':')}`;
    const externalId = `withdrawal_${withdrawalRequestId}_${Date.now()}`;

    // Determine channel code based on payment method
    // Use same format as working payment function (PH_GCASH)
    let channelCode: string;
    if (paymentMethod === 'gcash') {
      channelCode = 'PH_GCASH';  // Same as working payment function
    } else if (paymentMethod === 'paymaya') {
      channelCode = 'PH_PAYMAYA';  // Same as working payment function
    } else {
      return new Response(
        JSON.stringify({
          error: 'Unsupported payment method',
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

    // Create disbursement via Xendit Disbursements API
    // Xendit API documentation: https://docs.xendit.co/api-reference/#disbursements
    const referenceId = externalId;
    
    // Build request body according to Xendit Payouts API v2
    // Reference: https://docs.xendit.co/api-payouts-beta/api-payouts-beta
    // v2/payouts requires: channel_properties.account_holder_name (not account_name) and idempotency-key header
    const requestBody = {
      reference_id: referenceId,
      channel_code: channelCode,
      channel_properties: {
        account_holder_name: accountName,  // v2 API uses account_holder_name, not account_name
        account_number: accountNumber,
      },
      description: `Withdrawal to ${paymentMethod === 'gcash' ? 'GCash' : 'PayMaya'}`,
      amount: amount,
      currency: 'PHP',
      // Add callback URL for webhook notifications
      callback_url: `${supabaseUrl}/functions/v1/xendit-webhook`,
      // Note: email_to and metadata are optional, but included for tracking
      ...(user.email && { email_to: [user.email] }),
      metadata: {
        withdrawal_request_id: withdrawalRequestId.toString(),
        caterer_id: user.id,
        payment_method: paymentMethod,
      },
    };

    console.log('[create-xendit-payout] Creating disbursement with:', JSON.stringify(requestBody, null, 2));

    // Try the newer /v2/payouts endpoint first (Xendit Payouts API)
    // This endpoint requires idempotency-key header
    const idempotencyKey = `withdrawal_${withdrawalRequestId}_${Date.now()}`;
    let disbursementResponse = await fetch(`${XENDIT_BASE_URL}/v2/payouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeaderValue,
        'idempotency-key': idempotencyKey,
      },
      body: JSON.stringify(requestBody),
    });

    // If that fails, try alternative formats
    if (!disbursementResponse.ok) {
      const errorText = await disbursementResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { message: errorText };
      }

      console.log('[create-xendit-payout] v2/payouts endpoint error:', JSON.stringify(errorData, null, 2));
      
      // Log detailed validation errors if available
      if (errorData.errors && Array.isArray(errorData.errors)) {
        console.log('[create-xendit-payout] v2/payouts validation errors:', JSON.stringify(errorData.errors, null, 2));
      }

      // Try legacy /disbursements endpoint as fallback (different format - account_name/account_number at root)
      if (errorData.error_code === 'API_VALIDATION_ERROR' || errorData.error_code === 'NOT_FOUND') {
        console.log('[create-xendit-payout] Trying legacy /disbursements endpoint');
        
        // Legacy format: account_name and account_number at root level, not in channel_properties
        const legacyRequestBody = {
          reference_id: referenceId,
          channel_code: channelCode,
          account_name: accountName,
          account_number: accountNumber,
          description: `Withdrawal to ${paymentMethod === 'gcash' ? 'GCash' : 'PayMaya'}`,
          amount: amount,
          currency: 'PHP',
          callback_url: `${supabaseUrl}/functions/v1/xendit-webhook`,
          ...(user.email && { email_to: [user.email] }),
          metadata: {
            withdrawal_request_id: withdrawalRequestId.toString(),
            caterer_id: user.id,
            payment_method: paymentMethod,
          },
        };
        
        disbursementResponse = await fetch(`${XENDIT_BASE_URL}/disbursements`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeaderValue,
          },
          body: JSON.stringify(legacyRequestBody),
        });

        // If still failing, try without PH_ prefix
        if (!disbursementResponse.ok) {
          const errorText2 = await disbursementResponse.text();
          let errorData2;
          try {
            errorData2 = JSON.parse(errorText2);
          } catch (e) {
            errorData2 = { message: errorText2 };
          }

          console.log('[create-xendit-payout] Legacy endpoint failed, trying without PH_ prefix');
          const legacyChannelCode = channelCode.replace('PH_', '');
          const legacyRequestBody2 = {
            ...legacyRequestBody,
            channel_code: legacyChannelCode,
          };
          
          disbursementResponse = await fetch(`${XENDIT_BASE_URL}/disbursements`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: authHeaderValue,
            },
            body: JSON.stringify(legacyRequestBody2),
          });
        }
      }
    }

    if (!disbursementResponse.ok) {
      const errorText = await disbursementResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { message: errorText, raw: errorText };
      }
      
      // Log the FULL error response including all details
      const fullErrorLog = {
        status: disbursementResponse.status,
        statusText: disbursementResponse.statusText,
        errorText: errorText,
        errorData: errorData,
        errorDataStringified: JSON.stringify(errorData),
        errorDataErrors: errorData.errors || 'No errors array',
        // Show the actual request body that was sent (for debugging)
        actualRequestBody: requestBody,
        requestBody: {
          reference_id: referenceId,
          channel_code: channelCode,
          account_name: accountName,
          account_number: accountNumber,
          amount: amount,
          currency: 'PHP',
        },
      };
      
      console.error('[create-xendit-payout] Disbursement creation failed - FULL ERROR:', JSON.stringify(fullErrorLog, null, 2));
      
      // Extract specific field errors if available
      if (errorData.errors && Array.isArray(errorData.errors)) {
        const fieldErrors = errorData.errors.map((err: any) => ({
          field: err.field || err.path,
          message: err.message,
          messages: err.messages,
          location: err.location,
        }));
        console.error('[create-xendit-payout] Specific field errors:', JSON.stringify(fieldErrors, null, 2));
      }

      // Update withdrawal request status to FAILED
      await supabase
        .from('withdrawal_requests')
        .update({
          status: 'FAILED',
          xendit_payout_id: null,
          xendit_external_id: referenceId,
          error_message: errorData.message || errorData.raw || JSON.stringify(errorData),
          updated_at: new Date().toISOString(),
        })
        .eq('id', withdrawalRequestId);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to create disbursement',
          details: errorData,
        }),
        {
          status: disbursementResponse.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const disbursementData = await disbursementResponse.json();
    console.log('[create-xendit-payout] Disbursement created:', disbursementData);

    // Update withdrawal request with Xendit disbursement info
    const payoutId = disbursementData.id;
    const externalIdValue = disbursementData.reference_id || disbursementData.external_id || referenceId;
    
    console.log('[create-xendit-payout] Updating withdrawal request:', {
      payoutId,
      externalIdValue,
      status: disbursementData.status,
    });
    
    // Map Xendit statuses to our internal statuses
    // Xendit can return: PENDING, ACCEPTED, PROCESSING, COMPLETED, FAILED, REJECTED, CANCELLED
    const xenditStatus = (disbursementData.status || '').toUpperCase();
    let newStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    
    switch(xenditStatus) {
      case 'PENDING':
      case 'ACCEPTED':
        newStatus = 'PROCESSING'; // Both PENDING and ACCEPTED mean it's being processed
        break;
      case 'PROCESSING':
        newStatus = 'PROCESSING';
        break;
      case 'COMPLETED':
      case 'SUCCEEDED':
        newStatus = 'COMPLETED';
        break;
      case 'FAILED':
      case 'REJECTED':
        newStatus = 'FAILED';
        break;
      case 'CANCELLED':
        newStatus = 'CANCELLED';
        break;
      default:
        // Default to PROCESSING for unknown statuses
        newStatus = 'PROCESSING';
        console.log('[create-xendit-payout] Unknown Xendit status, defaulting to PROCESSING:', xenditStatus);
    }
    
    // Update withdrawal request status
    const { error: updateError } = await supabase
      .from('withdrawal_requests')
      .update({
        status: newStatus,
        xendit_payout_id: payoutId,
        xendit_external_id: externalIdValue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', withdrawalRequestId);
    
    if (updateError) {
      console.error('[create-xendit-payout] Error updating withdrawal request:', updateError);
      // Continue anyway - we'll still create the notification
    } else {
      console.log('[create-xendit-payout] Withdrawal request updated successfully:', {
        withdrawalRequestId,
        newStatus,
        payoutId
      });
    }

    // Create notification for withdrawal submission
    const paymentMethodName = paymentMethod === 'gcash' ? 'GCash' : paymentMethod === 'paymaya' ? 'PayMaya' : 'Bank Transfer';
    const notificationTitle = 'Withdrawal Submitted';
    
    // Use user-friendly status text that matches the actual database status
    let statusText = '';
    switch(newStatus) {
      case 'PROCESSING':
        statusText = 'processing';
        break;
      case 'COMPLETED':
        statusText = 'completed';
        break;
      case 'FAILED':
        statusText = 'failed';
        break;
      case 'CANCELLED':
        statusText = 'cancelled';
        break;
      default:
        statusText = 'pending';
    }
    
    const notificationMessage = `Your withdrawal request of ₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to ${paymentMethodName} has been submitted and is now ${statusText}.`;
    
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        title: notificationTitle,
        message: notificationMessage,
        type: 'payment',
        related_id: withdrawalRequestId,
      });
    
    if (notificationError) {
      console.error('[create-xendit-payout] Error creating withdrawal notification:', notificationError);
      // Don't fail the request if notification creation fails
    } else {
      console.log('[create-xendit-payout] Withdrawal notification created for user:', user.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        payoutId: payoutId,
        referenceId: externalIdValue,
        status: disbursementData.status || 'PROCESSING',
        amount: disbursementData.amount,
        currency: disbursementData.currency || 'PHP',
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Internal server error',
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
