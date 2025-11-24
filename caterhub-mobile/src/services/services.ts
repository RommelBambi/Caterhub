
import { supabase } from './supabase';
import { geocodeAddress } from './geocoding';

// Cache for geocoded addresses to avoid repeated API calls
const geocodeCache = new Map<string, { latitude: number; longitude: number }>();

// Hard-coded coordinates for known caterers when geocoding fails
const KNOWN_CATERER_LOCATIONS: Record<string, { name: string, latitude: number, longitude: number }> = {
  // Romulo's Catering in Lucena City (approximate coordinates)
  "Romulo's Catering": { name: "Romulo's Catering", latitude: 13.9427, longitude: 121.6218 },
  
  // Add more caterers as needed
};

/**
 * Helper function to get coordinates for known caterers
 * This is a fallback when geocoding fails
 */
function getKnownCatererCoordinates(businessName: string): { latitude: number, longitude: number } | null {
  const knownCaterer = KNOWN_CATERER_LOCATIONS[businessName];
  if (knownCaterer) {
    console.log(`[getKnownCatererCoordinates] ✅ Using hard-coded coordinates for ${businessName}`);
    return { 
      latitude: knownCaterer.latitude, 
      longitude: knownCaterer.longitude 
    };
  }
  return null;
}



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

export type CatererProfile = {
  contactNumber?: string;
  email?: string;
  website?: string;
  address?: string;
  about?: string;
  facebook?: string;
  instagram?: string;
  sampleImages?: string[]; // Array of sample image URLs
};

export type ServiceLocation = {
  id?: string;
  city?: string;
  address?: string;
  country?: string;
  province?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  serviceRadiusKm?: number;
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
  user_id?: string | null; // Internal: used for fetching packages
  
  // Caterer information
  catererProfile?: CatererProfile;
  locations?: ServiceLocation[]; // From partner_applications
};




