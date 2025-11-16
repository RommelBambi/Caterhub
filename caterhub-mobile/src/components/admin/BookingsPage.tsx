import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, RefreshControl, TextInput, Modal } from 'react-native';
import { supabase } from '../../services/supabase';

interface Booking {
  id: number;
  user_id: string;
  service_id: number;
  package_id: string | null;
  event_date: string;
  guests: number;
  notes: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'ON_THE_WAY' | 'DECLINED' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  updated_at: string;
  deposit_amount?: number;
  remaining_amount?: number;
  delivery_fee?: number;
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
  text: "#111827",
  textLight: "#6b7280",
  bg: "#f9fafb",
  white: "#ffffff",
  border: "#e5e7eb",
  hover: "#f3f4f6",
  success: "#22c55e",
  danger: "#ef4444",
  info: "#0ea5e9",
  warning: "#f59e0b",
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'All' | 'PENDING' | 'CONFIRMED' | 'ON_THE_WAY' | 'COMPLETED' | 'CANCELLED'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const fetchBookings = async () => {
    try {
      // Fetch bookings without services join (services table doesn't exist)
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          users:user_id (
            id,
            username,
            email
          ),
          packages:package_id (
            id,
            name,
            price,
            caterer_id
          )
        `)
        .order('created_at', { ascending: false });

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        Alert.alert('Error', `Failed to load bookings: ${bookingsError.message}`);
        setBookings([]);
        return;
      }

      // Ensure delivery_fee, deposit_amount, remaining_amount are included
      const enrichedBookingsData = (bookingsData || []).map((booking: any) => ({
        ...booking,
        delivery_fee: booking.delivery_fee || 0,
        deposit_amount: booking.deposit_amount || 0,
        remaining_amount: booking.remaining_amount || 0,
      }));

      // Fetch partner applications to get service names
      const { data: applications, error: appsError } = await supabase
        .from('partner_applications')
        .select('user_id, business_name')
        .eq('status', 'Approved');

      if (appsError) {
        console.warn('Error fetching applications:', appsError);
      }

      // Create a map of caterer_id to business_name
      const catererNameMap = new Map<string, string>();
      applications?.forEach((app: any) => {
        if (app.user_id && app.business_name) {
          catererNameMap.set(app.user_id, app.business_name);
        }
      });

      // Enrich bookings with service names from partner_applications
      const enrichedBookings = (enrichedBookingsData || []).map((booking: any) => {
        const catererId = booking.packages?.caterer_id;
        const serviceName = catererId ? (catererNameMap.get(catererId) || 'Unknown Service') : null;
        
        return {
          ...booking,
          services: serviceName ? {
            id: booking.service_id || 0,
            name: serviceName,
            price_per_head: 0, // Not available from partner_applications
          } : undefined,
        };
      });

      setBookings(enrichedBookings);
    } catch (error: any) {
      console.error('Error:', error);
      Alert.alert('Error', `Failed to load bookings: ${error?.message || 'Unknown error'}`);
      setBookings([]);
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

  const handleViewBookingDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setDetailModalVisible(true);
  };

  const filteredBookings = bookings.filter((booking) => {
    const matchesStatus = filter === 'All' || booking.status === filter;
    const matchesSearch = !searchQuery.trim()
      ? true
      : booking.users?.username.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        booking.services?.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const onTheWayCount = bookings.filter(b => b.status === 'ON_THE_WAY').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return '#1D4ED8'; // Blue
      case 'CONFIRMED': return '#22c55e'; // Green
      case 'ON_THE_WAY': return '#f59e0b'; // Yellow
      case 'CANCELLED': return '#ef4444'; // Red
      case 'DECLINED': return '#ef4444'; // Red
      case 'COMPLETED': return COLORS.info;
      default: return COLORS.textLight;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'PENDING': return '#DBEAFE'; // Blue background
      case 'CONFIRMED': return '#D1FAE5'; // Green background
      case 'ON_THE_WAY': return '#FEF3C7'; // Yellow background
      case 'CANCELLED': return '#FEE2E2'; // Red background
      case 'DECLINED': return '#FEE2E2'; // Red background
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
    // Try to get amount from deposit + remaining + delivery fee first
    if ((booking as any).deposit_amount && (booking as any).remaining_amount) {
      return ((booking as any).deposit_amount || 0) + ((booking as any).remaining_amount || 0) + ((booking as any).delivery_fee || 0);
    }
    
    // Fallback to package price calculation
    if (booking.packages?.price) {
      const priceMatch = booking.packages.price.match(/(\d+(?:,\d+)*(?:\.\d+)?)/);
      if (priceMatch) {
        const pricePerHead = parseFloat(priceMatch[1].replace(/,/g, ''));
        return pricePerHead * booking.guests;
      }
    }
    
    // Last resort: use service price_per_head if available
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
          <Text style={styles.statLabel}>On the Way</Text>
          <Text style={[styles.statValue, { color: COLORS.warning }]}>{onTheWayCount}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Completed</Text>
          <Text style={[styles.statValue, { color: COLORS.info }]}>{completedCount}</Text>
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
          {(['All', 'PENDING', 'CONFIRMED', 'ON_THE_WAY', 'COMPLETED', 'CANCELLED'] as const).map((filterOption) => (
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
                {filterOption === 'ON_THE_WAY' ? 'On The Way' : filterOption}
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
                  <View style={styles.actionButtons}>
                    <Pressable
                      style={[styles.actionButton, styles.viewButton]}
                      onPress={() => handleViewBookingDetails(booking)}
                    >
                      <Text style={styles.actionButtonText}>👁</Text>
                    </Pressable>
                    {booking.status === 'PENDING' && (
                      <>
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
                      </>
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
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Booking Details Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Booking Details</Text>
              <Pressable onPress={() => setDetailModalVisible(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>

            {selectedBooking && (
              <ScrollView style={styles.modalScrollContent}>
                {/* Booking Info */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Booking Information</Text>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Booking ID:</Text>
                    <Text style={styles.modalDetailValue}>#{selectedBooking.id}</Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Status:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusBg(selectedBooking.status) }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(selectedBooking.status) }]}>
                        {selectedBooking.status}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Event Date:</Text>
                    <Text style={styles.modalDetailValue}>{formatDate(selectedBooking.event_date)}</Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Guests:</Text>
                    <Text style={styles.modalDetailValue}>{selectedBooking.guests}</Text>
                  </View>
                  {/* Price Breakdown */}
                  <View style={[styles.modalDetailRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border }]}>
                  <Text style={styles.modalSectionTitle}>Price Breakdown</Text>
                  </View>
                  {(() => {
                    // Calculate package subtotal
                    let packageSubtotal = 0;
                    if (selectedBooking.packages?.price) {
                      const priceMatch = selectedBooking.packages.price.match(/(\d+(?:,\d+)*(?:\.\d+)?)/);
                      if (priceMatch) {
                        const pricePerHead = parseFloat(priceMatch[1].replace(/,/g, ''));
                        packageSubtotal = pricePerHead * selectedBooking.guests;
                      }
                    } else if (selectedBooking.services?.price_per_head) {
                      packageSubtotal = selectedBooking.services.price_per_head * selectedBooking.guests;
                    }
                    const deliveryFee = selectedBooking.delivery_fee || 0;
                    const total = packageSubtotal + deliveryFee;

                    return (
                      <>
                        <View style={styles.modalDetailRow}>
                          <Text style={styles.modalDetailLabel}>Package Subtotal:</Text>
                          <Text style={styles.modalDetailValue}>₱{packageSubtotal.toLocaleString()}</Text>
                        </View>
                        {deliveryFee > 0 && (
                          <View style={styles.modalDetailRow}>
                            <Text style={styles.modalDetailLabel}>Delivery Fee:</Text>
                            <Text style={styles.modalDetailValue}>₱{deliveryFee.toLocaleString()}</Text>
                          </View>
                        )}
                        <View style={[styles.modalDetailRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border }]}>
                          <Text style={[styles.modalDetailLabel, { fontWeight: '600', fontSize: 16 }]}>Total Amount:</Text>
                          <Text style={[styles.modalDetailValue, { fontWeight: '700', fontSize: 18 }]}>₱{total.toLocaleString()}</Text>
                        </View>
                      </>
                    );
                  })()}
                </View>

                {/* Customer Info */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Customer Information</Text>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Name:</Text>
                    <Text style={styles.modalDetailValue}>{selectedBooking.users?.username || 'Unknown'}</Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Email:</Text>
                    <Text style={styles.modalDetailValue}>{selectedBooking.users?.email || 'N/A'}</Text>
                  </View>
                </View>

                {/* Service Info */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Service Information</Text>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Service:</Text>
                    <Text style={styles.modalDetailValue}>{selectedBooking.services?.name || 'N/A'}</Text>
                  </View>
                </View>

                {/* Selected Menu or Package */}
                {(() => {
                  // Parse notes to extract selected menu items
                  let menuItems: Array<{ categoryName: string; optionName: string }> = [];
                  let packageName: string | null = null;
                  
                  if (selectedBooking.notes) {
                    try {
                      const notesData = JSON.parse(selectedBooking.notes);
                      if (notesData.picks && Array.isArray(notesData.picks)) {
                        menuItems = notesData.picks.map((p: any) => ({
                          categoryName: p.categoryName || p.sectionLabel || 'Category',
                          optionName: p.optionName || p.chosenDish || 'Option',
                        }));
                      }
                    } catch (e) {
                      // If notes is not JSON, treat as plain text
                    }
                  }
                  
                  if (selectedBooking.packages) {
                    packageName = selectedBooking.packages.name;
                  }

                  if (menuItems.length > 0 || packageName) {
                    return (
                      <View style={styles.modalSection}>
                        <Text style={styles.modalSectionTitle}>Selected Menu or Package</Text>
                        {packageName && (
                          <View style={styles.menuTableRow}>
                            <Text style={[styles.menuTableHeader, { flex: 1 }]}>Package:</Text>
                            <Text style={[styles.menuTableValue, { flex: 2 }]}>{packageName}</Text>
                          </View>
                        )}
                        {menuItems.length > 0 && (
                          <>
                            <View style={[styles.menuTableRow, { backgroundColor: COLORS.bg, paddingVertical: 8, marginTop: packageName ? 12 : 0 }]}>
                              <Text style={[styles.menuTableHeader, { flex: 1 }]}>Category</Text>
                              <Text style={[styles.menuTableHeader, { flex: 2 }]}>Selected Option</Text>
                            </View>
                            {menuItems.map((item, index) => (
                              <View key={index} style={[styles.menuTableRow, { borderBottomWidth: index < menuItems.length - 1 ? 1 : 0, borderBottomColor: COLORS.border, paddingVertical: 8 }]}>
                                <Text style={[styles.menuTableValue, { flex: 1 }]}>{item.categoryName}</Text>
                                <Text style={[styles.menuTableValue, { flex: 2 }]}>{item.optionName}</Text>
                              </View>
                            ))}
                          </>
                        )}
                      </View>
                    );
                  }
                  return null;
                })()}

                {/* Dates */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Timestamps</Text>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Created:</Text>
                    <Text style={styles.modalDetailValue}>{formatDate(selectedBooking.created_at)}</Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Last Updated:</Text>
                    <Text style={styles.modalDetailValue}>{formatDate(selectedBooking.updated_at)}</Text>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  viewButton: {
    backgroundColor: COLORS.textLight,
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 12,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: COLORS.text,
    fontWeight: '600',
  },
  modalScrollContent: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  modalDetailRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  modalDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    width: 120,
  },
  modalDetailValue: {
    fontSize: 14,
    color: COLORS.textLight,
    flex: 1,
  },
  modalNotesText: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
    padding: 12,
    backgroundColor: COLORS.bg,
    borderRadius: 8,
  },
  menuTableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  menuTableHeader: {
    fontWeight: '600',
    fontSize: 13,
    color: COLORS.text,
  },
  menuTableValue: {
    fontSize: 14,
    color: COLORS.text,
  },
});
