import { supabase } from './supabase';

export interface UserLocation {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  address: string;
  location_name: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateLocationData {
  latitude: number;
  longitude: number;
  address: string;
  location_name?: string;
  is_primary?: boolean;
}

// Save a new user location (replaces existing location if one exists)
// Customers should only have one location - new location replaces the old one
export async function saveUserLocation(locationData: CreateLocationData): Promise<UserLocation> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  // Check if user already has a location
  const { data: existingLocations, error: checkError } = await supabase
    .from('user_locations')
    .select('id')
    .eq('user_id', user.id)
    .limit(1);

  if (checkError) {
    throw new Error(`Failed to check existing locations: ${checkError.message}`);
  }

  // If user has an existing location, update it instead of creating a new one
  if (existingLocations && existingLocations.length > 0) {
    const existingLocationId = existingLocations[0].id;
    
    const { data, error } = await supabase
      .from('user_locations')
      .update({
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        address: locationData.address,
        location_name: locationData.location_name || null,
        is_primary: locationData.is_primary !== undefined ? locationData.is_primary : true, // Default to primary
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingLocationId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update location: ${error.message}`);
    }

    console.log('[saveUserLocation] Updated existing location:', existingLocationId);
    return data;
  }

  // No existing location, create a new one
  const { data, error } = await supabase
    .from('user_locations')
    .insert({
      user_id: user.id,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      address: locationData.address,
      location_name: locationData.location_name || null,
      is_primary: locationData.is_primary !== undefined ? locationData.is_primary : true, // Default to primary
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save location: ${error.message}`);
  }

  console.log('[saveUserLocation] Created new location');
  return data;
}

// Get all user locations
export async function getUserLocations(): Promise<UserLocation[]> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('user_locations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch locations: ${error.message}`);
  }

  return data || [];
}

// Get user's primary location
export async function getPrimaryLocation(): Promise<UserLocation | null> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('user_locations')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_primary', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No primary location found
      return null;
    }
    throw new Error(`Failed to fetch primary location: ${error.message}`);
  }

  return data;
}

// Set a location as primary (automatically unsets others)
export async function setPrimaryLocation(locationId: string): Promise<void> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('user_locations')
    .update({ is_primary: true })
    .eq('id', locationId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(`Failed to set primary location: ${error.message}`);
  }
}

// Update a location
export async function updateUserLocation(
  locationId: string, 
  updates: Partial<CreateLocationData>
): Promise<UserLocation> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('user_locations')
    .update(updates)
    .eq('id', locationId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update location: ${error.message}`);
  }

  return data;
}

// Delete a location
export async function deleteUserLocation(locationId: string): Promise<void> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('user_locations')
    .delete()
    .eq('id', locationId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(`Failed to delete location: ${error.message}`);
  }
}

// Save location and set as primary (convenience function)
// This will replace existing location if one exists
export async function saveAndSetPrimaryLocation(locationData: CreateLocationData): Promise<UserLocation> {
  // First, unset is_primary on any existing locations (saveUserLocation will handle replacement)
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (!authError && user) {
    // Unset primary flag on all existing locations (saveUserLocation will update the existing one)
    await supabase
      .from('user_locations')
      .update({ is_primary: false })
      .eq('user_id', user.id);
  }
  
  const location = await saveUserLocation({
    ...locationData,
    is_primary: true,
  });
  
  return location;
}