export async function fetchServices(): Promise<Service[]> {
  console.log('[fetchServices] Fetching approved caterers directly from partner_applications...');
  
  // NEW APPROACH: Fetch directly from partner_applications (no services table needed)
  // This avoids RLS issues and shows approved caterers directly
  
  // Step 1: Fetch approved partner applications
  console.log('[fetchServices] Fetching approved partner applications...');
  const { data: approvedApplications, error: appError } = await supabase
    .from('partner_applications')
    .select('*')
    .eq('status', 'Approved')
    .order('created_at', { ascending: false });
    
  if (appError) {
    console.error('[fetchServices] Error fetching approved applications:', appError);
    console.error('[fetchServices] Error details:', JSON.stringify(appError, null, 2));
    console.error('[fetchServices] ⚠️ RLS POLICY ISSUE: Customers may not have permission to view approved applications!');
    console.error('[fetchServices] SOLUTION: Add RLS policy: "Customers can view approved applications"');
    throw appError;
  }
  
  console.log(`[fetchServices] Found ${approvedApplications?.length || 0} approved partner applications`);
  
  if (!approvedApplications || approvedApplications.length === 0) {
    console.warn('[fetchServices] No approved applications found. Make sure applications are approved and RLS allows viewing.');
    return [];
  }
  
  // Step 2: Convert approved applications to Service objects
  const servicesToReturn: any[] = [];
  const processedUserIds = new Set<string>();
  
  // Store application data for fallback profile creation
  const applicationDataMap = new Map<string, any>();
  
  for (const app of approvedApplications) {
    // Store application data for later use (for fallback profile)
    if (app.user_id) {
      applicationDataMap.set(app.user_id, app);
    }
    if (!app.user_id || processedUserIds.has(app.user_id)) {
      continue; // Skip if no user_id or already processed
    }
    
    processedUserIds.add(app.user_id);
    
    // Extract location data for latitude/longitude
    let latitude: number | null = null;
    let longitude: number | null = null;
    let locations: ServiceLocation[] = [];
    
    try {
      const locs = typeof app.locations === 'string' 
        ? JSON.parse(app.locations) 
        : app.locations;
      
      if (Array.isArray(locs) && locs.length > 0) {
        // Process locations sequentially to respect geocoding rate limits (1 req/sec)
        locations = [];
        for (let i = 0; i < locs.length; i++) {
          const loc = locs[i];
          let lat = loc.latitude ? parseFloat(loc.latitude) : undefined;
          let lng = loc.longitude ? parseFloat(loc.longitude) : undefined;
          
          // If coordinates are missing, try to geocode the address
          if ((!lat || !lng) && loc.address) {
            // Create cache key from address components
            const cacheKey = `${loc.address}, ${loc.city || ''}, ${loc.province || ''}, ${loc.country || 'Philippines'}`.toLowerCase();
            
            // Check cache first
            const cached = geocodeCache.get(cacheKey);
            if (cached) {
              lat = cached.latitude;
              lng = cached.longitude;
              console.log(`[fetchServices] ✅ Using cached coordinates for: ${loc.address}`);
            } else {
              console.log(`[fetchServices] Missing coordinates for location, geocoding: ${loc.address}`);
              const geocodeResult = await geocodeAddress(
                loc.address,
                loc.city,
                loc.province,
                loc.country || 'Philippines'
              );
              
              if (geocodeResult) {
                lat = geocodeResult.latitude;
                lng = geocodeResult.longitude;
                // Cache the result
                geocodeCache.set(cacheKey, { latitude: lat, longitude: lng });
                console.log(`[fetchServices] ✅ Geocoded location: ${lat}, ${lng}`);
              } else {
                console.warn(`[fetchServices] ⚠️ Failed to geocode location: ${loc.address}`);
                
                // Try fallback to hard-coded coordinates for known caterers
                if (app.business_name) {
                  const knownCoords = getKnownCatererCoordinates(app.business_name);
                  if (knownCoords) {
                    lat = knownCoords.latitude;
                    lng = knownCoords.longitude;
                    console.log(`[fetchServices] ✅ Using fallback hard-coded coordinates for ${app.business_name}: ${lat}, ${lng}`);
                  }
                }
              }
              
              // Add delay between geocoding requests (1.1 seconds to respect rate limits)
              if (i < locs.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1100));
              }
            }
          }
          
          locations.push({
            id: loc.id,
            city: loc.city,
            address: loc.address,
            country: loc.country,
            province: loc.province,
            postalCode: loc.postalCode,
            latitude: lat,
            longitude: lng,
            serviceRadiusKm: loc.serviceRadiusKm ? parseFloat(loc.serviceRadiusKm) : undefined,
          });
        }
        
        // Use first location for service coordinates
        if (locations[0]?.latitude && locations[0]?.longitude) {
          latitude = locations[0].latitude;
          longitude = locations[0].longitude;
        }
      }
    } catch (e) {
      console.warn('[fetchServices] Error parsing locations:', e);
    }
    
    // Create service object directly from application (no database insert needed)
    // Use a hash-based ID from user_id to ensure consistency
    const serviceId = Math.abs(app.user_id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)) % 1000000;
    
    const service: any = {
      id: serviceId,
      name: app.business_name || 'Catering Service',
      description: `Catering service by ${app.owner_name || 'Partner'}`,
      user_id: app.user_id,
      latitude: latitude,
      longitude: longitude,
      price_per_head: null, // Will be set from packages
      rating: 0,
      reviews_count: 0,
      favorites_count: 0,
      bookings_count: 0,
      created_at: app.created_at,
      updated_at: app.updated_at,
      locations: locations.length > 0 ? locations : undefined,
      _fromApplication: true, // Flag to indicate this comes from partner_applications
    };
    
    servicesToReturn.push(service);
    console.log(`[fetchServices] ✅ Created service from application for caterer ${app.user_id} (${app.business_name})`);
  }
  
  console.log(`[fetchServices] ========================================`);
  console.log(`[fetchServices] SUMMARY:`);
  console.log(`[fetchServices] - Approved applications found: ${approvedApplications?.length || 0}`);
  console.log(`[fetchServices] - Total services to return: ${servicesToReturn.length}`);
  
  // Count unique caterers (user_id)
  const uniqueCaterers = new Set(servicesToReturn.filter(s => s.user_id).map(s => s.user_id));
  const servicesWithoutCaterer = servicesToReturn.filter(s => !s.user_id).length;
  
  console.log(`[fetchServices] - Unique caterers (user_id): ${uniqueCaterers.size}`);
  console.log(`[fetchServices] - Services without user_id: ${servicesWithoutCaterer}`);
  
  if (servicesWithoutCaterer > 0) {
    console.warn(`[fetchServices] WARNING: ${servicesWithoutCaterer} service(s) are not linked to a caterer (missing user_id). These services cannot display packages.`);
  }
  
  console.log(`[fetchServices] Services breakdown by caterer:`, 
    Array.from(uniqueCaterers).map(uid => ({
      caterer_id: uid,
      service_count: servicesToReturn.filter(s => s.user_id === uid).length,
      service_names: servicesToReturn.filter(s => s.user_id === uid).map((s: any) => s.name)
    }))
  );
  
  if (servicesToReturn.length === 0) {
    console.error(`[fetchServices] ⚠️ NO SERVICES FOUND!`);
    console.error(`[fetchServices] This could be due to:`);
    console.error(`[fetchServices] 1. No approved partner applications`);
    console.error(`[fetchServices] 2. RLS policies blocking SELECT on partner_applications`);
    console.error(`[fetchServices] 3. Database connection issues`);
    console.error(`[fetchServices] SOLUTION: Add RLS policy: "Public can view approved applications"`);
  }
  
  console.log(`[fetchServices] ========================================`);
  
  // Step 3: Fetch caterer profiles for all services
  const servicesWithProfiles = await Promise.all(
    servicesToReturn.map(async (svc: any) => {
      let catererProfile: CatererProfile | undefined;
      let userLogoUrl: string | null = null;
      
      if (svc.user_id) {
        // Fetch user's profile_image_url to use as logo
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('profile_image_url')
            .eq('id', svc.user_id)
            .maybeSingle();
          
          if (userData?.profile_image_url) {
            userLogoUrl = userData.profile_image_url;
          }
        } catch (e) {
          console.warn(`[fetchServices] Could not fetch user logo for ${svc.user_id}:`, e);
        }
        
        // Fetch caterer profile
        try {
          console.log(`[fetchServices] Fetching caterer profile for user_id: ${svc.user_id}`);
          const { data: profile, error: profileError } = await supabase
            .from('caterer_profiles')
            .select('*')
            .eq('user_id', svc.user_id)
            .maybeSingle();
          
          if (profileError) {
            console.error(`[fetchServices] Error fetching profile for ${svc.user_id}:`, profileError);
            console.error(`[fetchServices] Error code: ${profileError.code}, message: ${profileError.message}`);
            if (profileError.code === 'PGRST301' || profileError.message?.includes('row-level security')) {
              console.error(`[fetchServices] ⚠️ RLS POLICY ISSUE: Cannot fetch caterer profile due to RLS policy restrictions!`);
              console.error(`[fetchServices] ⚠️ Please ensure "Public can view all profiles" policy exists on caterer_profiles table.`);
            }
          } else if (profile) {
            catererProfile = {
              contactNumber: profile.contact_number,
              email: profile.email,
              website: profile.website,
              address: profile.address,
              about: profile.about,
              facebook: profile.facebook,
              instagram: profile.instagram,
              sampleImages: profile.sample_images && Array.isArray(profile.sample_images) && profile.sample_images.length > 0
                ? (profile.sample_images as string[])
                : undefined,
            };
            console.log(`[fetchServices] ✅ Successfully fetched caterer profile for ${svc.user_id}`);
            if (catererProfile.sampleImages) {
              console.log(`[fetchServices] Found ${catererProfile.sampleImages.length} sample images for ${svc.user_id}`);
            }
          } else {
            console.warn(`[fetchServices] ⚠️ No caterer profile found for user_id: ${svc.user_id} (business: ${svc.name})`);
            
            // FALLBACK: Use data from partner_applications if profile doesn't exist
            const appData = applicationDataMap.get(svc.user_id);
            if (appData) {
              console.log(`[fetchServices] Using partner_applications data as fallback for ${svc.user_id}`);
              catererProfile = {
                contactNumber: appData.contact_number || appData.owner_phone || undefined,
                email: appData.owner_email || undefined,
                website: appData.website || undefined,
                address: undefined, // Not available in partner_applications
                about: undefined, // Not available in partner_applications
                facebook: undefined, // Not available in partner_applications
                instagram: undefined, // Not available in partner_applications
              };
              
              // Only create fallback profile if we have at least one field
              if (catererProfile.contactNumber || catererProfile.email || catererProfile.website) {
                console.log(`[fetchServices] ✅ Created fallback profile from application data`);
              } else {
                catererProfile = undefined; // No useful data, don't create empty profile
              }
            }
          }
        } catch (e) {
          console.error(`[fetchServices] Exception fetching profile for ${svc.user_id}:`, e);
          
          // FALLBACK: Try to use application data even if there was an error
          const appData = applicationDataMap.get(svc.user_id);
          if (appData && !catererProfile) {
            console.log(`[fetchServices] Using partner_applications data as fallback after error`);
            catererProfile = {
              contactNumber: appData.contact_number || appData.owner_phone || undefined,
              email: appData.owner_email || undefined,
              website: appData.website || undefined,
              address: undefined,
              about: undefined,
              facebook: undefined,
              instagram: undefined,
            };
            
            if (!catererProfile.contactNumber && !catererProfile.email && !catererProfile.website) {
              catererProfile = undefined;
            }
          }
        }
      }
      
      return {
    id: svc.id,
    name: svc.name,
    description: svc.description,
        imageUrl: svc.image_url || null,
        logoUrl: userLogoUrl || svc.logo_url || null, // Use user's profile_image_url as logo
        rating: svc.rating || 0,
        reviewsCount: svc.reviews_count || 0,
        pricePerHead: svc.price_per_head || null,
        favoritesCount: svc.favorites_count || 0,
        bookingsCount: svc.bookings_count || 0,
    latitude: svc.latitude,
    longitude: svc.longitude,
        user_id: svc.user_id,
        catererProfile: catererProfile,
        locations: svc.locations, // Already extracted from application
    packages: undefined, // Will be fetched in fetchService()
      };
    })
  );
  
  console.log(`[fetchServices] Mapped ${servicesWithProfiles.length} services. Services with user_id: ${servicesWithProfiles.filter(s => s.user_id).length}`);
  console.log(`[fetchServices] Services with caterer profiles: ${servicesWithProfiles.filter(s => s.catererProfile).length}`);
  console.log(`[fetchServices] Services with locations: ${servicesWithProfiles.filter(s => s.locations && s.locations.length > 0).length}`);
  
  return servicesWithProfiles;
}


