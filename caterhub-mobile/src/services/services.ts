
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
};




export async function fetchServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data || [];
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


export async function fetchService(id: number): Promise<Service> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) throw error;
  
  // For now, we'll add mock packages since we don't have a packages table yet
  const withMock: Service = {
    ...data,
    packages: [
      {
        id: 'p1',
        name: 'Package 1',
        pricePerHead: data.price_per_head || 250,
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


export async function createBooking(payload: {
  serviceId: number;
  eventDate: string;   
  guests: number;
  notes?: string;      
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
      status: 'PENDING',
    })
    .select()
    .single();
    
  if (error) throw error;
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
