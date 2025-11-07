// Location data for Philippines using ph-regions-cities-municipalities package
// @ts-ignore - Package may not have proper TypeScript definitions
import phData from 'ph-regions-cities-municipalities';

export const COUNTRIES = ["Philippines"];

// Get provinces/states from the package
const phDataResolved = (phData as any).default || phData;
export const PROVINCES_PH = phDataResolved?.states?.map((state: any) => state.name) || [];

// Helper function to get cities/municipalities for a province
export const getCitiesByProvince = (provinceName: string): string[] => {
  if (!provinceName) return [];
  
  const data = (phData as any).default || phData;
  const state = data.states?.find((s: any) => s.name === provinceName);
  
  if (!state || !state.iso2) return [];
  
  const stateData = data.statesMap?.[state.iso2];
  if (!stateData) return [];
  
  // Extract cities/municipalities from the state data
  const cities: string[] = [];
  Object.keys(stateData).forEach((key) => {
    const entry = stateData[key];
    if (entry && entry.name) {
      cities.push(entry.name);
    }
  });
  
  return cities.sort();
};

// Legacy export for backward compatibility
export const CITIES_BY_PROVINCE: { [key: string]: string[] } = {};
// Populate CITIES_BY_PROVINCE for all provinces
PROVINCES_PH.forEach((province: string) => {
  CITIES_BY_PROVINCE[province] = getCitiesByProvince(province);
});

// Cuisine categories and their items
export const CUISINE_CATEGORIES: { [category: string]: string[] } = {
  "Italian": ["Pasta", "Pizza", "Risotto", "Lasagna", "Fettuccine", "Carbonara", "Margherita", "Calzone"],
  "Filipino": ["Adobo", "Sinigang", "Kare-kare", "Lechon", "Sisig", "Pancit", "Lumpia", "Halo-halo"],
  "Japanese": ["Sushi", "Sashimi", "Ramen", "Tempura", "Teriyaki", "Yakitori", "Bento", "Donburi"],
  "Chinese": ["Dim Sum", "Peking Duck", "Sweet and Sour", "Kung Pao", "General Tso's", "Chow Mein", "Wonton", "Mapo Tofu"],
  "Korean": ["Bulgogi", "Bibimbap", "Korean BBQ", "Kimchi", "Japchae", "Tteokbokki", "Galbi", "Samgyeopsal"],
  "American": ["BBQ", "Burgers", "Fried Chicken", "Steak", "Mac and Cheese", "Hot Dogs", "Wings", "Sandwiches"],
  "Seafood": ["Grilled Fish", "Shrimp", "Crab", "Lobster", "Squid", "Mussels", "Oysters", "Paella"],
  "Desserts": ["Cakes", "Ice Cream", "Pastries", "Cookies", "Donuts", "Cupcakes", "Tarts", "Mousse"],
  "Vegetarian/Vegan": ["Salads", "Veggie Burgers", "Tofu Dishes", "Falafel", "Hummus", "Buddha Bowl", "Quinoa", "Avocado Toast"],
  "Halal": ["Halal Chicken", "Halal Beef", "Lamb", "Biryani", "Kebabs", "Shawarma", "Falafel", "Tandoori"]
};

