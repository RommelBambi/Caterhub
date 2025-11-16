// Delivery fee calculation service
// Calculates delivery fee based on distance and number of guests

import { calculateDistance } from './location';
import { geocodeAddress } from './geocoding';

export interface DeliveryFeeConfig {
  baseFee: number; // Base delivery fee in PHP (covers first baseDistanceKm)
  baseDistanceKm: number; // Distance covered by base fee
  perKmRate: number; // Fee per kilometer beyond base distance
  guestsPerJeepney: number; // Number of guests one jeepney can carry
  minFee: number; // Minimum delivery fee
  maxFee?: number; // Maximum delivery fee (optional)
}

// Default delivery fee configuration
const DEFAULT_CONFIG: DeliveryFeeConfig = {
  baseFee: 500, // Base fee: ₱500 (covers first 5 km)
  baseDistanceKm: 5, // Base fee covers up to 5 km
  perKmRate: 50, // ₱50 per kilometer beyond 5 km
  guestsPerJeepney: 50, // One jeepney can carry 50 guests
  minFee: 500, // Minimum: ₱500
  maxFee: undefined, // No maximum limit
};

/**
 * Calculate delivery fee based on distance and number of guests
 * 
 * Formula:
 * 1. Base fee: ₱500 (covers up to 5 km)
 * 2. If distance > 5 km: add (distance - 5) * ₱50
 * 3. Calculate number of jeepneys needed: Math.ceil(guests / 50)
 * 4. Multiply total by number of jeepneys
 * 
 * Examples:
 * - 3 km, 30 guests: ₱500 * 1 = ₱500
 * - 8 km, 30 guests: (₱500 + (8-5)*₱50) * 1 = ₱650
 * - 8 km, 60 guests: (₱500 + (8-5)*₱50) * 2 = ₱1,300
 * - 8 km, 120 guests: (₱500 + (8-5)*₱50) * 3 = ₱1,950
 */
export function calculateDeliveryFee(
  distanceKm: number,
  guests: number,
  config: DeliveryFeeConfig = DEFAULT_CONFIG
): number {
  // Step 1: Calculate base fee (always ₱500, covers up to 5 km)
  let distanceFee = config.baseFee;
  
  // Step 2: If distance exceeds base distance, add extra per km
  if (distanceKm > config.baseDistanceKm) {
    const extraKm = distanceKm - config.baseDistanceKm;
    distanceFee += extraKm * config.perKmRate;
  }
  
  // Step 3: Calculate number of jeepneys needed
  // One jeepney can carry up to guestsPerJeepney guests
  const numberOfJeepneys = Math.ceil(guests / config.guestsPerJeepney);
  
  // Step 4: Multiply by number of jeepneys
  let totalFee = distanceFee * numberOfJeepneys;
  
  // Apply minimum (should always be at least baseFee)
  totalFee = Math.max(totalFee, config.minFee);
  
  // Apply maximum if set
  if (config.maxFee !== undefined) {
    totalFee = Math.min(totalFee, config.maxFee);
  }
  
  // Round to nearest peso
  return Math.round(totalFee);
}

/**
 * Calculate delivery fee from coordinates
 */
export function calculateDeliveryFeeFromCoordinates(
  customerLat: number,
  customerLng: number,
  catererLat: number,
  catererLng: number,
  guests: number,
  config: DeliveryFeeConfig = DEFAULT_CONFIG
): number {
  const distance = calculateDistance(customerLat, customerLng, catererLat, catererLng);
  return calculateDeliveryFee(distance, guests, config);
}

/**
 * Calculate delivery fee from addresses (geocodes addresses first)
 */
export async function calculateDeliveryFeeFromAddresses(
  customerAddress: string,
  catererLat: number,
  catererLng: number,
  guests: number,
  config: DeliveryFeeConfig = DEFAULT_CONFIG
): Promise<number | null> {
  try {
    // Geocode customer address
    const geocodeResult = await geocodeAddress(customerAddress);
    
    if (!geocodeResult) {
      console.warn('[calculateDeliveryFeeFromAddresses] Failed to geocode customer address');
      return null;
    }
    
    // Calculate distance
    const distance = calculateDistance(
      geocodeResult.latitude,
      geocodeResult.longitude,
      catererLat,
      catererLng
    );
    
    // Calculate fee
    return calculateDeliveryFee(distance, guests, config);
  } catch (error) {
    console.error('[calculateDeliveryFeeFromAddresses] Error:', error);
    return null;
  }
}

/**
 * Get the closest caterer location to customer address
 * Returns the location with minimum distance
 */
export async function getClosestCatererLocation(
  customerAddress: string,
  catererLocations: Array<{ latitude: number; longitude: number; address?: string }>
): Promise<{ location: { latitude: number; longitude: number }; distance: number } | null> {
  try {
    // Geocode customer address
    const geocodeResult = await geocodeAddress(customerAddress);
    
    if (!geocodeResult || !catererLocations || catererLocations.length === 0) {
      return null;
    }
    
    // Find closest location
    let minDistance = Infinity;
    let closestLocation: { latitude: number; longitude: number } | null = null;
    
    for (const loc of catererLocations) {
      if (loc.latitude && loc.longitude) {
        const distance = calculateDistance(
          geocodeResult.latitude,
          geocodeResult.longitude,
          loc.latitude,
          loc.longitude
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestLocation = { latitude: loc.latitude, longitude: loc.longitude };
        }
      }
    }
    
    if (!closestLocation) {
      return null;
    }
    
    return {
      location: closestLocation,
      distance: minDistance,
    };
  } catch (error) {
    console.error('[getClosestCatererLocation] Error:', error);
    return null;
  }
}

