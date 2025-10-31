import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { PartnerForm, AuthUser, Applicant, Notif } from '../types/admin';
import { STORAGE_KEYS, EMPTY_PARTNER_FORM } from '../constants/storage';
import { supabase } from '../services/supabase';

const isWeb = Platform.OS === 'web';

/**
 * Platform-aware storage utilities
 * Automatically uses localStorage on web, SecureStore on mobile
 */
export const storage = {
  /**
   * Store a value with the given key
   */
  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },

  /**
   * Get a value by key
   */
  async getItem(key: string): Promise<string | null> {
    if (isWeb) {
      return localStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  },

  /**
   * Remove a value by key
   */
  async removeItem(key: string): Promise<void> {
    if (isWeb) {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

// Generic JSON load/save functions
export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  const raw = await storage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function saveJSON<T>(key: string, value: T): Promise<void> {
  await storage.setItem(key, JSON.stringify(value));
}

// Partner form helpers - Now using Supabase for persistence
export async function loadForm(): Promise<PartnerForm> {
  try {
    // Try to load from Supabase first (if user is logged in and has a pending application)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: application, error } = await supabase
        .from('partner_applications')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'Pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && application) {
        // Convert Supabase data back to PartnerForm format
        return {
          businessName: application.business_name || '',
          locations: application.locations || [],
          website: application.website || '',
          ownerName: application.owner_name || '',
          ownerPhone: application.owner_phone || '',
          ownerEmail: application.owner_email || '',
          telephoneNumber: application.telephone_number || '',
          contactNumber: application.contact_number || '',
          permitsReady: application.permits_ready || false,
          foodSafety: application.food_safety || false,
          agreeTerms: application.agree_terms || false,
          notes: application.notes || '',
          uploadedDocuments: application.uploaded_documents || [],
        } as PartnerForm;
      }
    }

    // Fallback to local storage if no Supabase data
    const raw = await storage.getItem(STORAGE_KEYS.FORM);
    return raw ? { ...EMPTY_PARTNER_FORM, ...(JSON.parse(raw) as PartnerForm) } : EMPTY_PARTNER_FORM;
  } catch {
    return EMPTY_PARTNER_FORM;
  }
}

export async function saveForm(f: PartnerForm): Promise<void> {
  try {
    // Save to Supabase if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Only save to Supabase if we have at least an email (meaningful data)
      // This prevents creating empty rows when the form is first initialized
      if (!f.ownerEmail) {
        // Not enough data yet, save to local storage only
        await storage.setItem(STORAGE_KEYS.FORM, JSON.stringify(f));
        return;
      }

      // Check if there's an existing pending application (get most recent one)
      const { data: existingApplications, error: queryError } = await supabase
        .from('partner_applications')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'Pending')
        .order('created_at', { ascending: false })
        .limit(1);

      const existing = existingApplications && existingApplications.length > 0 ? existingApplications[0] : null;

      const applicationData = {
        user_id: user.id,
        business_name: f.businessName,
        locations: f.locations || [],
        website: f.website || null,
        owner_name: f.ownerName,
        owner_phone: f.ownerPhone,
        owner_email: f.ownerEmail,
        telephone_number: f.telephoneNumber || null,
        contact_number: f.contactNumber || null,
        permits_ready: f.permitsReady || false,
        food_safety: f.foodSafety || false,
        agree_terms: f.agreeTerms || false,
        notes: f.notes || null,
        uploaded_documents: f.uploadedDocuments || [],
        status: 'Pending' as const,
      };

      if (existing) {
        // Update existing application
        const { error } = await supabase
          .from('partner_applications')
          .update(applicationData)
          .eq('id', existing.id);

        if (error) {
          console.error('Error updating application:', error);
          // Fallback to local storage
          await storage.setItem(STORAGE_KEYS.FORM, JSON.stringify(f));
        }
      } else {
        // Create new application
        const { error } = await supabase
          .from('partner_applications')
          .insert(applicationData);

        if (error) {
          console.error('Error saving application:', error);
          // Fallback to local storage
          await storage.setItem(STORAGE_KEYS.FORM, JSON.stringify(f));
        }
      }
    } else {
      // Not logged in yet, save to local storage
      await storage.setItem(STORAGE_KEYS.FORM, JSON.stringify(f));
    }
  } catch (error) {
    console.error('Error saving form:', error);
    // Fallback to local storage
    await storage.setItem(STORAGE_KEYS.FORM, JSON.stringify(f));
  }
}