/**
 * Fetch featured services - only caterers with active premium subscriptions
 */
export async function fetchFeaturedServices(limit = 6): Promise<Service[]> {
  console.log(`[fetchFeaturedServices] Fetching ${limit} featured services (premium subscribers only)...`);
  
  try {
    // Fetch all services first
    const allServices = await fetchServices();
    
    if (allServices.length === 0) {
      console.warn('[fetchFeaturedServices] No services available');
      return [];
    }
    
    // Get all caterer IDs with active subscriptions
    const { data: activeSubscriptions, error: subError } = await supabase
      .from('caterer_subscriptions')
      .select('caterer_id')
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString()); // Only non-expired subscriptions
    
    if (subError) {
      console.error('[fetchFeaturedServices] Error fetching subscriptions:', subError);
      // If we can't fetch subscriptions, return empty array (featured section should only show subscribed caterers)
      return [];
    }
    
    const subscribedCatererIds = new Set(
      (activeSubscriptions || []).map((sub: any) => sub.caterer_id)
    );
    
    console.log(`[fetchFeaturedServices] Found ${subscribedCatererIds.size} caterers with active subscriptions`);
    
    // Filter services to only include subscribed caterers
    const featuredServices = allServices.filter(
      (service) => service.user_id && subscribedCatererIds.has(service.user_id)
    );
    
    // Limit to requested number
    const result = featuredServices.slice(0, limit);
    
    console.log(`[fetchFeaturedServices] Returning ${result.length} featured services`);
    return result;
  } catch (error) {
    console.error('[fetchFeaturedServices] Error:', error);
    return [];
  }
}

