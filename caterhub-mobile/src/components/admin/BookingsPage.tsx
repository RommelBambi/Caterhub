import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, RefreshControl, TextInput } from 'react-native';
import { supabase } from '../../services/supabase';

interface Booking {
  id: number;
  user_id: string;
  service_id: number;
  package_id: string | null;
  event_date: string;
  guests: number;
  notes: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  updated_at: string;
  services?: {
    id: number;
    name: string;
    price_per_head: number;
  };
  users?: {
    id: string;
    username: string;
    email: string;
  };
  packages?: {
    id: string;
    name: string;
    price: string;
  };
}

const COLORS = {
  primary: "#FF8000",
  text: "#1e293b",
  textLight: "#64748b",
  bg: "#f8fafc",
  white: "#ffffff",
  border: "#e2e8f0",
  hover: "#f1f5f9",
  success: "#22c55e",
  danger: "#dc2626",
  info: "#0ea5e9",
  warning: "#f59e0b",
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'All' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          services:service_id (
            id,
            name,
            price_per_head
          ),
          users:user_id (
            id,
            username,
            email
          ),
          packages:package_id (
            id,
            name,
            price
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bookings:', error);
        Alert.alert('Error', 'Failed to load bookings');
        return;
      }

      setBookings(data || []);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to load bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const updateBookingStatus = async (bookingId: number, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', bookingId);

      if (error) throw error;
      
      Alert.alert('Success', `Booking status updated to ${newStatus}`);
      fetchBookings();
    } catch (error: any) {
      console.error('Error updating booking:', error);
      Alert.alert('Error', error?.message || 'Failed to update booking');
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    const matchesStatus = filter === 'All' || booking.status === filter;
    const matchesSearch = !searchQuery.trim()
      ? true
      : booking.users?.username.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        booking.services?.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return COLORS.success;
      case 'CANCELLED': return COLORS.danger;
      case 'DECLINED': return COLORS.danger;
      case 'PENDING': return COLORS.warning;
      case 'COMPLETED': return COLORS.info;
      default: return COLORS.textLight;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return COLORS.success + '15';
      case 'CANCELLED': return COLORS.danger + '15';
      case 'DECLINED': return COLORS.danger + '15';
      case 'PENDING': return COLORS.warning + '15';
      case 'COMPLETED': return COLORS.info + '15';
      default: return COLORS.bg;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateTotal = (booking: Booking) => {
    if (booking.packages?.price) {
      const priceMatch = booking.packages.price.match(/(\d+(?:,\d+)*(?:\.\d+)?)/);
      if (priceMatch) {
        return parseFloat(priceMatch[1].replace(/,/g, ''));
      }
    }
    const pricePerHead = booking.services?.price_per_head || 0;
    return pricePerHead * booking.guests;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading bookings...</Text>
      </View>
    );
  }

  const pendingCount = bookings.filter(b => b.status === 'PENDING').length;
  const confirmedCount = bookings.filter(b => b.status === 'CONFIRMED').length;
  const completedCount = bookings.filter(b => b.status === 'COMPLETED').length;
  const totalRevenue = bookings
    .filter(b => b.status === 'COMPLETED')
    .reduce((sum, b) => sum + calculateTotal(b), 0);

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>Bookings Management</Text>
      
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Bookings</Text>
          <Text style={[styles.statValue, { color: COLORS.text }]}>{bookings.length}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Pending</Text>
          <Text style={[styles.statValue, { color: COLORS.warning }]}>{pendingCount}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Confirmed</Text>
          <Text style={[styles.statValue, { color: COLORS.success }]}>{confirmedCount}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Completed</Text>
          <Text style={[styles.statValue, { color: COLORS.info }]}>{completedCount}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Revenue (Completed)</Text>
          <Text style={[styles.statValue, { color: COLORS.success }]}>₱{totalRevenue.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.toolbar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by customer or service"
          placeholderTextColor={COLORS.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <View style={styles.filterGroup}>
          {(['All', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const).map((filterOption) => (
            <Pressable
              key={filterOption}
              style={[
                styles.filterButton,
                filter === filterOption && styles.filterButtonActive,
              ]}
              onPress={() => setFilter(filterOption)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filter === filterOption && styles.filterButtonTextActive,
                ]}
              >
                {filterOption}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.tableWrapper}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.colId]}>ID</Text>
            <Text style={[styles.headerCell, styles.colCustomer]}>Customer</Text>
            <Text style={[styles.headerCell, styles.colService]}>Service</Text>
            <Text style={[styles.headerCell, styles.colDate]}>Event Date</Text>
            <Text style={[styles.headerCell, styles.colGuests]}>Guests</Text>
            <Text style={[styles.headerCell, styles.colTotal]}>Total</Text>
            <Text style={[styles.headerCell, styles.colStatus]}>Status</Text>
            <Text style={[styles.headerCell, styles.colActions]}>Actions</Text>
          </View>

          {filteredBookings.length === 0 ? (
            <View style={styles.emptyStateRow}>
              <Text style={styles.emptyStateText}>
                {searchQuery.trim()
                  ? 'No matches found'
                  : filter === 'All'
                    ? 'No bookings found'
                    : `No ${filter.toLowerCase()} bookings`}
              </Text>
            </View>
          ) : (
            filteredBookings.map((booking) => (
              <View key={booking.id} style={styles.tableRow}>
                <Text style={[styles.cellText, styles.colId]}>#{booking.id}</Text>
                <View style={[styles.cell, styles.colCustomer]}>
                  <Text style={styles.cellTextBold} numberOfLines={1}>
                    {booking.users?.username || 'Unknown'}
                  </Text>
                  <Text style={styles.cellTextSmall} numberOfLines={1}>
                    {booking.users?.email || 'N/A'}
                  </Text>
                </View>
                <View style={[styles.cell, styles.colService]}>
                  <Text style={styles.cellTextBold} numberOfLines={1}>
                    {booking.services?.name || 'N/A'}
                  </Text>
                  {booking.packages && (
                    <Text style={styles.cellTextSmall} numberOfLines={1}>
                      📦 {booking.packages.name}
                    </Text>
                  )}
                </View>
                <Text style={[styles.cellText, styles.colDate]} numberOfLines={2}>
                  {formatDate(booking.event_date)}
                </Text>
                <Text style={[styles.cellText, styles.colGuests]}>{booking.guests}</Text>
                <Text style={[styles.cellText, styles.colTotal]}>
                  ₱{calculateTotal(booking).toLocaleString()}
                </Text>
                <View style={[styles.cell, styles.colStatus]}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusBg(booking.status) }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                      {booking.status}
                    </Text>
                  </View>
                </View>
                <View style={[styles.cell, styles.colActions]}>
                  {booking.status === 'PENDING' && (
                    <View style={styles.actionButtons}>
                      <Pressable
                        style={[styles.actionButton, styles.confirmButton]}
                        onPress={() => updateBookingStatus(booking.id, 'CONFIRMED')}
                      >
                        <Text style={styles.actionButtonText}>✓</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.actionButton, styles.declineButton]}
                        onPress={() => updateBookingStatus(booking.id, 'DECLINED')}
                      >
                        <Text style={styles.actionButtonText}>✕</Text>
                      </Pressable>
                    </View>
                  )}
                  {booking.status === 'CONFIRMED' && (
                    <Pressable
                      style={[styles.actionButton, styles.completeButton]}
                      onPress={() => updateBookingStatus(booking.id, 'COMPLETED')}
                    >
                      <Text style={styles.actionButtonText}>Complete</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 24,
    color: COLORS.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.textLight,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  searchInput: {
    flexGrow: 1,
    minWidth: 200,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  filterGroup: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
  },
  filterButtonTextActive: {
    color: COLORS.white,
  },
  tableWrapper: {
    flex: 1,
  },
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.hover,
  },
  headerCell: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontWeight: '700',
    fontSize: 12,
    color: COLORS.text,
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  cell: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  cellText: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    color: COLORS.text,
    fontSize: 13,
  },
  cellTextBold: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  cellTextSmall: {
    color: COLORS.textLight,
    fontSize: 11,
    marginTop: 2,
  },
  colId: { width: 70 },
  colCustomer: { flex: 1.5, minWidth: 140 },
  colService: { flex: 1.5, minWidth: 140 },
  colDate: { flex: 1.2, minWidth: 120 },
  colGuests: { width: 70, textAlign: 'center' },
  colTotal: { width: 100, textAlign: 'right' },
  colStatus: { width: 110 },
  colActions: { width: 120 },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  emptyStateRow: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    color: COLORS.textLight,
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
  },
  confirmButton: {
    backgroundColor: COLORS.success,
  },
  declineButton: {
    backgroundColor: COLORS.danger,
  },
  completeButton: {
    backgroundColor: COLORS.info,
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 12,
  },
});
