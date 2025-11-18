import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUnreadCount, subscribeToNotifications } from '../../services/notifications';
import NotificationsDropdown from './NotificationsDropdown';
import { useAuth } from '../../store/auth';
import { supabase } from '../../services/supabase';

interface NotificationBellProps {
  color?: string;
  size?: number;
  userRole?: 'admin' | 'caterer' | 'customer';
  navigation?: any;
}

export default function NotificationBell({ 
  color = '#111827', 
  size = 24,
  userRole = 'customer',
  navigation,
}: NotificationBellProps) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    // Load initial count
    loadUnreadCount();

    // Subscribe to real-time notifications changes
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`, // Only listen to notifications for this user
        },
        (payload) => {
          console.log('[NotificationBell] Notification change detected:', payload.eventType);
          // Reload count when any notification changes
          loadUnreadCount();
        }
      )
      .subscribe();

    // Also use the existing subscription for backward compatibility
    const unsubscribe = subscribeToNotifications(() => {
      loadUnreadCount();
    });

    return () => {
      supabase.removeChannel(channel);
      unsubscribe();
    };
  }, [user?.id, loadUnreadCount]);

  // Refresh count when dropdown closes (in case notifications were marked as read)
  const handleClose = () => {
    setDropdownVisible(false);
    // Small delay to ensure database updates are complete
    setTimeout(() => {
      loadUnreadCount();
    }, 300);
  };

  const handlePress = () => {
    setDropdownVisible(true);
  };

  return (
    <>
      <TouchableOpacity onPress={handlePress} style={styles.container} activeOpacity={0.7}>
        <Ionicons name={unreadCount > 0 ? 'notifications' : 'notifications-outline'} size={size} color={color} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
      <NotificationsDropdown
        visible={dropdownVisible}
        onClose={handleClose}
        userRole={userRole}
        navigation={navigation}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
