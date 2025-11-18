import { supabase } from './supabase';

export type SubscriptionPlan = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'pending_payment';

export interface CatererSubscription {
  id: number;
  caterer_id: string;
  plan_type: SubscriptionPlan;
  amount: number;
  status: SubscriptionStatus;
  xendit_invoice_id: string | null;
  xendit_payment_id: string | null;
  started_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

const MONTHLY_PRICE = 200;
const YEARLY_PRICE = 2000;

export const SUBSCRIPTION_PRICES = {
  monthly: MONTHLY_PRICE,
  yearly: YEARLY_PRICE,
};

/**
 * Get active subscription for a caterer
 * Also checks for pending_payment subscriptions that might have been activated
 */
export async function getActiveSubscription(catererId: string): Promise<CatererSubscription | null> {
  try {
    // First, try to get active subscription
    const { data: activeSub, error: activeError } = await supabase
      .from('caterer_subscriptions')
      .select('*')
      .eq('caterer_id', catererId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeSub) {
      // Check if subscription is still valid (not expired)
      if (activeSub.expires_at) {
        const expiresAt = new Date(activeSub.expires_at);
        const now = new Date();
        if (expiresAt < now) {
          // Subscription expired, update status
          await supabase
            .from('caterer_subscriptions')
            .update({ status: 'expired', updated_at: new Date().toISOString() })
            .eq('id', activeSub.id);
          return null;
        }
      }
      return activeSub;
    }

    // If no active subscription, check for pending_payment that might have been paid
    // (webhook might have processed but status not updated yet)
    const { data: pendingSub, error: pendingError } = await supabase
      .from('caterer_subscriptions')
      .select('*')
      .eq('caterer_id', catererId)
      .eq('status', 'pending_payment')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // If there's a pending subscription with payment ID, check if it's actually active
    if (pendingSub && pendingSub.xendit_payment_id) {
      // Check if webhook might have activated it but status wasn't updated
      // Re-check for active status
      const { data: recheckSub } = await supabase
        .from('caterer_subscriptions')
        .select('*')
        .eq('caterer_id', catererId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (recheckSub) {
        return recheckSub;
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching active subscription:', error);
    throw error;
  }
}

/**
 * Check if caterer has active premium subscription
 */
export async function isPremiumCaterer(catererId: string): Promise<boolean> {
  const subscription = await getActiveSubscription(catererId);
  return subscription !== null;
}

/**
 * Create a new subscription (pending payment)
 */
export async function createSubscription(
  catererId: string,
  planType: SubscriptionPlan
): Promise<CatererSubscription> {
  try {
    const amount = planType === 'monthly' ? MONTHLY_PRICE : YEARLY_PRICE;
    
    // Calculate expiration date
    const now = new Date();
    const expiresAt = new Date();
    if (planType === 'monthly') {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    const { data, error } = await supabase
      .from('caterer_subscriptions')
      .insert({
        caterer_id: catererId,
        plan_type: planType,
        amount,
        status: 'pending_payment',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
}

/**
 * Update subscription with payment information
 */
export async function updateSubscriptionPayment(
  subscriptionId: number,
  xenditInvoiceId: string | null,
  xenditPaymentId: string | null,
  status: SubscriptionStatus
): Promise<void> {
  try {
    const updateData: any = {
      xendit_invoice_id: xenditInvoiceId,
      xendit_payment_id: xenditPaymentId,
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'active') {
      updateData.started_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('caterer_subscriptions')
      .update(updateData)
      .eq('id', subscriptionId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating subscription payment:', error);
    throw error;
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('caterer_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);

    if (error) throw error;
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
}

/**
 * Get subscription history for a caterer
 */
export async function getSubscriptionHistory(catererId: string): Promise<CatererSubscription[]> {
  try {
    const { data, error } = await supabase
      .from('caterer_subscriptions')
      .select('*')
      .eq('caterer_id', catererId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching subscription history:', error);
    throw error;
  }
}