export async function clearForm(): Promise<void> {
  try {
    // Clear from Supabase if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('partner_applications')
        .update({ status: 'Rejected' }) // Soft delete by changing status
        .eq('user_id', user.id)
        .eq('status', 'Pending');
    }
    // Also clear local storage
    await storage.removeItem(STORAGE_KEYS.FORM);
  } catch (error) {
    console.error('Error clearing form:', error);
    await storage.removeItem(STORAGE_KEYS.FORM);
  }
}

// Auth user helpers
export async function loadUser(): Promise<AuthUser | null> {
  try {
    const raw = await storage.getItem(STORAGE_KEYS.AUTH);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (p?.username && (p.role === 'admin' || p.role === 'user')) {
      return p as AuthUser;
    }
    if (p?.username) {
      return { username: String(p.username), role: 'user' };
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveUser(u: AuthUser): Promise<void> {
  await storage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(u));
}

export async function clearUser(): Promise<void> {
  await storage.removeItem(STORAGE_KEYS.AUTH);
}

// Application submission function - Now saves to Supabase
export async function sendApplicationToRecruitment(form: PartnerForm, userId?: string): Promise<void> {
  try {
    // Get user ID if not provided
    let finalUserId = userId;
    if (!finalUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      finalUserId = user?.id;
    }

    if (!finalUserId) {
      throw new Error('User ID is required to submit application');
    }

    // Check if there's an existing pending application (get most recent one)
    const { data: existingApplications, error: queryError } = await supabase
      .from('partner_applications')
      .select('id')
      .eq('user_id', finalUserId)
      .eq('status', 'Pending')
      .order('created_at', { ascending: false })
      .limit(1);

    const existing = existingApplications && existingApplications.length > 0 ? existingApplications[0] : null;

    const applicationData = {
      user_id: finalUserId,
      business_name: form.businessName,
      locations: form.locations || [],
      website: form.website || null,
      owner_name: form.ownerName,
      owner_phone: form.ownerPhone,
      owner_email: form.ownerEmail,
      telephone_number: form.telephoneNumber || null,
      contact_number: form.contactNumber || null,
      permits_ready: form.permitsReady || false,
      food_safety: form.foodSafety || false,
      agree_terms: form.agreeTerms || false,
      notes: form.notes || null,
      uploaded_documents: form.uploadedDocuments || [],
      status: 'Pending' as const,
    };

    if (existing) {
      // Update existing application
      const { error } = await supabase
        .from('partner_applications')
        .update(applicationData)
        .eq('id', existing.id);

      if (error) throw error;
      console.log('[Recruitment] Application updated in Supabase:', existing.id);
    } else {
      // Insert new application
      const { data, error } = await supabase
        .from('partner_applications')
        .insert(applicationData)
        .select()
        .single();

      if (error) throw error;
      console.log('[Recruitment] Application saved to Supabase:', data?.id);
    }

    // Also update local storage for backward compatibility
    const applicant: Applicant = {
      id: existing?.id || 'APP-' + Date.now(),
      businessName: form.businessName,
      owner: form.ownerName,
      location: form.locations.length > 0 
        ? `${form.locations[0].city || '—'}, ${form.locations[0].province || 'PH'}`
        : '—',
      status: 'Pending',
    };

    try {
      const raw = await storage.getItem(STORAGE_KEYS.APPLICANTS);
      const list = raw ? JSON.parse(raw) : [];
      list.unshift(applicant);
      await storage.setItem(STORAGE_KEYS.APPLICANTS, JSON.stringify(list));
    } catch (e) {
      console.log('[Recruitment] Local storage backup error:', e);
    }

  } catch (error) {
    console.error('[Recruitment] Error saving application:', error);
    throw error;
  }
}

