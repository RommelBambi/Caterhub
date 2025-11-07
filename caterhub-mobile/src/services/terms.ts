import { supabase } from './supabase';

/**
 * Terms & Conditions Service
 * Handles T&C retrieval and acceptance tracking
 */

export interface TermsConditions {
  id: number;
  version: string;
  title: string;
  content: string;
  effective_date: string;
  is_active: boolean;
  created_at: string;
}

export interface TermsAcceptance {
  id: number;
  user_id: string;
  terms_id: number;
  accepted_at: string;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Get the currently active Terms & Conditions
 */
export async function getActiveTerms(): Promise<TermsConditions | null> {
  const { data, error } = await supabase
    .from('terms_conditions')
    .select('*')
    .eq('is_active', true)
    .order('effective_date', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No active terms found
    throw error;
  }

  return data;
}

/**
 * Record user's acceptance of Terms & Conditions
 */
export async function recordAcceptance(
  termsId: number,
  ipAddress?: string,
  userAgent?: string
): Promise<TermsAcceptance> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('user_terms_acceptance')
    .insert({
      user_id: user.id,
      terms_id: termsId,
      ip_address: ipAddress,
      user_agent: userAgent,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Check if user has accepted the latest Terms & Conditions
 */
export async function hasAcceptedLatest(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Get latest active terms
  const activeTerms = await getActiveTerms();
  if (!activeTerms) return true; // No terms to accept

  // Check if user has accepted these terms
  const { data, error } = await supabase
    .from('user_terms_acceptance')
    .select('id')
    .eq('user_id', user.id)
    .eq('terms_id', activeTerms.id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return !!data;
}

/**
 * Get all terms versions (for admin)
 */
export async function getAllTermsVersions(): Promise<TermsConditions[]> {
  const { data, error } = await supabase
    .from('terms_conditions')
    .select('*')
    .order('effective_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get user's acceptance history
 */
export async function getUserAcceptanceHistory(): Promise<TermsAcceptance[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('user_terms_acceptance')
    .select('*')
    .eq('user_id', user.id)
    .order('accepted_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
