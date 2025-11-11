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
    
    // Check for "email already exists" errors
    const errorMessage = error.message || '';
    if (
      errorMessage.includes('already registered') ||
      errorMessage.includes('User already registered') ||
      errorMessage.includes('already exists') ||
      errorMessage.includes('email address is already registered') ||
      errorMessage.includes('Email already registered')
    ) {
      throw new Error('An account with this email already exists. Please use a different email or sign in.');
    }
    
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
    
    // Try to fetch by ID first
    let fetchedProfile = null;
    let profileError = null;
    
    const { data: profileById, error: errorById } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();
      
    if (!errorById && profileById) {
      fetchedProfile = profileById;
    } else {
      // If ID query fails (might be RLS issue), try by email
      const { data: profileByEmail, error: errorByEmail } = await supabase
        .from('users')
        .select('*')
        .eq('email', data.user.email || email)
        .single();
        
      if (!errorByEmail && profileByEmail) {
        fetchedProfile = profileByEmail;
      } else {
        profileError = errorById || errorByEmail;
      }
    }
      
    if (fetchedProfile) {
      profile = fetchedProfile;
      
      // IMMEDIATE CHECK: If profile has ADMIN role but we're registering as CATER, fix it immediately
      if (profile.role === 'ADMIN' && role === 'CATER') {
        console.error('CRITICAL: Profile fetched with ADMIN role during CATER registration! Fixing immediately...');
        const { error: immediateFix } = await supabase
          .from('users')
          .update({ role: 'CATER' })
          .eq('id', data.user.id);
        
        if (!immediateFix) {
          profile = { ...profile, role: 'CATER' };
          console.log('✅ Fixed ADMIN role to CATER immediately');
        }
      }
      
      break;
    }
    
      // If profile doesn't exist, wait a bit more and try again (trigger might be slow)
      // PGRST116 = no rows returned, also check for 406 errors (RLS blocking)
      if (profileError && (profileError.code === 'PGRST116' || profileError.code === 'PGRST406')) {
        console.log('User profile not found, waiting for trigger...');
        // Wait a bit longer for the trigger
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Try fetching again
        const { data: retryProfile, error: retryError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();
          
        if (!retryError && retryProfile) {
          profile = retryProfile;
          break;
        }
        
        // If still not found, try to create it manually (should work with RLS policy)
        console.log('Trigger did not create profile, attempting manual creation...');
        
        // Generate unique username if "Partner" is used (common default)
        let finalUsername = username;
        if (username === 'Partner' || !username || username.trim() === '') {
          // Use email prefix or generate unique username
          const emailPrefix = (data.user.email || email).split('@')[0];
          finalUsername = emailPrefix || `user_${data.user.id.substring(0, 8)}`;
        }
        
        // Check if username exists and generate unique one if needed
        let uniqueUsername = finalUsername;
        let usernameCounter = 0;
        while (usernameCounter < 10) {
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('username', uniqueUsername)
            .single();
            
          if (!existingUser) {
            // Username is available
            break;
          }
          
          // Username exists, try with number
          usernameCounter++;
          uniqueUsername = `${finalUsername}_${usernameCounter}`;
        }
        
        // CRITICAL: Force role to be CATER if registering as CATER, never ADMIN
        const finalRole = role === 'CATER' ? 'CATER' : (role === 'CUSTOMER' ? 'CUSTOMER' : 'CUSTOMER');
        
        const { data: newProfile, error: insertError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email || email,
            username: uniqueUsername,
            role: finalRole // Explicitly set role, never ADMIN
          })
          .select()
          .single();
          
        if (!insertError && newProfile) {
          profile = newProfile;
          
          // IMMEDIATE CHECK: Verify role is correct (never ADMIN for CATER registration)
          if (profile.role === 'ADMIN' && role === 'CATER') {
            console.error('CRITICAL: Profile created with ADMIN role during CATER registration! Fixing immediately...');
            const { error: immediateFix } = await supabase
              .from('users')
              .update({ role: 'CATER' })
              .eq('id', data.user.id);
            
            if (!immediateFix) {
              profile = { ...profile, role: 'CATER' };
              console.log('✅ Fixed ADMIN role to CATER immediately after creation');
            } else {
              console.error('Failed to fix ADMIN role:', immediateFix);
            }
          }
          
          break;
        } else {
          console.error('Failed to create user profile manually:', insertError);
          // If it's a duplicate username error, the profile might actually exist
          if (insertError?.code === '23505' && insertError?.message?.includes('username')) {
            // Try fetching by email instead
            const { data: emailProfile } = await supabase
              .from('users')
              .select('*')
              .eq('email', data.user.email || email)
              .single();
              
            if (emailProfile) {
              profile = emailProfile;
              break;
            }
          }
        }
      }
    
    retries--;
  }
  
  if (!profile) {
    throw new Error('Failed to create or fetch user profile. Please contact support.');
  }
  
  // Update role if it doesn't match (for CATER role)
  // IMPORTANT: Never allow role to be set to ADMIN during registration
  if (role === "CATER" && profile.role !== "CATER") {
    // If profile somehow has ADMIN role, log error and fix it
    if (profile.role === "ADMIN") {
      console.error('SECURITY WARNING: User profile has ADMIN role during CATER registration! Fixing...');
    }
    
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
  
  // CRITICAL FINAL CHECK: Ensure role is NEVER ADMIN for new registrations
  // This catches any case where ADMIN might have been set by a database trigger or default
  if (profile.role === "ADMIN" && role !== "ADMIN") {
    console.error('🚨🚨🚨 CRITICAL SECURITY ERROR: User was assigned ADMIN role during registration!');
    console.error('🚨 Registration role requested:', role);
    console.error('🚨 Profile role received:', profile.role);
    console.error('🚨 User ID:', data.user.id);
    console.error('🚨 Email:', email);
    console.error('🚨 Fixing to requested role immediately...');
    
    const targetRole = role === 'CATER' ? 'CATER' : 'CUSTOMER';
    const { error: fixError } = await supabase
      .from('users')
      .update({ role: targetRole })
      .eq('id', data.user.id);
    
    if (!fixError) {
      profile = { ...profile, role: targetRole };
      console.log('✅ Successfully fixed ADMIN role to', targetRole);
    } else {
      console.error('❌ CRITICAL: Failed to fix ADMIN role!', fixError);
    }
  }
  
  // Additional verification: Log role for debugging
  if (role === 'CATER' && profile.role !== 'CATER') {
    console.warn('⚠️ Role mismatch: Requested CATER but got', profile.role);
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