export async function fetchTopServices(by: 'likes' | 'bookings', limit = 8): Promise<Service[]> {
  console.log(`[fetchTopServices] Fetching top ${limit} services by ${by}...`);
  
  // Fetch all services (from partner_applications) and sort
  const allServices = await fetchServices();
  
  if (allServices.length === 0) {
    console.warn('[fetchTopServices] No services available');
    return [];
  }
  
  // Sort by the requested metric
  // Since we don't have favorites_count or bookings_count from applications,
  // we'll use a simple approach: return first N services, trying to get variety
  const sorted = [...allServices];
  
  // Try to get variety by caterer
  const uniqueCaterers = new Set<string>();
  const result: Service[] = [];
  
  // First pass: get services from different caterers
  for (const svc of sorted) {
    if (result.length >= limit) break;
    if (svc.user_id && !uniqueCaterers.has(svc.user_id)) {
      uniqueCaterers.add(svc.user_id);
      result.push(svc);
    }
  }
  
  // Second pass: fill remaining slots with any services
  for (const svc of sorted) {
    if (result.length >= limit) break;
    if (!result.find(r => r.id === svc.id)) {
      result.push(svc);
    }
  }
  
  console.log(`[fetchTopServices] Selected ${result.length} services from ${uniqueCaterers.size} unique caterers`);
  return result;
}


