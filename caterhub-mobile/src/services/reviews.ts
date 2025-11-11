import { supabase } from './supabase';

/**
 * Review Service
 * Handles all review-related operations
 */

export interface Review {
  id: number;
  booking_id: number;
  user_id: string;
  caterer_id: string;
  service_id: number;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewWithUser extends Review {
  users: {
    username: string;
    email: string;
  };
}

/**
 * Create a new review for a completed booking
 */
export async function createReview(
  bookingId: number,
  rating: number,
  comment: string
): Promise<Review> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Get booking details to get caterer_id and service_id
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('service_id, services:service_id(user_id)')
    .eq('id', bookingId)
    .single();

  if (bookingError) throw bookingError;
  if (!booking) throw new Error('Booking not found');

  const catererId = (booking.services as any)?.user_id;
  if (!catererId) throw new Error('Caterer not found');

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      booking_id: bookingId,
      user_id: user.id,
      caterer_id: catererId,
      service_id: booking.service_id,
      rating,
      comment,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch all reviews for a specific caterer
 */
export async function fetchCatererReviews(catererId: string): Promise<ReviewWithUser[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      users:user_id (
        username,
        email
      )
    `)
    .eq('caterer_id', catererId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Fetch review for a specific booking
 */
export async function fetchBookingReview(bookingId: number): Promise<Review | null> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('booking_id', bookingId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No review found
    throw error;
  }
  return data;
}

/**
 * Check if user has already reviewed a booking
 */
export async function hasUserReviewed(bookingId: number): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('reviews')
    .select('id')
    .eq('booking_id', bookingId)
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return !!data;
}

/**
 * Get caterer's average rating and review count
 * Calculates directly from reviews table (caterer_ratings is a view and may have RLS issues)
 */
export async function getCatererRating(catererId: string): Promise<{
  averageRating: number;
  totalReviews: number;
}> {
  // Calculate rating directly from reviews table instead of using view
  const { data, error } = await supabase
    .from('reviews')
    .select('rating')
    .eq('caterer_id', catererId);

  if (error) {
    console.warn(`[getCatererRating] Error fetching reviews for caterer ${catererId}:`, error);
    return { averageRating: 0, totalReviews: 0 };
  }

  if (!data || data.length === 0) {
    return { averageRating: 0, totalReviews: 0 };
  }

  const totalReviews = data.length;
  const sumRatings = data.reduce((sum, review) => sum + (review.rating || 0), 0);
  const averageRating = totalReviews > 0 ? sumRatings / totalReviews : 0;

  return {
    averageRating: Math.round(averageRating * 100) / 100, // Round to 2 decimal places
    totalReviews: totalReviews,
  };
}

/**
 * Update an existing review
 */
export async function updateReview(
  reviewId: number,
  rating: number,
  comment: string
): Promise<Review> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('reviews')
    .update({
      rating,
      comment,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reviewId)
    .eq('user_id', user.id) // Ensure user owns the review
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a review
 */
export async function deleteReview(reviewId: number): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId)
    .eq('user_id', user.id); // Ensure user owns the review

  if (error) throw error;
}
