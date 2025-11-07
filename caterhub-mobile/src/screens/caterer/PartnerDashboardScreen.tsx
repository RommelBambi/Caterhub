import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { PartnerStackParamList } from "../../navigation/caterer/PartnerNav";
import { useAuth } from "../../store/auth";
import { isWeb } from "../../utils/platform";
import { supabase } from "../../services/supabase";

import Sidebar from "../../components/caterer/Sidebar";
import TopBar from "../../components/caterer/TopBar";
import BottomNav from "../../components/caterer/BottomNav";
import KPIBlock from "../../components/caterer/KPIBlock";
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

      // Get services for this caterer (fallback)
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('id')
        .eq('user_id', user.id);

      const serviceIds = services?.map(s => s.id) || [];

      if (packageIds.length === 0 && serviceIds.length === 0) {
        setBookings([]);
        setKpis([
          { label: "New Orders (7d)", value: "0", sub: "Last 7 days" },
          { label: "Revenue (₱)", value: "0", sub: "Last 30 days" },
          { label: "Pending Orders", value: "0", sub: "Awaiting action" }
        ]);
        setLoading(false);
        return;
      }

      // Fetch all bookings for this caterer
      let bookingsQuery = supabase
        .from('bookings')
        .select(`
          *,
          services:service_id (
            id,
            name,
            price_per_head,
            user_id
          ),
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

      // Filter by package_id or service_id
      if (packageIds.length > 0) {
        bookingsQuery = bookingsQuery.in('package_id', packageIds);
      } else if (serviceIds.length > 0) {
        bookingsQuery = bookingsQuery.in('service_id', serviceIds);
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
            amount = parseFloat(booking.packages.price) || 0;
          } else if (booking.services && booking.services.price_per_head) {
            amount = (parseFloat(booking.services.price_per_head) || 0) * (booking.guests || 0);
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
            total = `₱${parseFloat(booking.packages.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          } else if (booking.services && booking.services.price_per_head) {
            const amount = (parseFloat(booking.services.price_per_head) || 0) * (booking.guests || 0);
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
          <View style={styles.pageHeaderRow}>
            <View style={styles.pageHeaderLeft}>
              <Text style={styles.pageTitle}>Overview</Text>
              <Text style={styles.pageSubTitle}>
                Welcome back, {user.username}
              </Text>
            </View>

            {isWeb && (
              <View style={styles.metaRight}>
                <Text style={styles.metaText}>
                  Status:{" "}
                  <Text style={styles.statusBadge}>
                    {user.role === "CATER" ? "Verified" : "Pending"}
                  </Text>
                </Text>
              </View>
            )}
          </View>

          {/* KPI cards */}
          <View style={styles.kpiRow}>
            {kpis.map((k) => (
              <KPIBlock
                key={k.label}
                label={k.label}
                value={k.value}
                sub={k.sub}
              />
            ))}
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
                          services:service_id (
                            id,
                            name,
                            price_per_head,
                            user_id
                          ),
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
                        serviceName: bookingData.services?.name || bookingData.packages?.name || 'N/A',
                        packageName: bookingData.packages?.name,
                        packagePrice: bookingData.packages?.price ? `₱${parseFloat(bookingData.packages.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : undefined,
                        selectedDishes: [], // Will be populated from booking data if available
                        venue: '', // Will be populated from booking data if available
                        inclusions: [], // Will be populated from booking data if available
                        status: bookingData.status as "PENDING" | "CONFIRMED" | "DECLINED" | "COMPLETED" | "CANCELLED",
                        eventDate: bookingData.event_date,
                        guests: bookingData.guests || 0,
                        totalPrice: bookingData.packages?.price ? `₱${parseFloat(bookingData.packages.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 
                          (bookingData.services?.price_per_head ? `₱${((parseFloat(bookingData.services.price_per_head) || 0) * (bookingData.guests || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₱0'),
                        notes: bookingData.notes || undefined
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
    fontSize: Platform.OS === 'web' ? 18 : 20,
    fontWeight: "700",
    color: "#111827"
  },
  pageSubTitle: {
    color: "#6b7280",
    fontSize: Platform.OS === 'web' ? 13 : 14,
    marginTop: 4
  },
  metaRight: {},
  metaText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500"
  },
  statusBadge: {
    backgroundColor: "#dbeafe",
    color: "#1e3a8a",
    fontWeight: "600",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
    fontSize: 12
  },
  kpiRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    marginBottom: 24,
    gap: Platform.OS === 'web' ? 0 : 4,
    width: "100%",
    justifyContent: Platform.OS === 'web' ? "flex-start" : "space-between"
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

