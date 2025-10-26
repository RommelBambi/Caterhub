import { supabase } from './supabase';

// Authentication functions
export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  
  if (!data.session || !data.user) {
    throw new Error('Login failed - no session created');
  }
  
  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single();
    
  if (profileError) {
    throw new Error('Failed to fetch user profile');
  }
    
  return {
    token: data.session.access_token,
    user: profile,
  };
}

export async function register(email: string, password: string, username: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username
      }
    }
  });
  
  if (error) throw error;
  
  // The user profile will be created automatically by the trigger
  // We just need to return the user data
  if (data.user) {
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();
      
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