import { PartnerForm, AuthUser, Settings, Applicant, Booking, AdminUser, Payment, Notif } from "../types";
import { STORAGE_KEYS } from "../constants/storage";

// Web-only storage utilities
export const storage = {
  async getItem(key: string) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Handle storage quota exceeded
    }
  },

  async removeItem(key: string) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Handle storage errors silently
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

export async function saveJSON<T>(key: string, value: T) {
  await storage.setItem(key, JSON.stringify(value));
}

// Specific loaders/savers for forms and auth
export async function loadForm(): Promise<PartnerForm> {
  const EMPTY_FORM: PartnerForm = {
    businessName: "",
    city: "",
    address: "",
    website: "",
    years: "",
    cuisines: [],
    pricePerHead: "",
    ownerName: "",
    ownerPhone: "",
    ownerEmail: "",
    bankName: "",
    bankAccountName: "",
    bankAccountNumber: "",
    minGuests: "",
    maxGuests: "",
    packages: [],
    hours: "",
    sampleMenu: "",
    permitsReady: false,
    foodSafety: false,
    agreeTerms: false,
    notes: "",
  };
  
  try {
    const raw = await storage.getItem(STORAGE_KEYS.FORM);
    return raw ? { ...EMPTY_FORM, ...(JSON.parse(raw) as PartnerForm) } : EMPTY_FORM;
  } catch {
    return EMPTY_FORM;
  }
}

export async function saveForm(f: PartnerForm) {
  await storage.setItem(STORAGE_KEYS.FORM, JSON.stringify(f));
}

export async function clearForm() {
  await storage.removeItem(STORAGE_KEYS.FORM);
}

export async function loadUser(): Promise<AuthUser | null> {
  try {
    const raw = await storage.getItem(STORAGE_KEYS.AUTH);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (p?.username && (p.role === "admin" || p.role === "user")) {
      return p as AuthUser;
    }
    if (p?.username) {
      return { username: String(p.username), role: "user" };
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveUser(u: AuthUser) {
  await storage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(u));
}

export async function clearUser() {
  await storage.removeItem(STORAGE_KEYS.AUTH);
}

// Application submission function
export async function sendApplicationToRecruitment(form: PartnerForm) {
  const applicant: Applicant = {
    id: "APP-" + Date.now(),
    businessName: form.businessName,
    owner: form.ownerName,
    location: `${form.city || "—"}, PH`,
    status: "Pending",
  };

  try {
    const raw = await storage.getItem(STORAGE_KEYS.APPLICANTS);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(applicant);
    await storage.setItem(STORAGE_KEYS.APPLICANTS, JSON.stringify(list));
    console.log("[Recruitment] Applicant saved:", applicant);
  } catch (e) {
    console.log("[Recruitment] Applicants write error:", e);
  }

  try {
    const rawN = await storage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    const notifs = rawN ? JSON.parse(rawN) : [];
    notifs.unshift({
      id: "N-" + Date.now(),
      ts: new Date().toISOString(),
      type: "recruitment",
      title: "New caterer applicant",
      message: `${applicant.businessName} • ${applicant.owner}`,
      page: "recruitment",
      read: false,
    });
    await storage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs.slice(0, 200)));
    console.log("[Recruitment] Notification added");
  } catch (e) {
    console.log("[Recruitment] Notif write error:", e);
  }
}

// Legacy function names for compatibility
export const clearJSON = clearForm;