// Location utilities for calculating distances and filtering nearby services

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

export interface ServiceWithLocation {
  id: number;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  // ... other service properties
}

// Calculate distance between two coordinates using Haversine formula
export function calculateDistance(
  lat1: number | null | undefined,
  lon1: number | null | undefined,
  lat2: number | null | undefined,
  lon2: number | null | undefined
): number {
  // Check if coordinates are valid numbers
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null || 
      isNaN(Number(lat1)) || isNaN(Number(lon1)) || 
      isNaN(Number(lat2)) || isNaN(Number(lon2))) {
    console.warn(`[calculateDistance] Invalid coordinates:`, { lat1, lon1, lat2, lon2 });
    return Infinity; // Return large distance if coordinates are missing or invalid
  }
  
  // Convert to numbers to ensure proper calculation
  const latitude1 = Number(lat1);
  const longitude1 = Number(lon1);
  const latitude2 = Number(lat2);
  const longitude2 = Number(lon2);
  
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (latitude2 - latitude1) * Math.PI / 180;
  const dLon = (longitude2 - longitude1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(latitude1 * Math.PI / 180) * Math.cos(latitude2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  
  // Log distance calculations for debugging
  if (distance === Infinity || isNaN(distance)) {
    console.warn(`[calculateDistance] Calculated invalid distance:`, { 
      from: `${latitude1},${longitude1}`, 
      to: `${latitude2},${longitude2}`, 
      result: distance 
    });
    return Infinity;
  }
  
  return distance;
}

// Filter services by distance from user location
export function filterServicesByDistance(
  services: any[],
  userLocation: Location,
  maxDistanceKm: number = 50
): any[] {
  return services.filter(service => {
    // Use real coordinates from database
    if (!service.latitude || !service.longitude) return true; // Include if no coordinates available
    
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      service.latitude,
      service.longitude
    );
    
    return distance <= maxDistanceKm;
  });
}

// Mock function to get service coordinates
// In a real app, you'd store these in your database
function getServiceCoordinates(service: any): { latitude: number; longitude: number } | null {
  // Mock coordinates for different services
  const mockCoords: { [key: string]: { latitude: number; longitude: number } } = {
    "Mama's Kitchen": { latitude: 14.5995, longitude: 120.9842 }, // Manila
    "Golden Spoon Catering": { latitude: 14.6760, longitude: 121.0437 }, // Quezon City
    "Island Flavors": { latitude: 14.5547, longitude: 121.0244 }, // Makati
    "Royal Catering Co.": { latitude: 14.5176, longitude: 121.0509 }, // Taguig
    "Bayanihan Bites": { latitude: 14.5544, longitude: 121.0664 }, // Pasig
    "Chef's Table Express": { latitude: 14.6042, longitude: 120.9822 }, // Manila
  };
  
  return mockCoords[service.name] || null;
}

// Format distance for display
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
}

// Get distance from user location to service
export function getServiceDistance(
  service: any,
  userLocation: Location
): number | null {
  // Use real coordinates from database
  if (!service.latitude || !service.longitude) return null;
  
  return calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    service.latitude,
    service.longitude
  );
}
