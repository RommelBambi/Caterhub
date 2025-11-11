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
          profile_image_url?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string; // UUID string, not number
          email: string;
          username: string;
          role: 'CUSTOMER' | 'CATER' | 'ADMIN' | 'CUSTOM';
          location?: string | null;
          profile_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string; // UUID string, not number
          email?: string;
          username?: string;
          role?: 'CUSTOMER' | 'CATER' | 'ADMIN';
          location?: string | null;
          profile_image_url?: string | null;
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
          package_id: string | null; // UUID string - links to packages table
          event_date: string; // date type
          guests: number;
          notes: string | null;
          status: 'PENDING' | 'CONFIRMED' | 'ON_THE_WAY' | 'DECLINED' | 'COMPLETED' | 'CANCELLED';
          created_at: string;
          updated_at: string;
          // Payment fields
          payment_method: string | null; // varchar(50)
          payment_status: string | null; // varchar(20), default 'PENDING'
          payment_intent_id: string | null; // varchar(255)
          payment_source_id: string | null; // varchar(255)
          transaction_id: string | null; // varchar(255)
          paid_at: string | null; // timestamp without time zone
          address: string | null; // text
          // Deposit/Remaining payment fields
          deposit_amount: number | null; // numeric(10, 2)
          remaining_amount: number | null; // numeric(10, 2)
          deposit_paid: boolean | null; // default false
          remaining_paid: boolean | null; // default false
          remaining_paid_method: string | null; // varchar(20)
          remaining_paid_at: string | null; // timestamp without time zone
          // Delivery fee
          delivery_fee: number | null; // numeric(10, 2), default 0
          delivery_fee_set_by_caterer: boolean | null; // default false
          // Platform fee system
          platform_fee_percentage: number | null; // numeric(5, 2), default 15.00
          platform_fee_amount: number | null; // numeric(10, 2)
          caterer_payout_amount: number | null; // numeric(10, 2)
        };
        Insert: {
          id?: number;
          user_id?: string | null;
          service_id?: number | null;
          package_id?: string | null;
          event_date: string;
          guests: number;
          notes?: string | null;
          status?: 'PENDING' | 'CONFIRMED' | 'ON_THE_WAY' | 'DECLINED' | 'COMPLETED' | 'CANCELLED';
          created_at?: string;
          updated_at?: string;
          payment_method?: string | null;
          payment_status?: string | null;
          payment_intent_id?: string | null;
          payment_source_id?: string | null;
          transaction_id?: string | null;
          paid_at?: string | null;
          address?: string | null;
          deposit_amount?: number | null;
          remaining_amount?: number | null;
          deposit_paid?: boolean | null;
          remaining_paid?: boolean | null;
          remaining_paid_method?: string | null;
          remaining_paid_at?: string | null;
          delivery_fee?: number | null;
          delivery_fee_set_by_caterer?: boolean | null;
          platform_fee_percentage?: number | null;
          platform_fee_amount?: number | null;
          caterer_payout_amount?: number | null;
        };
        Update: {
          id?: number;
          user_id?: string | null;
          service_id?: number | null;
          package_id?: string | null;
          event_date?: string;
          guests?: number;
          notes?: string | null;
          status?: 'PENDING' | 'CONFIRMED' | 'ON_THE_WAY' | 'DECLINED' | 'COMPLETED' | 'CANCELLED';
          created_at?: string;
          updated_at?: string;
          payment_method?: string | null;
          payment_status?: string | null;
          payment_intent_id?: string | null;
          payment_source_id?: string | null;
          transaction_id?: string | null;
          paid_at?: string | null;
          address?: string | null;
          deposit_amount?: number | null;
          remaining_amount?: number | null;
          deposit_paid?: boolean | null;
          remaining_paid?: boolean | null;
          remaining_paid_method?: string | null;
          remaining_paid_at?: string | null;
          delivery_fee?: number | null;
          delivery_fee_set_by_caterer?: boolean | null;
          platform_fee_percentage?: number | null;
          platform_fee_amount?: number | null;
          caterer_payout_amount?: number | null;
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
          id: string; // uuid, primary key
          user_id: string | null; // uuid, foreign key to users(id)
          business_name: string; // text, not null
          locations: any | null; // jsonb, default '[]'::jsonb
          website: string | null; // text
          owner_name: string; // text, not null
          owner_phone: string; // text, not null
          owner_email: string; // text, not null
          telephone_number: string | null; // text
          contact_number: string | null; // text
          permits_ready: boolean | null; // boolean, default false
          food_safety: boolean | null; // boolean, default false
          agree_terms: boolean | null; // boolean, default false
          notes: string | null; // text
          uploaded_documents: string[] | null; // text[], default '{}'::text[]
          status: 'Pending' | 'Approved' | 'Rejected' | null; // text, default 'Pending'::text
          created_at: string | null; // timestamp with time zone, default now()
          updated_at: string | null; // timestamp with time zone, default now()
        };
        Insert: {
          id?: string; // uuid, default gen_random_uuid()
          user_id?: string | null;
          business_name: string; // required
          locations?: any | null; // jsonb, default '[]'::jsonb
          website?: string | null;
          owner_name: string; // required
          owner_phone: string; // required
          owner_email: string; // required
          telephone_number?: string | null;
          contact_number?: string | null;
          permits_ready?: boolean | null; // default false
          food_safety?: boolean | null; // default false
          agree_terms?: boolean | null; // default false
          notes?: string | null;
          uploaded_documents?: string[] | null; // default '{}'::text[]
          status?: 'Pending' | 'Approved' | 'Rejected' | null; // default 'Pending'::text
          created_at?: string | null; // default now()
          updated_at?: string | null; // default now()
        };
        Update: {
          id?: string;
          user_id?: string | null;
          business_name?: string;
          locations?: any | null;
          website?: string | null;
          owner_name?: string;
          owner_phone?: string;
          owner_email?: string;
          telephone_number?: string | null;
          contact_number?: string | null;
          permits_ready?: boolean | null;
          food_safety?: boolean | null;
          agree_terms?: boolean | null;
          notes?: string | null;
          uploaded_documents?: string[] | null;
          status?: 'Pending' | 'Approved' | 'Rejected' | null;
          created_at?: string | null;
          updated_at?: string | null;
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
      caterer_profiles: {
        Row: {
          id: string; // uuid, primary key
          user_id: string; // uuid, not null, unique, foreign key to users(id)
          contact_number: string; // text, not null
          email: string | null; // text
          website: string | null; // text
          address: string; // text, not null
          about: string; // text, not null, default ''::text
          facebook: string | null; // text
          instagram: string | null; // text
          created_at: string | null; // timestamp with time zone, default now()
          updated_at: string | null; // timestamp with time zone, default now()
        };
        Insert: {
          id?: string; // uuid, default gen_random_uuid()
          user_id: string; // required, unique
          contact_number: string; // required
          email?: string | null;
          website?: string | null;
          address: string; // required
          about?: string; // text, default ''::text
          facebook?: string | null;
          instagram?: string | null;
          created_at?: string | null; // default now()
          updated_at?: string | null; // default now()
        };
        Update: {
          id?: string;
          user_id?: string;
          contact_number?: string;
          email?: string | null;
          website?: string | null;
          address?: string;
          about?: string;
          facebook?: string | null;
          instagram?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      reviews: {
        Row: {
          id: number; // bigserial
          booking_id: number | null; // bigint, unique
          user_id: string | null; // UUID
          caterer_id: string | null; // UUID
          service_id: number | null; // bigint
          rating: number; // integer, check constraint 1-5
          comment: string | null;
          created_at: string; // timestamp without time zone
          updated_at: string; // timestamp without time zone
        };
        Insert: {
          id?: number;
          booking_id?: number | null;
          user_id?: string | null;
          caterer_id?: string | null;
          service_id?: number | null;
          rating: number; // 1-5
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          booking_id?: number | null;
          user_id?: string | null;
          caterer_id?: string | null;
          service_id?: number | null;
          rating?: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      terms_conditions: {
        Row: {
          id: number; // bigserial
          version: string; // varchar(20), unique
          title: string; // varchar(255)
          content: string; // text
          effective_date: string; // date
          is_active: boolean | null; // default true
          created_at: string; // timestamp without time zone
          updated_at: string; // timestamp without time zone
        };
        Insert: {
          id?: number;
          version: string;
          title: string;
          content: string;
          effective_date: string;
          is_active?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          version?: string;
          title?: string;
          content?: string;
          effective_date?: string;
          is_active?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_terms_acceptance: {
        Row: {
          id: number; // bigserial
          user_id: string | null; // UUID
          terms_id: number | null; // bigint
          accepted_at: string; // timestamp without time zone, default now()
          ip_address: string | null; // varchar(45)
          user_agent: string | null; // text
        };
        Insert: {
          id?: number;
          user_id?: string | null;
          terms_id?: number | null;
          accepted_at?: string;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Update: {
          id?: number;
          user_id?: string | null;
          terms_id?: number | null;
          accepted_at?: string;
          ip_address?: string | null;
          user_agent?: string | null;
        };
      };
      payment_webhooks: {
        Row: {
          id: number; // bigserial
          event_id: string; // varchar(255), unique
          event_type: string; // varchar(100)
          payment_intent_id: string | null; // varchar(255)
          payment_source_id: string | null; // varchar(255)
          status: string | null; // varchar(50)
          payload: any; // jsonb
          processed: boolean | null; // default false
          processed_at: string | null; // timestamp without time zone
          created_at: string; // timestamp without time zone, default now()
        };
        Insert: {
          id?: number;
          event_id: string;
          event_type: string;
          payment_intent_id?: string | null;
          payment_source_id?: string | null;
          status?: string | null;
          payload: any;
          processed?: boolean | null;
          processed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          event_id?: string;
          event_type?: string;
          payment_intent_id?: string | null;
          payment_source_id?: string | null;
          status?: string | null;
          payload?: any;
          processed?: boolean | null;
          processed_at?: string | null;
          created_at?: string;
        };
      };
      caterer_monthly_gmv: {
        Row: {
          id: number; // bigserial
          caterer_id: string | null; // UUID
          month: string; // date
          total_gmv: number | null; // numeric(12, 2), default 0
          completed_orders: number | null; // integer, default 0
          next_month_fee_tier: string | null; // varchar(20), default 'BASE'
          next_month_fee_percentage: number | null; // numeric(5, 2), default 15.00
          created_at: string | null; // timestamp without time zone, default now()
          updated_at: string | null; // timestamp without time zone, default now()
        };
        Insert: {
          id?: number;
          caterer_id?: string | null;
          month: string;
          total_gmv?: number | null;
          completed_orders?: number | null;
          next_month_fee_tier?: string | null;
          next_month_fee_percentage?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: number;
          caterer_id?: string | null;
          month?: string;
          total_gmv?: number | null;
          completed_orders?: number | null;
          next_month_fee_tier?: string | null;
          next_month_fee_percentage?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
    };
    Views: {
      caterer_earnings: {
        Row: {
          caterer_id: string | null;
          caterer_name: string | null;
          total_bookings: number | null;
          completed_bookings: number | null;
          total_deposits_received: number | null;
          total_remaining_received: number | null;
          total_earnings: number | null;
          total_platform_fees_paid: number | null;
          avg_fee_percentage: number | null;
          current_tier: string | null;
        };
      };
      caterer_ratings: {
        Row: {
          caterer_id: string | null;
          caterer_name: string | null;
          total_reviews: number | null;
          average_rating: number | null;
          five_star_count: number | null;
          four_star_count: number | null;
          three_star_count: number | null;
          two_star_count: number | null;
          one_star_count: number | null;
        };
      };
      payment_analytics: {
        Row: {
          payment_method: string | null;
          payment_status: string | null;
          transaction_count: number | null;
          total_amount: number | null;
          average_amount: number | null;
        };
      };
      payment_analytics_v2: {
        Row: {
          payment_method: string | null;
          payment_status: string | null;
          transaction_count: number | null;
          total_deposits: number | null;
          total_remaining: number | null;
          total_amount: number | null;
          total_platform_fees: number | null;
          total_caterer_payouts: number | null;
          avg_platform_fee_percentage: number | null;
        };
      };
      user_locations_with_distance: {
        Row: {
          id: string;
          user_id: string;
          latitude: number;
          longitude: number;
          address: string;
          location_name: string | null;
          is_primary: boolean;
          created_at: string;
          updated_at: string;
          distance_km: number; // Always 0 in view, calculated elsewhere
        };
      };
    };
  };
}
