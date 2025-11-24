// Types and interfaces for the admin panel
export type Role = "admin" | "user" | "CUSTOMER" | "CATER" | "ADMIN";

export type AuthUser = {
  username: string;
  role: Role;
};

export type StepKey = "hero" | "step1" | "step2" | "step3" | "step4" | "step5" | "step6" | "waiting";
export type RouteKey = "home" | "admin";

export type BusinessLocation = {
  id: string;
  country: string;
  province: string;
  city: string;
  barangay?: string;
  postalCode: string;
  address: string;
  latitude?: number;
  longitude?: number;
  serviceRadiusKm?: number;
};

export type CuisineCategory = {
  name: string;
  items: string[];
};

export type PartnerForm = {
  businessName: string;
  locations: BusinessLocation[];
  website: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  telephoneNumber?: string;
  contactNumber?: string;
  permitsReady: boolean;
  foodSafety: boolean;
  agreeTerms: boolean;
  notes: string;
  uploadedDocuments?: string[]; // Array of Supabase storage paths
  tempFiles?: Array<{ // Temporary file storage before account creation
    uri: string;
    name: string;
    mimeType?: string;
  }>;
};

// Admin types
export type PageKey = "dashboard" | "recruitment" | "bookings" | "users" | "payments" | "analytics" | "settings" | "refunds";

export type Applicant = {
  id: string;
  businessName: string;
  owner: string;
  location: string;
  status: "Pending" | "Approved" | "Rejected";
  link?: string;
};

export type AdminBooking = {
  id: string;
  code: string;
  customer: string;
  caterer: string;
  date: string;
  guests: number;
  status: "Pending" | "Confirmed" | "Completed" | "Cancelled";
  amount: number;
  notes: { ts: string; text: string }[];
  timeline: { ts: string; text: string }[];
  details: {
    eventType: string;
    venue: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
    dietary: string;
    requests: string;
  };
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "Customer" | "Caterer" | "Admin";
  joined: string;
  status: "Active" | "Suspended";
};

export type Payment = {
  id: string;
  date: string;
  payer: string;
  amount: number;
  method: "Card" | "GCash" | "Bank Transfer";
  status: "Paid" | "Pending" | "Failed" | "Refunded";
};

export type Settings = {
  org: string;
  tz: string;
  currency: "PHP" | "USD";
  tax: number;
  email: boolean;
  signups: boolean;
  deposit: boolean;
  depositPct: number;
  pm: {
    card: boolean;
    gcash: boolean;
    bank: boolean;
  };
  payout: "Weekly" | "Biweekly" | "Monthly";
};

export type Notif = {
  id: string;
  ts: string;
  type: "booking" | "recruitment" | "payment" | "user" | "settings" | "analytics" | string;
  title: string;
  message?: string;
  page?: PageKey;
  read: boolean;
};

