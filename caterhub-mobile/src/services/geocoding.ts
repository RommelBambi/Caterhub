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
 * Implements fallback strategy: tries multiple query formats if first attempt fails
 */
export async function geocodeAddress(
  address: string,
  city?: string,
  province?: string,
  country: string = 'Philippines',
  barangay?: string,
  postalCode?: string
): Promise<GeocodeResult | null> {
  // Helper function to try a geocoding query
  const tryGeocode = async (query: string): Promise<GeocodeResult | null> => {
    try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=1&countrycodes=ph`;
    
      console.log(`[geocodeAddress] Trying query: "${query}"`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Caterhub-Mobile-App', // Required by Nominatim
      },
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }
    
    const result = data[0];
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    
    if (isNaN(lat) || isNaN(lon)) {
      return null;
    }
    
    console.log(`[geocodeAddress] ✅ Geocoded "${query}" to ${lat}, ${lon}`);
    
    return {
      latitude: lat,
      longitude: lon,
      address: result.display_name || query,
    };
    } catch (error) {
      return null;
    }
  };

  try {
    // Strategy 1: Full address (original order) - try exact location first
    // address, barangay, city, province, postal code, country
    if (address && address.trim()) {
      const queryParts1: string[] = [];
      if (address) queryParts1.push(address);
      if (barangay) queryParts1.push(barangay);
      if (city) queryParts1.push(city);
      if (province) queryParts1.push(province);
      if (postalCode) queryParts1.push(postalCode);
      if (country) queryParts1.push(country);
      
      const query1 = queryParts1.join(', ');
      if (query1.trim()) {
        const result = await tryGeocode(query1);
        if (result) {
          console.log(`[geocodeAddress] ✅ Found exact location using full address`);
          return result;
        }
        console.log(`[geocodeAddress] ⚠️ Exact address not found, trying fallback strategies...`);
      }
    }

    // Strategy 2: Start with barangay (more reliable for Philippines)
    // If exact address fails, use barangay as fallback
    // barangay, city, province, postal code, country
    if (barangay && barangay.trim()) {
      const queryParts2: string[] = [];
      if (barangay) queryParts2.push(barangay);
      if (city) queryParts2.push(city);
      if (province) queryParts2.push(province);
      if (postalCode) queryParts2.push(postalCode);
      if (country) queryParts2.push(country);
      
      const query2 = queryParts2.join(', ');
      if (query2.trim()) {
        // Add delay before retry (respect rate limits)
        await new Promise(resolve => setTimeout(resolve, 1100));
        const result = await tryGeocode(query2);
        if (result) {
          console.log(`[geocodeAddress] ✅ Found location using barangay fallback`);
          return result;
        }
        console.log(`[geocodeAddress] ⚠️ Barangay search failed, trying city...`);
      }
    }

    // Strategy 3: City + Province (broader search)
    // If barangay fails, use city + province as fallback
    // city, province, country
    if (city && city.trim() && province && province.trim()) {
      const queryParts3: string[] = [];
      if (city) queryParts3.push(city);
      if (province) queryParts3.push(province);
      if (country) queryParts3.push(country);
      
      const query3 = queryParts3.join(', ');
      if (query3.trim()) {
        await new Promise(resolve => setTimeout(resolve, 1100));
        const result = await tryGeocode(query3);
        if (result) {
          console.log(`[geocodeAddress] ✅ Found location using city + province fallback`);
          return result;
        }
        console.log(`[geocodeAddress] ⚠️ City + province search failed, trying city only...`);
      }
    }

    // Strategy 4: Just city (final fallback)
    // If city + province fails, use just city
    // city, country
    if (city && city.trim()) {
      const queryParts4: string[] = [];
      if (city) queryParts4.push(city);
      if (country) queryParts4.push(country);
      
      const query4 = queryParts4.join(', ');
      if (query4.trim()) {
        await new Promise(resolve => setTimeout(resolve, 1100));
        const result = await tryGeocode(query4);
        if (result) {
          console.log(`[geocodeAddress] ✅ Found location using city-only fallback`);
          return result;
        }
      }
    }

    // Strategy 5: Just province (last resort)
    // If all else fails, try just province
    if (province && province.trim()) {
      const queryParts5: string[] = [];
      if (province) queryParts5.push(province);
      if (country) queryParts5.push(country);
      
      const query5 = queryParts5.join(', ');
      if (query5.trim()) {
        await new Promise(resolve => setTimeout(resolve, 1100));
        const result = await tryGeocode(query5);
        if (result) {
          console.log(`[geocodeAddress] ✅ Found location using province-only fallback`);
          return result;
        }
      }
    }

    console.warn(`[geocodeAddress] ❌ All geocoding strategies failed for address: ${address || 'N/A'}, barangay: ${barangay || 'N/A'}, city: ${city || 'N/A'}`);
    return null;
  } catch (error) {
    console.error(`[geocodeAddress] Error geocoding "${address}":`, error);
    return null;
  }
}

/**
 * Geocode multiple addresses with rate limiting (1 request per second)
 */
export async function geocodeAddresses(
  addresses: Array<{ address: string; city?: string; province?: string; country?: string; barangay?: string; postalCode?: string }>,
  delayMs: number = 1100 // Slightly more than 1 second to respect rate limits
): Promise<Array<GeocodeResult | null>> {
  const results: Array<GeocodeResult | null> = [];
  
  for (let i = 0; i < addresses.length; i++) {
    const addr = addresses[i];
    const result = await geocodeAddress(
      addr.address,
      addr.city,
      addr.province,
      addr.country || 'Philippines',
      addr.barangay,
      addr.postalCode
    );
    results.push(result);
    
    // Add delay between requests (except for the last one)
    if (i < addresses.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}

