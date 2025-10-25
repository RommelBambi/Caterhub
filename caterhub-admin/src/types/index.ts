// Types and interfaces for the admin panel
export type Role = "admin" | "user";

export type AuthUser = {
  username: string;
  role: Role;
};

export type StepKey = "hero" | "step1" | "step2" | "step3" | "step4" | "step5" | "success";
export type RouteKey = "home" | "partners" | "admin";

export type PartnerForm = {
  businessName: string;
  city: string;
  address: string;
  website: string;
  years: string;
  cuisines: string[];
  pricePerHead: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  minGuests: string;
  maxGuests: string;
  packages: string[];
  hours: string;
  sampleMenu: string;
  permitsReady: boolean;
  foodSafety: boolean;
  agreeTerms: boolean;
  notes: string;
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

export type Booking = {
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