/**
 * Fetch packages for a specific service
 * Packages are linked to services through: packages.caterer_id = services.user_id
 * 
 * @param serviceUserId - The user_id (caterer_id) from the services table
 * @returns Array of ServicePackage objects
 */
export async function fetchPackagesForService(serviceUserId: string): Promise<ServicePackage[]> {
  if (!serviceUserId) {
    console.warn('[fetchPackagesForService] No serviceUserId provided. Cannot fetch packages.');
    return [];
  }
  
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
  
  const packageCount = data?.length || 0;
  console.log(`[fetchPackagesForService] Found ${packageCount} active packages for caterer ${serviceUserId}`);
  
  if (packageCount === 0) {
    console.warn(`[fetchPackagesForService] No active packages found for caterer ${serviceUserId}. The caterer may need to create packages.`);
  }

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
  console.log(`[fetchService] Fetching service ${id}...`);
  
  // NEW APPROACH: Find service by matching ID from fetchServices()
  // Since services are now derived from partner_applications, we need to find by user_id hash
  // or fetch all and find the matching one
  
  // Fetch all services and find the one with matching ID
  const allServices = await fetchServices();
  const service = allServices.find(s => s.id === id);
  
  if (!service) {
    throw new Error(`Service ${id} not found`);
  }
  
  console.log(`[fetchService] Service found: ${service.name}, user_id: ${service.user_id || 'MISSING'}`);
  console.log(`[fetchService] Service has catererProfile:`, !!service.catererProfile);
  if (service.catererProfile) {
    console.log(`[fetchService] Caterer profile details:`, {
      hasAbout: !!service.catererProfile.about,
      hasContact: !!service.catererProfile.contactNumber,
      hasEmail: !!service.catererProfile.email,
      hasAddress: !!service.catererProfile.address,
      hasWebsite: !!service.catererProfile.website,
      hasFacebook: !!service.catererProfile.facebook,
      hasInstagram: !!service.catererProfile.instagram,
    });
  }
  
  // Fetch packages for this service
  // CRITICAL: Packages are linked via: packages.caterer_id = services.user_id
  let packages: ServicePackage[] = [];
  const serviceUserId = service.user_id;
  
  // If catererProfile is missing but we have user_id, try to fetch it directly
  let catererProfile = service.catererProfile;
  if (!catererProfile && serviceUserId) {
    console.log(`[fetchService] Caterer profile missing, fetching directly for user_id: ${serviceUserId}`);
    try {
      const { data: profile, error: profileError } = await supabase
        .from('caterer_profiles')
        .select('*')
        .eq('user_id', serviceUserId)
        .maybeSingle();
      
      if (profileError) {
        console.error(`[fetchService] Error fetching profile directly:`, profileError);
        console.error(`[fetchService] Error code: ${profileError.code}, message: ${profileError.message}`);
        if (profileError.code === 'PGRST301' || profileError.message?.includes('row-level security')) {
          console.error(`[fetchService] ⚠️ RLS POLICY ISSUE: Cannot fetch caterer profile due to RLS policy restrictions!`);
          console.error(`[fetchService] ⚠️ Please run VERIFY_CATERER_PROFILES_RLS.sql to ensure public SELECT access is enabled.`);
        }
      } else if (profile) {
        catererProfile = {
          contactNumber: profile.contact_number,
          email: profile.email,
          website: profile.website,
          address: profile.address,
          about: profile.about,
          facebook: profile.facebook,
          instagram: profile.instagram,
          sampleImages: profile.sample_images && Array.isArray(profile.sample_images) && profile.sample_images.length > 0 
            ? (profile.sample_images as string[]) 
            : undefined,
        };
        console.log(`[fetchService] ✅ Successfully fetched caterer profile directly`);
    } else {
        console.warn(`[fetchService] ⚠️ No caterer profile found for user_id: ${serviceUserId}`);
        console.warn(`[fetchService] This caterer may not have completed their profile setup yet.`);
        
        // FALLBACK: Try to get data from partner_applications
        try {
          console.log(`[fetchService] Attempting to fetch fallback data from partner_applications...`);
          const { data: appData } = await supabase
            .from('partner_applications')
            .select('contact_number, owner_phone, owner_email, website')
            .eq('user_id', serviceUserId)
            .eq('status', 'Approved')
            .maybeSingle();
          
          if (appData && (appData.contact_number || appData.owner_phone || appData.owner_email || appData.website)) {
            console.log(`[fetchService] ✅ Found fallback data in partner_applications`);
            catererProfile = {
              contactNumber: appData.contact_number || appData.owner_phone || undefined,
              email: appData.owner_email || undefined,
              website: appData.website || undefined,
              address: undefined,
              about: undefined,
              facebook: undefined,
              instagram: undefined,
            };
          }
        } catch (fallbackError) {
          console.warn(`[fetchService] Could not fetch fallback data:`, fallbackError);
        }
      }
    } catch (e) {
      console.error(`[fetchService] Exception fetching caterer profile directly:`, e);
    }
  }
  
  if (!serviceUserId) {
    console.error(`[fetchService] CRITICAL: Service ${id} (${service.name}) does not have user_id set.`);
    console.error(`[fetchService] This service cannot display packages because packages are linked via packages.caterer_id = services.user_id`);
  } else {
    try {
      console.log(`[fetchService] Fetching packages for service ${id} with user_id: ${serviceUserId}`);
      packages = await fetchPackagesForService(serviceUserId);
      console.log(`[fetchService] Found ${packages.length} packages for service ${id}`);
  } catch (e) {
    console.error('[fetchService] Error fetching packages for service:', e);
    // Continue without packages if fetch fails
    }
  }
  
  // Return service with packages and catererProfile (preserve all service data)
  const result = {
    ...service,
    packages: packages.length > 0 ? packages : undefined,
    catererProfile: catererProfile, // Use fetched or existing catererProfile
    locations: service.locations, // Explicitly preserve locations
  };
  
  console.log(`[fetchService] Returning service with catererProfile:`, !!result.catererProfile);
  if (result.catererProfile) {
    console.log(`[fetchService] Caterer profile will be displayed with:`, {
      about: result.catererProfile.about ? 'Yes' : 'No',
      contact: result.catererProfile.contactNumber ? 'Yes' : 'No',
      email: result.catererProfile.email ? 'Yes' : 'No',
      address: result.catererProfile.address ? 'Yes' : 'No',
      website: result.catererProfile.website ? 'Yes' : 'No',
      facebook: result.catererProfile.facebook ? 'Yes' : 'No',
      instagram: result.catererProfile.instagram ? 'Yes' : 'No',
      sampleImages: result.catererProfile.sampleImages ? `${result.catererProfile.sampleImages.length} images` : 'No',
    });
    if (result.catererProfile.sampleImages) {
      console.log(`[fetchService] Sample images URLs:`, result.catererProfile.sampleImages);
    }
  }
  return result;
}


