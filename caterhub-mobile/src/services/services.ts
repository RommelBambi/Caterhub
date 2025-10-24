
import { api } from './api';



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
};




export async function fetchServices(): Promise<Service[]> {
  const { data } = await api.get('/services');
  
  return data;
}


export async function fetchTopServices(by: 'likes' | 'bookings', limit = 8): Promise<Service[]> {
  const { data } = await api.get(`/services/top?by=${by}&limit=${limit}`);
  return data;
}


export async function fetchService(id: number): Promise<Service> {
  const { data } = await api.get(`/services/${id}`);

  
  if (!data.packages || data.packages.length === 0) {
    const withMock: Service = {
      ...data,
      packages: [
        {
          id: 'p1',
          name: 'Package 1',
          pricePerHead: 250,
          categories: [
            { id: 'rice', name: 'Plain Rice', options: [{ id: 'plain', name: 'Plain Rice' }], required: true, pick: 1 },
            {
              id: 'chicken',
              name: 'Choice of Chicken Dish',
              required: true,
              pick: 1,
              options: [
                { id: 'ch1', name: 'Fried Chicken' },
                { id: 'ch2', name: 'Chicken Afritada' },
                { id: 'ch3', name: 'Chicken Teriyaki' },
              ],
            },
            {
              id: 'pork',
              name: 'Choice of Pork Dish',
              required: true,
              pick: 1,
              options: [
                { id: 'pk1', name: 'Pork Menudo' },
                { id: 'pk2', name: 'Pork BBQ' },
                { id: 'pk3', name: 'Sweet & Sour Pork' },
              ],
            },
            {
              id: 'veggies',
              name: 'Choice of Veggies Dish',
              required: true,
              pick: 1,
              options: [
                { id: 'vg1', name: 'Chopsuey' },
                { id: 'vg2', name: 'Pinakbet' },
                { id: 'vg3', name: 'Buttered Vegetables' },
              ],
            },
            {
              id: 'fish',
              name: 'Choice of Fish Dish',
              required: false,
              pick: 1,
              options: [
                { id: 'fs1', name: 'Fish Fillet w/ Tartar' },
                { id: 'fs2', name: 'Sweet & Sour Fish' },
              ],
            },
            {
              id: 'dessert',
              name: 'Choice of Dessert Dish',
              required: true,
              pick: 1,
              options: [
                { id: 'ds1', name: 'Leche Flan' },
                { id: 'ds2', name: 'Buko Pandan' },
                { id: 'ds3', name: 'Maja Blanca' },
              ],
            },
            {
              id: 'juice',
              name: 'Choice of Juice',
              required: true,
              pick: 1,
              options: [
                { id: 'jc1', name: 'Iced Tea' },
                { id: 'jc2', name: 'Orange' },
                { id: 'jc3', name: 'Pineapple' },
              ],
            },
          ],
        },
      ],
    };
    return withMock;
  }

  return data;
}


export async function createBooking(payload: {
  serviceId: number;
  eventDate: string;   
  guests: number;
  notes?: string;      
}) {
  const { data } = await api.post('/bookings', payload);
  return data;
}

export async function fetchMyBookings() {
  const { data } = await api.get('/bookings/me');
  return data;
}


export async function getMyFavorites(): Promise<number[]> {
  const { data } = await api.get('/favorites/me');
  
  return (data ?? []).map((s: any) => Number(s.id));
}

export async function addFavorite(serviceId: number) {
  await api.post(`/favorites/${serviceId}`);
}
export async function removeFavorite(serviceId: number) {
  await api.delete(`/favorites/${serviceId}`);
}
