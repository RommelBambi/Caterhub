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
  
  if (error) {
    console.error('Supabase auth signup error:', error);
    throw new Error(error.message || 'Failed to create account. Please try again.');
  }
  
  if (!data.user) {
    throw new Error('User creation failed - no user data returned');
  }
  
  // The user profile should be created automatically by the trigger
  // If the trigger fails, try to create it manually
  let profile = null;
  let retries = 3;
  
  while (retries > 0 && !profile) {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { data: fetchedProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();
      
    if (!profileError && fetchedProfile) {
      profile = fetchedProfile;
      break;
    }
    
    // If profile doesn't exist, try to create it manually
    if (profileError && profileError.code === 'PGRST116') {
      console.log('User profile not found, creating manually...');
      const { data: newProfile, error: insertError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email || email,
          username: username,
          role: role
        })
        .select()
        .single();
        
      if (!insertError && newProfile) {
        profile = newProfile;
        break;
      } else {
        console.error('Failed to create user profile manually:', insertError);
      }
    }
    
    retries--;
  }
  
  if (!profile) {
    throw new Error('Failed to create or fetch user profile. Please contact support.');
  }
  
  // Update role if it doesn't match (for CATER role)
  if (role === "CATER" && profile.role !== "CATER") {
    const { error: updateError } = await supabase
      .from('users')
      .update({ role: 'CATER' })
      .eq('id', data.user.id);
      
    if (updateError) {
      console.warn('Failed to update role:', updateError);
    } else {
      profile = { ...profile, role: 'CATER' };
    }
  }
    
  return profile;
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