import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { PartnerForm, AuthUser, Applicant, Notif } from '../types/admin';
import { STORAGE_KEYS, EMPTY_PARTNER_FORM } from '../constants/storage';

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

// Partner form helpers
export async function loadForm(): Promise<PartnerForm> {
  try {
    const raw = await storage.getItem(STORAGE_KEYS.FORM);
    return raw ? { ...EMPTY_PARTNER_FORM, ...(JSON.parse(raw) as PartnerForm) } : EMPTY_PARTNER_FORM;
  } catch {
    return EMPTY_PARTNER_FORM;
  }
}

export async function saveForm(f: PartnerForm): Promise<void> {
  await storage.setItem(STORAGE_KEYS.FORM, JSON.stringify(f));
}

export async function clearForm(): Promise<void> {
  await storage.removeItem(STORAGE_KEYS.FORM);
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

// Application submission function
export async function sendApplicationToRecruitment(form: PartnerForm): Promise<void> {
  const applicant: Applicant = {
    id: 'APP-' + Date.now(),
    businessName: form.businessName,
    owner: form.ownerName,
    location: `${form.city || '—'}, PH`,
    status: 'Pending',
  };

  try {
    const raw = await storage.getItem(STORAGE_KEYS.APPLICANTS);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(applicant);
    await storage.setItem(STORAGE_KEYS.APPLICANTS, JSON.stringify(list));
    console.log('[Recruitment] Applicant saved:', applicant);
  } catch (e) {
    console.log('[Recruitment] Applicants write error:', e);
  }

  try {
    const rawN = await storage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    const notifs = rawN ? JSON.parse(rawN) : [];
    notifs.unshift({
      id: 'N-' + Date.now(),
      ts: new Date().toISOString(),
      type: 'recruitment',
      title: 'New caterer applicant',
      message: `${applicant.businessName} • ${applicant.owner}`,
      page: 'recruitment',
      read: false,
    } as Notif);
    await storage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs.slice(0, 200)));
    console.log('[Recruitment] Notification added');
  } catch (e) {
    console.log('[Recruitment] Notif write error:', e);
  }
}

