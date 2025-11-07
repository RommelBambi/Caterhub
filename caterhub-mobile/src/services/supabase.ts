import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qiudzzioqgdusoyylktr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpdWR6emlvcWdkdXNveXlsa3RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0Njc1OTgsImV4cCI6MjA3NzA0MzU5OH0.RCpltcRiCgHn_IiWSre0nSf2yRO6KAezkF5er0ygQII';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string; // UUID string, not number
          email: string;
          username: string;
          role: 'CUSTOMER' | 'CATER' | 'ADMIN' | 'CUSTOM';
          location?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string; // UUID string, not number
          email: string;
          username: string;
          role: 'CUSTOMER' | 'CATER' | 'ADMIN' | 'CUSTOM';
          location?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string; // UUID string, not number
          email?: string;
          username?: string;
          role?: 'CUSTOMER' | 'CATER' | 'ADMIN';
          location?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      services: {
        Row: {
          id: number;
          name: string;
          description?: string | null;
          image_url?: string | null;
          logo_url?: string | null;
          rating?: number;
          reviews_count?: number;
          price_per_head?: number;
          favorites_count?: number;
          bookings_count?: number;
          latitude?: number | null;
          longitude?: number | null;
          user_id?: string | null; // UUID string - links service to caterer (user)
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          description?: string | null;
          image_url?: string | null;
          logo_url?: string | null;
          rating?: number;
          reviews_count?: number;
          price_per_head?: number;
          favorites_count?: number;
          bookings_count?: number;
          latitude?: number | null;
          longitude?: number | null;
          user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          description?: string | null;
          image_url?: string | null;
          logo_url?: string | null;
          rating?: number;
          reviews_count?: number;
          price_per_head?: number;
          favorites_count?: number;
          bookings_count?: number;
          latitude?: number | null;
          longitude?: number | null;
          user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      bookings: {
        Row: {
          id: number;
          user_id: string | null; // UUID string - nullable in schema
          service_id: number | null; // nullable in schema
          package_id?: string | null; // UUID string - links to packages table
          event_date: string;
          guests: number;
          notes?: string | null;
          status: 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'COMPLETED' | 'CANCELLED';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_id?: string | null; // UUID string - nullable in schema
          service_id?: number | null; // nullable in schema
          package_id?: string | null;
          event_date: string;
          guests: number;
          notes?: string | null;
          status?: 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'COMPLETED' | 'CANCELLED';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string | null; // UUID string
          service_id?: number | null;
          package_id?: string | null;
          event_date?: string;
          guests?: number;
          notes?: string | null;
          status?: 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'COMPLETED' | 'CANCELLED';
          created_at?: string;
          updated_at?: string;
        };
      };
      favorites: {
        Row: {
          id: number;
          user_id: string; // UUID string
          service_id: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string; // UUID string
          service_id: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string; // UUID string
          service_id?: number;
          created_at?: string;
        };
      };
      user_locations: {
        Row: {
          id: string;
          user_id: string; // UUID string
          latitude: number;
          longitude: number;
          address: string;
          location_name: string | null;
          is_primary: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string; // UUID string
          latitude: number;
          longitude: number;
          address: string;
          location_name?: string | null;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string; // UUID string
          latitude?: number;
          longitude?: number;
          address?: string;
          location_name?: string | null;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      partner_applications: {
        Row: {
          id: string;
          user_id: string | null;
          business_name: string;
          locations: any; // JSONB
          website: string | null;
          owner_name: string;
          owner_phone: string;
          owner_email: string;
          telephone_number: string | null;
          contact_number: string | null;
          permits_ready: boolean;
          food_safety: boolean;
          agree_terms: boolean;
          notes: string | null;
          uploaded_documents: string[]; // Array of storage paths
          status: 'Pending' | 'Approved' | 'Rejected';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          business_name: string;
          locations?: any;
          website?: string | null;
          cuisine_categories?: any;
          owner_name: string;
          owner_phone: string;
          owner_email: string;
          telephone_number?: string | null;
          contact_number?: string | null;
          permits_ready?: boolean;
          food_safety?: boolean;
          agree_terms?: boolean;
          notes?: string | null;
          uploaded_documents?: string[];
          status?: 'Pending' | 'Approved' | 'Rejected';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          business_name?: string;
          locations?: any;
          website?: string | null;
          cuisine_categories?: any;
          owner_name?: string;
          owner_phone?: string;
          owner_email?: string;
          telephone_number?: string | null;
          contact_number?: string | null;
          permits_ready?: boolean;
          food_safety?: boolean;
          agree_terms?: boolean;
          notes?: string | null;
          uploaded_documents?: string[];
          status?: 'Pending' | 'Approved' | 'Rejected';
          created_at?: string;
          updated_at?: string;
        };
      };
      packages: {
        Row: {
          id: string;
          caterer_id: string;
          name: string;
          price: string;
          sections: any; // JSONB array of PackageSection
          inclusions: any; // JSONB array of PackageInclusion
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          caterer_id: string;
          name: string;
          price: string;
          sections?: any;
          inclusions?: any;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          caterer_id?: string;
          name?: string;
          price?: string;
          sections?: any;
          inclusions?: any;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
