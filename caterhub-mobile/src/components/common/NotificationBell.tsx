import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUnreadCount, subscribeToNotifications } from '../../services/notifications';
import NotificationsDropdown from './NotificationsDropdown';

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
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  useEffect(() => {
    loadUnreadCount();

    // Subscribe to new notifications
    const unsubscribe = subscribeToNotifications(() => {
      loadUnreadCount();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadUnreadCount = async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
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
        onClose={() => setDropdownVisible(false)}
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
