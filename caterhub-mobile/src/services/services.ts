
import { supabase } from './supabase';



export type DishOption = { id: string; name: string };

export type PackageCategory = {
  id: string;
  name: string;               
  options: DishOption[];      
  required?: boolean;         
  pick?: number;              
};

export type ServicePackage = {
  id: string;
  name: string;               
  pricePerHead: number;       
  categories: PackageCategory[];
};

export type Service = {
  id: number;
  name: string;
  description?: string | null;
  imageUrl?: string | null;   
  logoUrl?: string | null;    
  rating?: number;
  reviewsCount?: number;
  pricePerHead?: number;      
  packages?: ServicePackage[]; 
  
  favoritesCount?: number;
  bookingsCount?: number;
  latitude?: number | null;
  longitude?: number | null;
};




export async function fetchServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  
  // Optionally fetch packages for each service (this might be heavy, so we'll do it on-demand)
  // For now, return services without packages to keep the list fast
  // Packages will be fetched when viewing ServiceDetails
  return (data || []).map((svc: any) => ({
    ...svc,
    packages: undefined, // Will be fetched in fetchService()
  }));
}


export async function fetchTopServices(by: 'likes' | 'bookings', limit = 8): Promise<Service[]> {
  const orderBy = by === 'likes' ? 'favorites_count' : 'bookings_count';
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order(orderBy, { ascending: false })
    .limit(limit);
    
  if (error) throw error;
  return data || [];
}


/**
 * Fetch packages for a specific service
 * Packages are linked to services through caterer_id (packages) = user_id (services)
 */
export async function fetchPackagesForService(serviceUserId: string): Promise<ServicePackage[]> {
  console.log(`[fetchPackagesForService] Fetching packages for caterer_id: ${serviceUserId}`);
  
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .eq('caterer_id', serviceUserId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[fetchPackagesForService] Error fetching packages:', error);
    console.error('[fetchPackagesForService] Error details:', JSON.stringify(error, null, 2));
    return [];
  }
  
  console.log(`[fetchPackagesForService] Found ${data?.length || 0} active packages for caterer ${serviceUserId}`);

  // Transform database packages to ServicePackage format
  return (data || []).map((pkg: any) => {
    // Convert sections to categories format
    const categories: PackageCategory[] = (pkg.sections || []).map((section: any, idx: number) => ({
      id: `section_${idx}`,
      name: section.category || 'Category',
      options: (section.dishes || []).map((dish: string, dishIdx: number) => ({
        id: `dish_${idx}_${dishIdx}`,
        name: dish,
      })),
      required: true,
      pick: 1,
    }));

    // Extract price per head from price string (e.g., "₱250/head" or "250")
    let pricePerHead = 0;
    try {
      const priceMatch = pkg.price.match(/(\d+(?:,\d+)*(?:\.\d+)?)/);
      if (priceMatch) {
        pricePerHead = parseFloat(priceMatch[1].replace(/,/g, ''));
      }
    } catch (e) {
      // If parsing fails, default to 0
    }

    return {
      id: pkg.id,
      name: pkg.name,
      pricePerHead: pricePerHead || 250, // fallback
      categories: categories,
      // Store raw package data for reference
      _raw: pkg,
    } as ServicePackage & { _raw?: any };
  });
}

export async function fetchService(id: number): Promise<Service> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) throw error;
  
  // Fetch packages for this service
  // Packages are linked to services through: packages.caterer_id = services.user_id
  let packages: ServicePackage[] = [];
  try {
    const serviceUserId = (data as any).user_id;
    
    if (serviceUserId) {
      console.log(`[fetchService] Fetching packages for service ${id} with user_id: ${serviceUserId}`);
      packages = await fetchPackagesForService(serviceUserId);
      console.log(`[fetchService] Found ${packages.length} packages for service ${id}`);
    } else {
      // Try alternative approach: find packages by matching with services that have packages
      // This is a fallback for services created before user_id was added
      console.warn(`[fetchService] Service ${id} (${data.name}) does not have user_id. Attempting alternative package lookup...`);
      
      // Alternative: Find all active packages and match by service name or try to find any packages
      // This is a workaround - ideally services should have user_id set
      try {
        const { data: allPackages, error: pkgError } = await supabase
          .from('packages')
          .select('*, caterer_id')
          .eq('is_active', true)
          .limit(100); // Limit to prevent huge queries
        
        if (!pkgError && allPackages && allPackages.length > 0) {
          console.log(`[fetchService] Found ${allPackages.length} total active packages. Service may not be linked to caterer.`);
          // We can't reliably match without user_id, so we return empty packages
          // The service owner should update their service to include user_id
        }
      } catch (altError) {
        console.error('[fetchService] Error in alternative package lookup:', altError);
      }
      
      console.warn(`[fetchService] Cannot fetch packages for service ${id} - service.user_id is missing. Please link the service to a caterer by setting user_id.`);
    }
  } catch (e) {
    console.error('[fetchService] Error fetching packages for service:', e);
    // Continue without packages if fetch fails
  }
  
  return {
    ...data,
    packages: packages.length > 0 ? packages : undefined,
  };
}


export async function createBooking(payload: {
  serviceId: number;
  eventDate: string;   
  guests: number;
  notes?: string;
  packageId?: string; // UUID of the package
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      user_id: user.id,
      service_id: payload.serviceId,
      event_date: payload.eventDate,
      guests: payload.guests,
      notes: payload.notes,
      package_id: payload.packageId || null,
      status: 'PENDING',
    })
    .select()
    .single();
    
  if (error) {
    console.error('[createBooking] Error creating booking:', error);
    throw error;
  }
  
  console.log('[createBooking] Booking created successfully:', data.id);
  return data;
}

export async function fetchMyBookings() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  
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
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data || [];
}

export async function getMyFavorites(): Promise<number[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  
  const { data, error } = await supabase
    .from('favorites')
    .select('service_id')
    .eq('user_id', user.id);
    
  if (error) throw error;
  return (data ?? []).map((f: any) => Number(f.service_id));
}

export async function addFavorite(serviceId: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  
  const { error } = await supabase
    .from('favorites')
    .insert({
      user_id: user.id,
      service_id: serviceId,
    });
    
  if (error) throw error;
}

export async function removeFavorite(serviceId: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('service_id', serviceId);
    
  if (error) throw error;
}

export async function searchServices(query: string): Promise<Service[]> {
  if (!query.trim()) {
    return [];
  }

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .order('name');

  if (error) {
    throw new Error(`Failed to search services: ${error.message}`);
  }

  return data || [];
}
