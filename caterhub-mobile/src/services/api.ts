import axios from "axios";
export const api = axios.create({ baseURL: "http://10.0.2.2:5000/api" });
// src/services/api.ts
export async function fetchBookingDetails(bookingId: number) {
  try {
    const response = await api.get(`/bookings/${bookingId}`);
    return response.data;  // Ensure this is the correct API path
  } catch (error) {
    console.error('Error fetching booking details:', error);
    throw error;
  }
}
export async function cancelBooking(bookingId: number) {
  const { data } = await api.patch(`/bookings/${bookingId}`, { status: 'CANCELLED' });
  return data;
}