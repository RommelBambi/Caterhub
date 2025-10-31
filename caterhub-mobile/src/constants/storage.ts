// Storage keys and utilities
export const STORAGE_KEYS = {
  THEME: "caterhub_theme",
  FORM: "caterhub_partner_register_v1",
  AUTH: "caterhub_auth_user_v2",
  APPLICANTS: "caterhub_applicants_v1",
  BOOKINGS: "caterhub_bookings_v2",
  USERS: "caterhub_users_v1",
  PAYMENTS: "caterhub_payments_v1",
  SETTINGS: "caterhub_settings_v1",
  NOTIFICATIONS: "caterhub_notifications_v1",
  NOTIF: "caterhub_notifications_v1",
} as const;

export const EMPTY_PARTNER_FORM = {
  businessName: "",
  locations: [
    {
      id: Date.now().toString(),
      country: "",
      province: "",
      city: "",
      postalCode: "",
      address: "",
    },
  ] as Array<{
    id: string;
    country: string;
    province: string;
    city: string;
    postalCode: string;
    address: string;
    latitude?: number;
    longitude?: number;
  }>,
  website: "",
  cuisineCategories: {} as { [category: string]: string[] },
  ownerName: "",
  ownerPhone: "",
  ownerEmail: "",
  telephoneNumber: "",
  contactNumber: "",
  bankName: "",
  bankAccountName: "",
  bankAccountNumber: "",
  minGuests: "",
  maxGuests: "",
  packages: [] as string[],
  hours: "",
  sampleMenu: "",
  permitsReady: false,
  foodSafety: false,
  agreeTerms: false,
  notes: "",
};

