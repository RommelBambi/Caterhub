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

    // Determine bank code based on payment method
    let bankCode: string;
    if (paymentMethod === 'gcash') {
      bankCode = 'GCASH';
    } else if (paymentMethod === 'paymaya') {
      bankCode = 'PAYMAYA';
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
    // Based on actual Xendit API error response, it requires:
    // - reference_id (not external_id)
    // - channel_code (not bank_code)
    // - account_name (not account_holder_name)
    const referenceId = externalId;
    const channelCode = bankCode;
    
    // Note: If you have categories configured in Xendit Dashboard, you may need to specify the category
    // Match the exact category name from your Xendit Dashboard (case-sensitive)
    const categoryName = paymentMethod === 'gcash' ? 'Gcash' : 'PayMaya';
    
    console.log('[create-xendit-payout] Creating disbursement with:', {
      reference_id: referenceId,
      channel_code: channelCode,
      account_name: accountName,
      account_number: accountNumber,
      amount: amount,
      currency: 'PHP',
      category: categoryName,
    });

    // Try both possible request formats - Xendit API might require different field names
    // Format 1: Using reference_id, channel_code, account_name (current attempt)
    
    const requestBody1 = {
      reference_id: referenceId,
      channel_code: channelCode,
      account_name: accountName,
      account_number: accountNumber,
      description: `Withdrawal to ${paymentMethod === 'gcash' ? 'GCash' : 'PayMaya'}`,
      amount: amount,
      currency: 'PHP',
      category: categoryName, // Add category field - may be required if categories are configured
      ...(user.email && { email_to: [user.email] }),
      metadata: {
        withdrawal_request_id: withdrawalRequestId.toString(),
        caterer_id: user.id,
        payment_method: paymentMethod,
      },
    };

    // Format 2: Alternative format with external_id and bank_code (legacy format)
    const requestBody2 = {
      external_id: referenceId,
      bank_code: channelCode,
      account_holder_name: accountName,
      account_number: accountNumber,
      description: `Withdrawal to ${paymentMethod === 'gcash' ? 'GCash' : 'PayMaya'}`,
      amount: amount,
      currency: 'PHP',
      category: categoryName, // Add category field here too
      ...(user.email && { email_to: [user.email] }),
      metadata: {
        withdrawal_request_id: withdrawalRequestId.toString(),
        caterer_id: user.id,
        payment_method: paymentMethod,
      },
    };

    console.log('[create-xendit-payout] Attempting Format 1 (reference_id/channel_code/account_name):', JSON.stringify(requestBody1, null, 2));

    // Try Format 1 first with /disbursements endpoint
    let disbursementResponse = await fetch(`${XENDIT_BASE_URL}/disbursements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeaderValue,
      },
      body: JSON.stringify(requestBody1),
    });

    // If Format 1 fails with validation error, try Format 2
    if (!disbursementResponse.ok) {
      const errorText = await disbursementResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { message: errorText };
      }

      console.log('[create-xendit-payout] Format 1 error response:', JSON.stringify(errorData, null, 2));

      // If it's a validation error, try the alternative format
      if (errorData.error_code === 'API_VALIDATION_ERROR') {
        console.log('[create-xendit-payout] Format 1 failed, trying Format 2 (external_id/bank_code/account_holder_name):', JSON.stringify(requestBody2, null, 2));
        
        disbursementResponse = await fetch(`${XENDIT_BASE_URL}/disbursements`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeaderValue,
          },
          body: JSON.stringify(requestBody2),
        });

        // If Format 2 also fails, try v2 endpoint with Format 1
        if (!disbursementResponse.ok) {
          const errorText2 = await disbursementResponse.text();
          let errorData2;
          try {
            errorData2 = JSON.parse(errorText2);
          } catch (e) {
            errorData2 = { message: errorText2 };
          }

          console.log('[create-xendit-payout] Format 2 also failed, trying v2 endpoint with Format 1');
          disbursementResponse = await fetch(`${XENDIT_BASE_URL}/v2/disbursements`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: authHeaderValue,
            },
            body: JSON.stringify(requestBody1),
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
          field: err.field,
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
    
    await supabase
      .from('withdrawal_requests')
      .update({
        status: disbursementData.status === 'PENDING' ? 'PROCESSING' : (disbursementData.status || 'PROCESSING'),
        xendit_payout_id: payoutId,
        xendit_external_id: externalIdValue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', withdrawalRequestId);

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
