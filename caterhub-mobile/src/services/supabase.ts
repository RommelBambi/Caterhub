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
          created_at?: string;
          updated_at?: string;
        };
      };
      bookings: {
        Row: {
          id: number;
          user_id: string; // UUID string
          service_id: number;
          event_date: string;
          guests: number;
          notes?: string | null;
          status: 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'COMPLETED' | 'CANCELLED';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_id: string; // UUID string
          service_id: number;
          event_date: string;
          guests: number;
          notes?: string | null;
          status?: 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'COMPLETED' | 'CANCELLED';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string; // UUID string
          service_id?: number;
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
    };
  };
}
