import { supabase } from './supabase';

export interface Notification {
  id: number;
  user_id: string;
  title: string;
  message: string;
  type: 'booking' | 'payment' | 'status' | 'review' | 'system';
  related_id: number | null;
  read: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all notifications for the current user
 */
export async function fetchNotifications(): Promise<Notification[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Fetch unread notifications count
 */
export async function getUnreadCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false);

  if (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }
  return count || 0;
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: number): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true, updated_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) throw error;
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('notifications')
    .update({ read: true, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('read', false);

  if (error) throw error;
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: number): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) throw error;
}

/**
 * Delete all read notifications
 */
export async function deleteAllRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', user.id)
    .eq('read', true);

  if (error) throw error;
}

/**
 * Subscribe to real-time notifications
 */
export function subscribeToNotifications(
  callback: (notification: Notification) => void
) {
  const channel = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      },
      (payload) => {
        callback(payload.new as Notification);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Create a manual notification (for testing or admin use)
 */
export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: 'booking' | 'payment' | 'status' | 'review' | 'system',
  relatedId?: number
): Promise<Notification> {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      title,
      message,
      type,
      related_id: relatedId || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
