/**
 * Withdrawal Edge Function Service
 * Calls Supabase Edge Function for secure withdrawal processing with Xendit Payouts
 */

import { supabase } from './supabase';

const SUPABASE_URL = 'https://qiudzzioqgdusoyylktr.supabase.co';
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/create-xendit-payout`;

export interface CreateWithdrawalRequest {
  withdrawalRequestId: number;
  amount: number; // in PHP
  paymentMethod: 'gcash' | 'paymaya';
  accountName: string;
  accountNumber: string;
}

export interface CreateWithdrawalResponse {
  success: boolean;
  payoutId?: string;
  referenceId?: string;
  status?: string;
  amount?: number;
  currency?: string;
  error?: string;
  details?: any;
}

/**
 * Create withdrawal payout via Supabase Edge Function
 * This uses Xendit Payouts API to send money to caterer's GCash/PayMaya
 */
export async function createWithdrawalViaEdgeFunction(
  request: CreateWithdrawalRequest
): Promise<CreateWithdrawalResponse> {
  try {
    // Get current session for authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error('Not authenticated. Please log in again.');
    }

    // Anon key for API calls
    const ANON_KEY =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpdWR6emlvcWdkdXNveXlsa3RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0Njc1OTgsImV4cCI6MjA3NzA0MzU5OH0.RCpltcRiCgHn_IiWSre0nSf2yRO6KAezkF5er0ygQII';

    // Call Edge Function
    console.log('[createWithdrawalViaEdgeFunction] Calling Edge Function:', EDGE_FUNCTION_URL);
    console.log('[createWithdrawalViaEdgeFunction] Request payload:', {
      withdrawalRequestId: request.withdrawalRequestId,
      amount: request.amount,
      paymentMethod: request.paymentMethod,
    });

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify(request),
    });

    console.log('[createWithdrawalViaEdgeFunction] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[createWithdrawalViaEdgeFunction] Error response:', errorData);
      
      // Extract detailed error message from Xendit
      let errorMessage = errorData.error || 'Failed to create withdrawal payout';
      
      // Check if there are specific validation errors from Xendit
      if (errorData.details?.errors && Array.isArray(errorData.details.errors)) {
        const xenditErrors = errorData.details.errors
          .map((err: any) => err.messages?.[0] || err.message)
          .filter(Boolean)
          .join(', ');
        if (xenditErrors) {
          errorMessage = `${errorMessage}: ${xenditErrors}`;
        }
      }
      
      // Check for account name mismatch or similar errors
      if (errorData.details?.message) {
        const detailsMessage = errorData.details.message.toLowerCase();
        if (detailsMessage.includes('account') || detailsMessage.includes('name') || detailsMessage.includes('mismatch')) {
          errorMessage = `Account verification failed: The account name must exactly match the name registered on your ${request.paymentMethod === 'gcash' ? 'GCash' : 'PayMaya'} account. Please verify and try again.`;
        }
      }
      
      throw new Error(errorMessage);
    }

    const data: CreateWithdrawalResponse = await response.json();
    console.log('[createWithdrawalViaEdgeFunction] Success response:', data);
    return data;
  } catch (error: any) {
    console.error('[createWithdrawalViaEdgeFunction] Error:', error);
    throw new Error(error.message || 'Failed to create withdrawal payout');
  }
}

