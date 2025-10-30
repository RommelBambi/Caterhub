import { supabase } from './supabase';
import { Platform } from 'react-native';

// Authentication functions
export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    console.error('Supabase auth error:', error);
    throw new Error(error.message || 'Invalid email or password.');
  }
  
  if (!data.session || !data.user) {
    console.error('No session or user data returned');
    throw new Error('Login failed - no session created');
  }
  
  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single();
    
  if (profileError) {
    console.error('Profile fetch error:', profileError);
    // If profile doesn't exist, this might be a new user without a profile
    if (profileError.code === 'PGRST116') {
      throw new Error('User profile not found. Please contact support or sign up again.');
    }
    throw new Error(`Failed to fetch user profile: ${profileError.message || 'Unknown error'}`);
  }
  
  if (!profile) {
    throw new Error('User profile not found. Please contact support.');
  }

  // Validate role/platform combination
  const isWeb = Platform.OS === 'web';
  const userRole = profile.role;
  
  if (isWeb) {
    // Web: Only ADMIN and CATER can login
    if (userRole === 'CUSTOMER') {
      throw new Error('Customer accounts can only be accessed on mobile devices. Please use the mobile app.');
    }
  } else {
    // Mobile: Only CUSTOMER and CATER can login, not ADMIN
    if (userRole === 'ADMIN') {
      throw new Error('Admin accounts can only be accessed on web. Please log in through the web browser.');
    }
  }
  
  return {
    token: data.session.access_token,
    user: profile,
  };
}

export async function register(email: string, password: string, username: string, role: "CUSTOMER" | "CATER" = "CUSTOMER") {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username,
        role: role
      }
    }
  });
  
  if (error) throw error;
  
  // The user profile will be created automatically by the trigger
  // But we need to update the role if it's CATER
  if (data.user) {
    // Give trigger a moment to create the user record
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();
      
    if (profileError) {
      throw new Error('Failed to fetch user profile');
    }
    
    // Update role if needed
    if (role === "CATER" && profile?.role !== "CATER") {
      const { error: updateError } = await supabase
        .from('users')
        .update({ role: 'CATER' })
        .eq('id', data.user.id);
        
      if (updateError) {
        console.warn('Failed to update role:', updateError);
      } else if (profile) {
        return { ...profile, role: 'CATER' };
      }
    }
      
    return profile;
  }
  
  throw new Error('User creation failed');
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();
    
  return profile;
}

// Booking functions
export async function fetchBookingDetails(bookingId: number) {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      services:service_id (
        id,
        name,
        price_per_head
      )
    `)
    .eq('id', bookingId)
    .single();
    
  if (error) throw error;
  return data;
}

export async function cancelBooking(bookingId: number) {
  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'CANCELLED' })
    .eq('id', bookingId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}