// Geocoding utility to convert addresses to coordinates
// Uses a free geocoding service (Nominatim) for address to lat/lng conversion

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  address: string;
}

/**
 * Geocode an address string to get latitude and longitude
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 */
export async function geocodeAddress(
  address: string,
  city?: string,
  province?: string,
  country: string = 'Philippines'
): Promise<GeocodeResult | null> {
  try {
    // Build a search query from the address components
    const queryParts: string[] = [];
    
    if (address) queryParts.push(address);
    if (city) queryParts.push(city);
    if (province) queryParts.push(province);
    if (country) queryParts.push(country);
    
    const query = queryParts.join(', ');
    
    if (!query.trim()) {
      console.warn('[geocodeAddress] Empty query, cannot geocode');
      return null;
    }
    
    // Use Nominatim API (OpenStreetMap's geocoding service)
    // Rate limit: 1 request per second (we'll add a small delay)
    const encodedQuery = encodeURIComponent(query);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=1&countrycodes=ph`;
    
    console.log(`[geocodeAddress] Geocoding: "${query}"`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Caterhub-Mobile-App', // Required by Nominatim
      },
    });
    
    if (!response.ok) {
      console.warn(`[geocodeAddress] Geocoding failed: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`[geocodeAddress] No results found for: "${query}"`);
      return null;
    }
    
    const result = data[0];
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    
    if (isNaN(lat) || isNaN(lon)) {
      console.warn(`[geocodeAddress] Invalid coordinates: ${result.lat}, ${result.lon}`);
      return null;
    }
    
    console.log(`[geocodeAddress] ✅ Geocoded "${query}" to ${lat}, ${lon}`);
    
    return {
      latitude: lat,
      longitude: lon,
      address: result.display_name || query,
    };
  } catch (error) {
    console.error(`[geocodeAddress] Error geocoding "${address}":`, error);
    return null;
  }
}

/**
 * Geocode multiple addresses with rate limiting (1 request per second)
 */
export async function geocodeAddresses(
  addresses: Array<{ address: string; city?: string; province?: string; country?: string }>,
  delayMs: number = 1100 // Slightly more than 1 second to respect rate limits
): Promise<Array<GeocodeResult | null>> {
  const results: Array<GeocodeResult | null> = [];
  
  for (let i = 0; i < addresses.length; i++) {
    const addr = addresses[i];
    const result = await geocodeAddress(
      addr.address,
      addr.city,
      addr.province,
      addr.country || 'Philippines'
    );
    results.push(result);
    
    // Add delay between requests (except for the last one)
    if (i < addresses.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}

