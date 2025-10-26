// Location utilities for calculating distances and filtering nearby services

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

// Calculate distance between two coordinates using Haversine formula
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

// Filter services by distance from user location
export function filterServicesByDistance(
  services: any[],
  userLocation: Location,
  maxDistanceKm: number = 50
): any[] {
  return services.filter(service => {
    // For now, we'll use mock coordinates for services
    // In a real app, you'd store coordinates in your database
    const serviceCoords = getServiceCoordinates(service);
    
    if (!serviceCoords) return true; // Include if no coordinates available
    
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      serviceCoords.latitude,
      serviceCoords.longitude
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
  const serviceCoords = getServiceCoordinates(service);
  
  if (!serviceCoords) return null;
  
  return calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    serviceCoords.latitude,
    serviceCoords.longitude
  );
}
