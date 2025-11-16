import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
  subscribeToNotifications,
  Notification,
} from '../../services/notifications';

interface NotificationsDropdownProps {
  visible: boolean;
  onClose: () => void;
  userRole?: 'admin' | 'caterer' | 'customer';
  navigation?: any;
}

export default function NotificationsDropdown({
  visible,
  onClose,
  userRole = 'customer',
  navigation,
}: NotificationsDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadNotifications();
    }

    // Subscribe to real-time notifications
    const unsubscribe = subscribeToNotifications((newNotification) => {
      setNotifications(prev => [newNotification, ...prev]);
    });

    return () => {
      unsubscribe();
    };
  }, [visible]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      try {
        await markAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n => (n.id === notification.id ? { ...n, read: true } : n))
        );
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }

    // Close dropdown
    onClose();

    // Navigate based on type and related_id
    if (notification.related_id && navigation) {
      if (notification.type === 'booking' || notification.type === 'status' || notification.type === 'payment') {
        if (userRole === 'caterer') {
          // Navigate to caterer order details
          navigation.navigate('PartnerOrderDetails', {
            order: {
              id: String(notification.related_id),
              // Other required fields would need to be fetched
            },
          });
        } else if (userRole === 'customer') {
          navigation.navigate('Bookings', {
            screen: 'BookingDetails',
            params: { bookingId: notification.related_id },
          });
        }
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  const handleDeleteNotification = async (id: number, e: any) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
      Alert.alert('Error', 'Failed to delete notification');
    }
  };

  const handleClearRead = async () => {
    Alert.alert(
      'Clear Read Notifications',
      'Are you sure you want to delete all read notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAllRead();
              setNotifications(prev => prev.filter(n => !n.read));
            } catch (error) {
              console.error('Error clearing read notifications:', error);
              Alert.alert('Error', 'Failed to clear notifications');
            }
          },
        },
      ]
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking':
        return 'calendar';
      case 'payment':
        return 'card';
      case 'status':
        return 'information-circle';
      case 'review':
        return 'star';
      case 'system':
        return 'notifications';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'booking':
        return '#FF8000';
      case 'payment':
        return '#22c55e';
      case 'status':
        return '#3b82f6';
      case 'review':
        return '#f59e0b';
      case 'system':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.dropdown} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Actions */}
          {notifications.length > 0 && (
            <View style={styles.actions}>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={handleMarkAllRead} style={styles.actionButton}>
                  <Ionicons name="checkmark-done" size={16} color="#FF8000" />
                  <Text style={styles.actionText}>Mark all read</Text>
                </TouchableOpacity>
              )}
              {notifications.some(n => n.read) && (
                <TouchableOpacity onPress={handleClearRead} style={styles.actionButton}>
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  <Text style={[styles.actionText, { color: '#ef4444' }]}>Clear read</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Notifications List */}
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#FF8000" />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="notifications-off-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyText}>No notifications yet</Text>
                <Text style={styles.emptySubtext}>
                  You'll see updates about your bookings here
                </Text>
              </View>
            ) : (
              notifications.map((notification) => (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationCard,
                    !notification.read && styles.unreadCard,
                  ]}
                  onPress={() => handleNotificationPress(notification)}
                  activeOpacity={0.7}
                >
                  <View style={styles.notificationContent}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: getNotificationColor(notification.type) + '20' },
                      ]}
                    >
                      <Ionicons
                        name={getNotificationIcon(notification.type) as any}
                        size={20}
                        color={getNotificationColor(notification.type)}
                      />
                    </View>

                    <View style={styles.textContainer}>
                      <Text style={[styles.title, !notification.read && styles.unreadTitle]}>
                        {notification.title}
                      </Text>
                      <Text style={styles.message} numberOfLines={2}>
                        {notification.message}
                      </Text>
                      <Text style={styles.time}>{formatTime(notification.created_at)}</Text>
                    </View>

                    <TouchableOpacity
                      onPress={(e) => handleDeleteNotification(notification.id, e)}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="close-circle" size={18} color="#9ca3af" />
                    </TouchableOpacity>
                  </View>

                  {!notification.read && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'web' ? 60 : 80,
    paddingRight: Platform.OS === 'web' ? 20 : 16,
  },
  dropdown: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: Platform.OS === 'web' ? 420 : 360,
    maxWidth: '90%',
    maxHeight: Platform.OS === 'web' ? 600 : 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  badge: {
    backgroundColor: '#FF8000',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    marginRight: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f9fafb',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FF8000',
  },
  scrollView: {
    maxHeight: Platform.OS === 'web' ? 480 : 380,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  notificationCard: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: 'relative',
  },
  unreadCard: {
    backgroundColor: '#fef3c7',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  message: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
    marginBottom: 4,
  },
  time: {
    fontSize: 11,
    color: '#9ca3af',
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  unreadDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF8000',
  },
});