export async function createBooking(payload: {
  serviceId: number; // Hash-based ID from partner_applications (not from services table)
  eventDate: string;   
  guests: number;
  notes?: string;
  packageId?: string; // UUID of the package
  address?: string;
  depositAmount?: number;
  remainingAmount?: number;
  deliveryFee?: number; // Calculated delivery fee
  catererUserId?: string; // user_id of the caterer (needed since we don't use services table)
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  
  // Build insert data - only include fields that exist in current schema
  // Note: service_id is set to null since services table no longer exists
  // The foreign key constraint will be removed via SQL migration
  const insertData: any = {
    user_id: user.id,
    service_id: null, // Services table deleted, so always null
    event_date: payload.eventDate,
    guests: payload.guests,
    notes: payload.notes,
    package_id: payload.packageId || null,
    status: 'PENDING',
  };

  // Add new fields only if they're provided (for backward compatibility)
  // These will work after running the migration
  if (payload.address !== undefined) {
    insertData.address = payload.address;
  }
  if (payload.depositAmount !== undefined) {
    insertData.deposit_amount = payload.depositAmount;
  }
  if (payload.remainingAmount !== undefined) {
    insertData.remaining_amount = payload.remainingAmount;
  }
  if (payload.deliveryFee !== undefined) {
    insertData.delivery_fee = payload.deliveryFee;
    insertData.delivery_fee_set_by_caterer = false; // Auto-calculated, not set by caterer
  }
  
  const { data, error } = await supabase
    .from('bookings')
    .insert(insertData)
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
  
  // Fetch bookings with package info and caterer name
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      packages:package_id (
        id,
        name,
        price,
        caterer_id
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('[fetchMyBookings] Error fetching bookings:', error);
    throw error;
  }
  
  // Debug: Log the actual data structure
  console.log('[fetchMyBookings] Raw data returned:', JSON.stringify(data, null, 2));
  if (data && data.length > 0) {
    console.log('[fetchMyBookings] First booking packages structure:', JSON.stringify(data[0].packages, null, 2));
  }
  
  // Manually fetch caterer business name from partner_applications (same as home screen)
  if (data && data.length > 0) {
    for (const booking of data) {
      if (booking.packages?.caterer_id) {
        try {
          const { data: partnerApp } = await supabase
            .from('partner_applications')
            .select('business_name, owner_name')
            .eq('user_id', booking.packages.caterer_id)
            .eq('status', 'Approved')
            .single();
          
          if (partnerApp) {
            booking.packages.business_name = partnerApp.business_name;
            console.log(`[fetchMyBookings] Found caterer business: ${partnerApp.business_name} for booking ${booking.id}`);
          } else {
            console.warn(`[fetchMyBookings] No approved partner application found for caterer_id: ${booking.packages.caterer_id}`);
          }
        } catch (catererError) {
          console.error(`[fetchMyBookings] Error fetching caterer business for booking ${booking.id}:`, catererError);
        }
      }
    }
  }
  
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

  const searchTerm = query.trim().toLowerCase();

  // Search in partner_applications (services table no longer exists)
  const { data: applications, error } = await supabase
    .from('partner_applications')
    .select('*')
    .eq('status', 'Approved')
    .or(`business_name.ilike.%${searchTerm}%,owner_name.ilike.%${searchTerm}%`)
    .order('business_name');

  if (error) {
    console.error('[searchServices] Error searching services:', error);
    throw new Error(`Failed to search services: ${error.message}`);
  }

  if (!applications || applications.length === 0) {
    return [];
  }

  // Transform partner_applications to Service format (same as fetchServices)
  const services: Service[] = [];
  
  for (const app of applications) {
    // Get packages for this caterer
    const { data: packages } = await supabase
      .from('packages')
      .select('*')
      .eq('caterer_id', app.user_id)
      .eq('is_active', true);

    // Get caterer profile for additional info
    const { data: profile } = await supabase
      .from('caterer_profiles')
      .select('*')
      .eq('user_id', app.user_id)
      .maybeSingle();

    // Get rating
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('caterer_id', app.user_id);

    const rating = reviews && reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
      : 0;

    // Parse locations
    let locations: any[] = [];
    let latitude: number | undefined;
    let longitude: number | undefined;

    try {
      if (app.locations && Array.isArray(app.locations)) {
        locations = app.locations;
        if (locations[0]?.latitude && locations[0]?.longitude) {
          latitude = locations[0].latitude;
          longitude = locations[0].longitude;
        }
      }
    } catch (e) {
      console.warn('[searchServices] Error parsing locations:', e);
    }

    // Create hash-based ID (same as fetchServices)
    const serviceId = Math.abs(app.user_id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)) % 1000000;

    // Transform packages to ServicePackage format (same as fetchPackagesForService)
    const transformedPackages: ServicePackage[] = (packages || []).map((pkg: any) => {
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
      } as ServicePackage;
    });

    // Calculate average price per head from packages
    const avgPricePerHead = transformedPackages.length > 0
      ? transformedPackages.reduce((sum, pkg) => sum + pkg.pricePerHead, 0) / transformedPackages.length
      : undefined;

    const service: Service = {
      id: serviceId,
      name: app.business_name || 'Catering Service',
      description: profile?.about || `Catering service by ${app.owner_name || 'Partner'}`,
      imageUrl: undefined,
      logoUrl: undefined,
      rating: Math.round(rating * 100) / 100,
      reviewsCount: reviews?.length || 0,
      pricePerHead: avgPricePerHead,
      favoritesCount: 0,
      bookingsCount: 0,
      latitude: latitude,
      longitude: longitude,
      user_id: app.user_id,
      packages: transformedPackages,
      locations: locations.length > 0 ? locations : undefined,
    };

    services.push(service);
  }

  return services;
}
