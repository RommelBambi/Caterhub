/**
 * Payment Edge Function Service
 * Calls Supabase Edge Function for secure payment processing with Xendit
 * This keeps the secret key on the server, not in the mobile app
 */

import { supabase } from './supabase';

// Supabase URL - hardcoded for now (can be moved to env if needed)
const SUPABASE_URL = 'https://qiudzzioqgdusoyylktr.supabase.co';
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/create-xendit-payment`;
const CHECK_PAYMENT_STATUS_URL = `${SUPABASE_URL}/functions/v1/check-xendit-payment-status`;

export interface CreatePaymentRequest {
  amount: number; // in PHP (not centavos for Xendit)
  currency?: 'PHP';
  description: string;
  bookingId: string;
  userId: string;
  paymentMethod: 'gcash' | 'paymaya';
  customerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  returnUrl?: string;
}

export interface CreatePaymentResponse {
  success: boolean;
  type: 'invoice' | 'ewallet';
  invoiceId?: string;
  chargeId?: string;
  externalId?: string;
  referenceId?: string;
  checkoutUrl: string;
  status?: string;
  expiryDate?: string;
  message?: string;
}

/**
 * Create payment via Supabase Edge Function
 * This is more secure than calling Xendit directly from mobile app
 */
export async function createPaymentViaEdgeFunction(
  request: CreatePaymentRequest
): Promise<CreatePaymentResponse> {
  try {
    // Get current session for authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('Not authenticated. Please log in again.');
    }

    // Anon key for API calls (same as in supabase.ts)
    const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpdWR6emlvcWdkdXNveXlsa3RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0Njc1OTgsImV4cCI6MjA3NzA0MzU5OH0.RCpltcRiCgHn_IiWSre0nSf2yRO6KAezkF5er0ygQII';

    // Call Edge Function
    console.log('[createPaymentViaEdgeFunction] Calling Edge Function:', EDGE_FUNCTION_URL);
    console.log('[createPaymentViaEdgeFunction] Request payload:', {
      amount: request.amount,
      currency: request.currency,
      description: request.description,
      bookingId: request.bookingId,
      userId: request.userId,
      paymentMethod: request.paymentMethod,
    });

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': ANON_KEY,
      },
      body: JSON.stringify(request),
    });

    console.log('[createPaymentViaEdgeFunction] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[createPaymentViaEdgeFunction] Error response:', errorData);
      throw new Error(errorData.error || 'Failed to create payment');
    }

    const data: CreatePaymentResponse = await response.json();
    console.log('[createPaymentViaEdgeFunction] Success response:', data);
    return data;
  } catch (error: any) {
    console.error('[createPaymentViaEdgeFunction] Error:', error);
    throw new Error(error.message || 'Failed to create payment');
  }
}

export interface CheckPaymentStatusRequest {
  paymentIntentId?: string;
  paymentSourceId?: string;
}

export interface CheckPaymentStatusResponse {
  success: boolean;
  type?: 'payment_intent' | 'payment_source';
  status?: string;
  paymentIntent?: any;
  source?: any;
  error?: string;
}

/**
 * Check payment status via Supabase Edge Function
 * Uses secret key to check payment status securely
 */
export async function checkPaymentStatusViaEdgeFunction(
  request: CheckPaymentStatusRequest
): Promise<CheckPaymentStatusResponse> {
  try {
    // Get current session for authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('Not authenticated. Please log in again.');
    }

    // Anon key for API calls (same as in supabase.ts)
    const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpdWR6emlvcWdkdXNveXlsa3RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0Njc1OTgsImV4cCI6MjA3NzA0MzU5OH0.RCpltcRiCgHn_IiWSre0nSf2yRO6KAezkF5er0ygQII';

    // Call Edge Function
    console.log('[checkPaymentStatusViaEdgeFunction] Calling Edge Function:', CHECK_PAYMENT_STATUS_URL);
    console.log('[checkPaymentStatusViaEdgeFunction] Request payload:', request);

    const response = await fetch(CHECK_PAYMENT_STATUS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': ANON_KEY,
      },
      body: JSON.stringify(request),
    });

    console.log('[checkPaymentStatusViaEdgeFunction] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[checkPaymentStatusViaEdgeFunction] Error response:', errorData);
      throw new Error(errorData.error || 'Failed to check payment status');
    }

    const data: CheckPaymentStatusResponse = await response.json();
    console.log('[checkPaymentStatusViaEdgeFunction] Success response:', data);
    return data;
  } catch (error: any) {
    console.error('[checkPaymentStatusViaEdgeFunction] Error:', error);
    throw new Error(error.message || 'Failed to check payment status');
  }
}

