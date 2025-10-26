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

// Save a new user location
export async function saveUserLocation(locationData: CreateLocationData): Promise<UserLocation> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('user_locations')
    .insert({
      user_id: user.id,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      address: locationData.address,
      location_name: locationData.location_name || null,
      is_primary: locationData.is_primary || false,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save location: ${error.message}`);
  }

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
export async function saveAndSetPrimaryLocation(locationData: CreateLocationData): Promise<UserLocation> {
  const location = await saveUserLocation({
    ...locationData,
    is_primary: true,
  });
  
  return location;
}
