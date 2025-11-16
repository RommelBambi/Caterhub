import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, Pressable } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { PartnerStackParamList } from "../../navigation/caterer/PartnerNav";
import { useAuth } from "../../store/auth";
import { isWeb } from "../../utils/platform";
import { supabase } from "../../services/supabase";
import { COLORS } from "../../constants/colors";

import Sidebar from "../../components/caterer/Sidebar";
import TopBar from "../../components/caterer/TopBar";
import BottomNav from "../../components/caterer/BottomNav";
import BookingList, { Booking } from "../../components/caterer/BookingList";

export default function PartnerDashboardScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<PartnerStackParamList>>();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState([
    { label: "New Orders (7d)", value: "0", sub: "Last 7 days" },
    { label: "Revenue (₱)", value: "0", sub: "Last 30 days" },
    { label: "Pending Orders", value: "0", sub: "Awaiting action" }
  ]);

  // Fetch bookings and calculate KPIs
  const fetchDashboardData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get packages for this caterer
      const { data: packages, error: packagesError } = await supabase
        .from('packages')
        .select('id')
        .eq('caterer_id', user.id)
        .eq('is_active', true);

      const packageIds = packages?.map(p => p.id) || [];

      // Services table no longer exists - only use packages
      if (packageIds.length === 0) {
        setBookings([]);
        setKpis([
          { label: "New Orders (7d)", value: "0", sub: "Last 7 days" },
          { label: "Revenue (₱)", value: "0", sub: "Last 30 days" },
          { label: "Pending Orders", value: "0", sub: "Awaiting action" }
        ]);
        setLoading(false);
        return;
      }

      // Fetch all bookings for this caterer (services table no longer exists)
      let bookingsQuery = supabase
        .from('bookings')
        .select(`
          *,
          packages:package_id (
            id,
            name,
            price,
            caterer_id
          ),
          customer:user_id (
            id,
            username,
            email
          )
        `)
        .order('created_at', { ascending: false });

      // Filter by package_id only (services table deleted)
      if (packageIds.length > 0) {
        bookingsQuery = bookingsQuery.in('package_id', packageIds);
      }

      const { data: allBookings, error } = await bookingsQuery;

      if (error) {
        console.error('Error fetching bookings:', error);
        setLoading(false);
        return;
      }

      // Fetch customer data if missing
      const bookingsWithCustomers = await Promise.all(
        (allBookings || []).map(async (booking: any) => {
          if (booking.customer) {
            return booking;
          }

          const { data: customerData } = await supabase
            .from('users')
            .select('id, username, email')
            .eq('id', booking.user_id)
            .single();

          return {
            ...booking,
            customer: customerData || {
              id: booking.user_id,
              username: 'Unknown Customer',
              email: 'N/A',
            },
          };
        })
      );

      // Calculate date ranges
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Calculate KPIs
      let newOrders7d = 0;
      let revenue30d = 0;
      let pendingCount = 0;

      bookingsWithCustomers.forEach((booking: any) => {
        const bookingDate = new Date(booking.created_at);
        
        // New orders in last 7 days
        if (bookingDate >= sevenDaysAgo) {
          newOrders7d++;
        }

        // Revenue in last 30 days (only confirmed/completed bookings)
        if (bookingDate >= thirtyDaysAgo && (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED')) {
          let amount = 0;
          if (booking.packages && booking.packages.price) {
            // Parse price (may contain commas) and multiply by guests
            const priceStr = booking.packages.price.toString().replace(/,/g, '');
            amount = (parseFloat(priceStr) || 0) * (booking.guests || 0);
          }
          revenue30d += amount;
        }

        // Pending orders
        if (booking.status === 'PENDING') {
          pendingCount++;
        }
      });

      // Transform bookings to Booking format (show only 3 most recent)
      const recentBookings: Booking[] = bookingsWithCustomers
        .slice(0, 3)
        .map((booking: any) => {
          const eventDate = new Date(booking.event_date);
          const formattedDate = eventDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });

          let total = "₱0";
          if (booking.packages && booking.packages.price) {
            // Parse price (may contain commas) and multiply by guests
            const priceStr = booking.packages.price.toString().replace(/,/g, '');
            const amount = (parseFloat(priceStr) || 0) * (booking.guests || 0);
            total = `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          }

          // Map status
          let status: "pending" | "accepted" | "declined" | "refunded" = "pending";
          if (booking.status === 'CONFIRMED') status = "accepted";
          else if (booking.status === 'DECLINED') status = "declined";
          else if (booking.status === 'CANCELLED') status = "refunded";
          else if (booking.status === 'PENDING') status = "pending";

          return {
            id: `ORD-${booking.id}`,
            client: booking.customer?.username || 'Unknown Customer',
            date: formattedDate,
            headcount: booking.guests || 0,
            status,
            total,
            bookingId: booking.id // Store the database booking ID for navigation
          };
        });

      setBookings(recentBookings);
      setKpis([
        { 
          label: "New Orders (7d)", 
          value: String(newOrders7d), 
          sub: "Last 7 days" 
        },
        { 
          label: "Revenue (₱)", 
          value: revenue30d.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
          sub: "Last 30 days" 
        },
        { 
          label: "Pending Orders", 
          value: String(pendingCount), 
          sub: "Awaiting action" 
        }
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount and when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      fetchDashboardData();
    }, [user])
  );

  if (!user) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={{ color: "#6b6b6b" }}>Loading dashboard…</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        {isWeb && <Sidebar />}
        <View style={styles.mainArea}>
          <TopBar title="Dashboard" />
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#FF8000" />
            <Text style={{ color: "#6b6b6b", marginTop: 12 }}>Loading dashboard…</Text>
          </View>
        </View>
        {!isWeb && <BottomNav />}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {isWeb && <Sidebar />}

      <View style={styles.mainArea}>
        <TopBar title="Dashboard" />

        <ScrollView
          style={styles.scrollRegion}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.dashboardContainer}>
            {/* Welcome Header */}
            <View style={styles.welcomeSection}>
              <View>
                <Text style={styles.welcomeTitle}>Welcome back, {user.username || 'Partner'}!</Text>
                <Text style={styles.welcomeSubtitle}>
                  Here's your business overview today
                </Text>
              </View>
              <View style={styles.dateBadge}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                <Text style={styles.dateText}>
                  {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, styles.statCardPrimary]}>
                <View style={styles.statCardHeader}>
                  <View style={[styles.statIconContainer, { backgroundColor: COLORS.primary + '15' }]}>
                    <Ionicons name="receipt" size={24} color={COLORS.primary} />
                  </View>
                  <Ionicons name="trending-up-outline" size={16} color={COLORS.success} />
                </View>
                <Text style={styles.statLabel}>New Orders (7d)</Text>
                <Text style={[styles.statValue, { color: COLORS.primary }]}>
                  {kpis[0]?.value || '0'}
                </Text>
                <Text style={styles.statSub}>Last 7 days</Text>
              </View>

              <View style={[styles.statCard, styles.statCardSuccess]}>
                <View style={styles.statCardHeader}>
                  <View style={[styles.statIconContainer, { backgroundColor: COLORS.success + '15' }]}>
                    <Ionicons name="cash" size={24} color={COLORS.success} />
                  </View>
                  <Ionicons name="trending-up-outline" size={16} color={COLORS.success} />
                </View>
                <Text style={styles.statLabel}>Revenue (₱)</Text>
                <Text style={[styles.statValue, { color: COLORS.success }]}>
                  {kpis[1]?.value ? `₱${kpis[1].value}` : '₱0'}
                </Text>
                <Text style={styles.statSub}>Last 30 days</Text>
              </View>

              <View style={[styles.statCard, styles.statCardWarning]}>
                <View style={styles.statCardHeader}>
                  <View style={[styles.statIconContainer, { backgroundColor: '#f59e0b15' }]}>
                    <Ionicons name="time" size={24} color="#f59e0b" />
                  </View>
                  <Ionicons name="alert-circle-outline" size={16} color="#f59e0b" />
                </View>
                <Text style={styles.statLabel}>Pending Orders</Text>
                <Text style={[styles.statValue, { color: '#f59e0b' }]}>
                  {kpis[2]?.value || '0'}
                </Text>
                <Text style={styles.statSub}>Awaiting action</Text>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActionsSection}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.quickActionsGrid}>
                <Pressable 
                  style={({ pressed }) => [
                    styles.quickActionCard,
                    pressed && styles.quickActionCardPressed
                  ]}
                  onPress={() => navigation.navigate("PartnerOrders")}
                >
                  <View style={[styles.quickActionIconContainer, { backgroundColor: COLORS.primary + '10' }]}>
                    <Ionicons name="list" size={28} color={COLORS.primary} />
                  </View>
                  <Text style={styles.quickActionLabel}>View All Orders</Text>
                </Pressable>
                <Pressable 
                  style={({ pressed }) => [
                    styles.quickActionCard,
                    pressed && styles.quickActionCardPressed
                  ]}
                  onPress={() => navigation.navigate("PartnerManagePackages")}
                >
                  <View style={[styles.quickActionIconContainer, { backgroundColor: COLORS.success + '10' }]}>
                    <Ionicons name="restaurant" size={28} color={COLORS.success} />
                  </View>
                  <Text style={styles.quickActionLabel}>Manage Packages</Text>
                </Pressable>
                <Pressable 
                  style={({ pressed }) => [
                    styles.quickActionCard,
                    pressed && styles.quickActionCardPressed
                  ]}
                  onPress={() => navigation.navigate("PartnerWallet")}
                >
                  <View style={[styles.quickActionIconContainer, { backgroundColor: COLORS.info + '10' }]}>
                    <Ionicons name="wallet" size={28} color={COLORS.info} />
                  </View>
                  <Text style={styles.quickActionLabel}>View Wallet</Text>
                </Pressable>
                <Pressable 
                  style={({ pressed }) => [
                    styles.quickActionCard,
                    pressed && styles.quickActionCardPressed
                  ]}
                  onPress={() => navigation.navigate("PartnerSettings")}
                >
                  <View style={[styles.quickActionIconContainer, { backgroundColor: '#6b728010' }]}>
                    <Ionicons name="settings" size={28} color="#6b7280" />
                  </View>
                  <Text style={styles.quickActionLabel}>Settings</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Recent Orders */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Recent Orders</Text>
              <Text style={styles.smallMuted}>
                {bookings.length > 0 ? `${bookings.length} latest` : 'No orders yet'}
              </Text>
            </View>
            {bookings.length > 0 ? (
              <BookingList 
                data={bookings} 
                onDetailsPress={async (booking) => {
                  // Fetch full booking data and navigate to details
                  if (booking.bookingId) {
                    try {
                      const { data: bookingData, error } = await supabase
                        .from('bookings')
                        .select(`
                          *,
                          packages:package_id (
                            id,
                            name,
                            price,
                            caterer_id
                          ),
                          customer:user_id (
                            id,
                            username,
                            email
                          )
                        `)
                        .eq('id', booking.bookingId)
                        .single();

                      if (error || !bookingData) {
                        console.error('Error fetching booking details:', error);
                        return;
                      }

                      // Transform to Order format expected by PartnerOrderDetails
                      const order = {
                        id: bookingData.id,
                        bookingId: `ORD-${bookingData.id}`,
                        customerName: bookingData.customer?.username || 'Unknown Customer',
                        customerEmail: bookingData.customer?.email || '',
                        customerId: bookingData.user_id || '',
                        serviceName: bookingData.packages?.name || 'N/A',
                        packageName: bookingData.packages?.name,
                        packagePrice: bookingData.packages?.price ? (() => {
                          const priceStr = bookingData.packages.price.toString().replace(/,/g, '');
                          const amount = (parseFloat(priceStr) || 0) * (bookingData.guests || 0);
                          return `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                        })() : undefined,
                        selectedDishes: [], // Will be populated from booking data if available
                        venue: bookingData.address || '', // Use address from booking
                        inclusions: [], // Will be populated from booking data if available
                        status: bookingData.status as "PENDING" | "CONFIRMED" | "DECLINED" | "COMPLETED" | "CANCELLED",
                        eventDate: bookingData.event_date,
                        guests: bookingData.guests || 0,
                        totalPrice: bookingData.packages?.price ? (() => {
                          const priceStr = bookingData.packages.price.toString().replace(/,/g, '');
                          const amount = (parseFloat(priceStr) || 0) * (bookingData.guests || 0);
                          return `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                        })() : '₱0',
                        notes: bookingData.notes || undefined,
                        // Payment fields
                        deposit_amount: bookingData.deposit_amount,
                        remaining_amount: bookingData.remaining_amount,
                        deposit_paid: bookingData.deposit_paid,
                        remaining_paid: bookingData.remaining_paid,
                        remaining_paid_method: bookingData.remaining_paid_method,
                        payment_method: bookingData.payment_method,
                        payment_status: bookingData.payment_status,
                        delivery_fee: bookingData.delivery_fee || 0
                      };

                      navigation.navigate("PartnerOrderDetails", { order } as any);
                    } catch (error) {
                      console.error('Error navigating to order details:', error);
                    }
                  } else {
                    // Fallback: navigate to orders screen
                    navigation.navigate("PartnerOrders");
                  }
                }}
              />
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No recent orders</Text>
                <Text style={styles.emptyStateSubtext}>
                  New bookings will appear here once customers place orders.
                </Text>
              </View>
            )}
          </View>

          {/* Footer */}
          {isWeb && (
            <View style={styles.footerArea}>
              <Text style={styles.footerText}>© 2025 CaterHub • Partner</Text>
            </View>
          )}
        </ScrollView>
      </View>
      {!isWeb && <BottomNav />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    flexDirection: Platform.OS === 'web' ? "row" : "column",
    backgroundColor: "#f9fafb"
  },
  mainArea: {
    flex: 1,
    backgroundColor: "#f9fafb"
  },
  scrollRegion: {
    flex: 1
  },
  scrollContent: {
    padding: Platform.OS === 'web' ? 16 : 12,
    paddingBottom: Platform.OS === 'web' ? 16 : 100 // Space for bottom nav on mobile
  },
  dashboardContainer: {
    width: '100%'
  },
  welcomeSection: {
    flexDirection: Platform.OS === 'web' ? "row" : "column",
    justifyContent: "space-between",
    alignItems: Platform.OS === 'web' ? "center" : "flex-start",
    marginBottom: 24,
    gap: 16
  },
  welcomeTitle: {
    fontSize: Platform.OS === 'web' ? 28 : 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4
  },
  welcomeSubtitle: {
    color: "#6b7280",
    fontSize: Platform.OS === 'web' ? 15 : 14
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb"
  },
  dateText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151"
  },
  pageHeaderRow: {
    flexDirection: Platform.OS === 'web' ? "row" : "column",
    justifyContent: Platform.OS === 'web' ? "space-between" : "flex-start",
    alignItems: Platform.OS === 'web' ? "flex-start" : "flex-start",
    marginBottom: 16,
    gap: Platform.OS === 'web' ? 0 : 12
  },
  pageHeaderLeft: {
    flex: 1
  },
  pageTitle: {
    fontSize: Platform.OS === 'web' ? 24 : 22,
    fontWeight: "700",
    color: "#111827"
  },
  pageSubTitle: {
    color: "#6b7280",
    fontSize: Platform.OS === 'web' ? 14 : 13,
    marginTop: 4
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 32
  },
  statCard: {
    flex: Platform.OS === 'web' ? 1 : 0,
    flexBasis: Platform.OS === 'web' ? 'auto' : '48%',
    minWidth: Platform.OS === 'web' ? 240 : '48%',
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f3f4f6"
  },
  statCardPrimary: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary
  },
  statCardSuccess: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success
  },
  statCardWarning: {
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b'
  },
  statCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center"
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  statValue: {
    fontSize: Platform.OS === 'web' ? 32 : 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4
  },
  statSub: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4
  },
  quickActionsSection: {
    marginTop: 8,
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  quickActionCard: {
    flex: Platform.OS === 'web' ? 0 : 1,
    flexBasis: Platform.OS === 'web' ? 'auto' : '48%',
    minWidth: Platform.OS === 'web' ? 180 : '48%',
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 12
  },
  quickActionCardPressed: {
    backgroundColor: "#f9fafb",
    transform: [{ scale: 0.98 }]
  },
  quickActionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center"
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: Platform.OS === 'web' ? 8 : 12,
    padding: Platform.OS === 'web' ? 16 : 12,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: Platform.OS === 'web' ? 10 : 2 },
    shadowOpacity: 0.05,
    shadowRadius: Platform.OS === 'web' ? 20 : 4,
    elevation: 2
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    alignItems: "center"
  },
  sectionTitle: {
    fontSize: Platform.OS === 'web' ? 16 : 18,
    fontWeight: "700",
    color: "#111827"
  },
  smallMuted: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500"
  },
  footerArea: {
    alignItems: "center",
    marginTop: 16,
    paddingBottom: 40
  },
  footerText: {
    fontSize: 12,
    color: "#6b7280"
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff"
  },
  emptyState: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyStateText: {
    fontSize: Platform.OS === 'web' ? 16 : 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8
  },
  emptyStateSubtext: {
    fontSize: Platform.OS === 'web' ? 14 : 15,
    color: "#6b7280",
    textAlign: "center"
  }
});

