import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  TextInput
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Sidebar from "../../components/caterer/Sidebar";
import TopBar from "../../components/caterer/TopBar";
import BottomNav from "../../components/caterer/BottomNav";
import { PartnerStackParamList } from "../../navigation/caterer/PartnerNav";
import { useAuth } from "../../store/auth";
import { supabase } from "../../services/supabase";
import { isWeb } from "../../utils/platform";
import { Platform } from "react-native";

type Order = {
  id: number;
  bookingId: string;
  customerName: string;
  customerEmail: string;
  customerId: string;
  serviceName: string;
  packageName?: string;
  packagePrice?: string;
  selectedDishes: Array<{
    sectionLabel: string;
    chosenDish: string;
  }>;
  venue: string;
  inclusions: string[];
  status: "PENDING" | "CONFIRMED" | "ON_THE_WAY" | "DECLINED" | "COMPLETED" | "CANCELLED";
  eventDate: string;
  guests: number;
  totalPrice: string;
  notes?: string;
  // Payment fields
  deposit_amount?: number;
  remaining_amount?: number;
  deposit_paid?: boolean;
  remaining_paid?: boolean;
  remaining_paid_method?: string;
  payment_method?: string;
  payment_status?: string;
  delivery_fee?: number;
};

export default function PartnerOrdersScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<PartnerStackParamList>>();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Fetch orders from Supabase - Optimized for faster loading
  const fetchOrders = async () => {
    if (!user) {
      console.warn('[PartnerOrdersScreen] No user, cannot fetch orders');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    console.log('[PartnerOrdersScreen] Fetching orders for caterer:', user.id);

    try {
      // Optimized: Fetch packages and bookings in parallel where possible
      // First, get package IDs quickly
      const { data: packages, error: packagesError } = await supabase
        .from('packages')
        .select('id')
        .eq('caterer_id', user.id)
        .eq('is_active', true);

      if (packagesError) {
        console.error('[PartnerOrdersScreen] Error fetching packages:', packagesError);
        setOrders([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const packageIds = packages?.map(p => p.id) || [];
      console.log('[PartnerOrdersScreen] Package IDs for this caterer:', packageIds);

      if (packageIds.length === 0) {
        console.warn('[PartnerOrdersScreen] No packages found for caterer');
        setOrders([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Fetch bookings with all necessary joins in one query
      const { data: bookings, error: bookingsError } = await supabase
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
        .in('package_id', packageIds)
        .order('created_at', { ascending: false });

      if (bookingsError) {
        console.error('[PartnerOrdersScreen] Error fetching bookings:', bookingsError);
        Alert.alert('Error', `Failed to load orders: ${bookingsError.message}`);
        setOrders([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      console.log('[PartnerOrdersScreen] Found bookings:', bookings?.length || 0);

      if (!bookings || bookings.length === 0) {
        console.log('[PartnerOrdersScreen] No bookings found');
        setOrders([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Transform bookings to Order format immediately (no additional async operations)
      const transformedOrders: Order[] = bookings
        .filter((booking: any) => {
          // Filter out bookings without required data
          if (!booking.packages) {
            console.warn('[PartnerOrdersScreen] Booking missing package:', booking.id);
            return false;
          }
          if (!booking.customer) {
            console.warn('[PartnerOrdersScreen] Booking missing customer:', booking.id);
            // Still include it but with default customer info
            booking.customer = {
              id: booking.user_id,
              username: 'Unknown Customer',
              email: 'N/A',
            };
          }
          return true;
        })
        .map((booking: any) => {
          // Parse notes to extract package and dish info
          let notesData: any = {};
          try {
            notesData = booking.notes ? JSON.parse(booking.notes) : {};
          } catch (e) {
            notesData = { extra: booking.notes || '' };
          }

          const selectedDishes = notesData.picks
            ? notesData.picks.map((pick: any) => ({
                sectionLabel: pick.categoryName || 'Unknown',
                chosenDish: pick.optionName || 'Unknown'
              }))
            : [];

          const inclusions = notesData.inclusions || [];

          // Get package information from database
          const packageInfo = booking.packages || null;
          const packageName = packageInfo?.name || (notesData.packageId ? `Package ${notesData.packageId}` : undefined);
          
          // Calculate total price - prioritize deposit + remaining + delivery fee
          let total = 0;
          if (booking.deposit_amount && booking.remaining_amount) {
            // Use actual payment amounts if available
            total = (booking.deposit_amount || 0) + (booking.remaining_amount || 0) + (booking.delivery_fee || 0);
          } else if (packageInfo?.price) {
            // Parse package price string (e.g., "12,500" or "₱12,500")
            const priceMatch = packageInfo.price.match(/(\d+(?:,\d+)*(?:\.\d+)?)/);
            if (priceMatch) {
              const packagePrice = parseFloat(priceMatch[1].replace(/,/g, ''));
              // Package price is per head, multiply by guests
              total = packagePrice * (booking.guests || 1);
            }
          }

          // Handle customer data - use joined data or provide defaults
          const customer = booking.customer || {
            id: booking.user_id,
            username: 'Unknown Customer',
            email: 'N/A',
          };

          return {
            id: booking.id,
            bookingId: `ORD-${booking.id}`,
            customerName: customer.username || 'Unknown',
            customerEmail: customer.email || '',
            customerId: customer.id,
            serviceName: booking.packages?.name || 'Unknown Service',
            packageName: packageName,
            packagePrice: packageInfo?.price,
            venue: booking.address || notesData.address || 'Not specified',
            selectedDishes,
            inclusions,
            status: booking.status,
            eventDate: formatEventDate(booking.event_date),
            guests: booking.guests,
            totalPrice: `₱${total.toLocaleString()}`,
            notes: notesData.extra || '',
            // Payment fields
            deposit_amount: booking.deposit_amount,
            remaining_amount: booking.remaining_amount,
            deposit_paid: booking.deposit_paid,
            remaining_paid: booking.remaining_paid,
            remaining_paid_method: booking.remaining_paid_method,
            payment_method: booking.payment_method,
            payment_status: booking.payment_status,
            delivery_fee: booking.delivery_fee || 0
          };
        });

      console.log('[PartnerOrdersScreen] Transformed orders:', transformedOrders.length);
      setOrders(transformedOrders);
    } catch (err: any) {
      console.error('[PartnerOrdersScreen] Failed to fetch orders:', err);
      Alert.alert('Error', `Failed to load orders: ${err?.message || 'Unknown error'}`);
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Alternative: Fetch bookings by packages (since packages.caterer_id = user.id)
  const fetchOrdersByPackages = async () => {
    if (!user) return;

    try {
      console.log('[PartnerOrdersScreen] Fetching orders by packages for caterer:', user.id);

      // Get all packages for this caterer
      const { data: packages, error: packagesError } = await supabase
        .from('packages')
        .select('id')
        .eq('caterer_id', user.id)
        .eq('is_active', true);

      console.log('[PartnerOrdersScreen] Found packages:', packages?.length || 0);

      if (packagesError) {
        console.error('[PartnerOrdersScreen] Error fetching packages:', packagesError);
        setOrders([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (!packages || packages.length === 0) {
        console.warn('[PartnerOrdersScreen] No packages found for caterer');
        setOrders([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const packageIds = packages.map(p => p.id);
      console.log('[PartnerOrdersScreen] Package IDs:', packageIds);

      // Fetch bookings that have these package_ids
      const { data: bookings, error } = await supabase
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
        .in('package_id', packageIds)
        .order('created_at', { ascending: false });

      console.log('[PartnerOrdersScreen] Found bookings by packages:', bookings?.length || 0);

      if (error) {
        console.error('[PartnerOrdersScreen] Error fetching bookings by packages:', error);
        Alert.alert('Error', 'Failed to load orders');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Transform bookings to Order format (same as above)
      const transformedOrders: Order[] = (bookings || [])
        .filter((booking: any) => booking.customer)
        .map((booking: any) => {
          // Parse notes to extract package and dish info
          let notesData: any = {};
          try {
            notesData = booking.notes ? JSON.parse(booking.notes) : {};
          } catch (e) {
            notesData = { extra: booking.notes || '' };
          }

          const selectedDishes = notesData.picks
            ? notesData.picks.map((pick: any) => ({
                sectionLabel: pick.categoryName || 'Unknown',
                chosenDish: pick.optionName || 'Unknown'
              }))
            : [];

          const inclusions = notesData.inclusions || [];

          // Get package information from database or fallback to notes
          const packageInfo = booking.packages || null;
          const packageName = packageInfo?.name || (notesData.packageId ? `Package ${notesData.packageId}` : undefined);
          
          // Calculate total price - use package price if available, otherwise use service price_per_head
          let total = 0;
          if (packageInfo?.price) {
            // Parse package price string (e.g., "12,500" or "₱12,500")
            const priceMatch = packageInfo.price.match(/(\d+(?:,\d+)*(?:\.\d+)?)/);
            if (priceMatch) {
              const packagePrice = parseFloat(priceMatch[1].replace(/,/g, ''));
              // Package price might be total or per head - check if we need to multiply by guests
              // For now, assume it's a total package price (not per head)
              total = packagePrice;
            }
          } else {
            // Fallback to service price_per_head * guests
            // Services table no longer exists - removed fallback
            const pricePerHead = 0;
            total = pricePerHead * booking.guests;
          }

          return {
            id: booking.id,
            bookingId: `ORD-${booking.id}`,
            customerName: booking.customer.username || 'Unknown',
            customerEmail: booking.customer.email || '',
            customerId: booking.customer.id,
            serviceName: booking.packages?.name || 'Unknown Service',
            packageName: packageName,
            packagePrice: packageInfo?.price,
            venue: notesData.address || 'Not specified',
            selectedDishes,
            inclusions,
            status: booking.status,
            eventDate: formatEventDate(booking.event_date),
            guests: booking.guests,
            totalPrice: `₱${total.toLocaleString()}`,
            notes: notesData.extra || ''
          };
        });

      console.log('[PartnerOrdersScreen] Transformed orders from packages:', transformedOrders.length);
      setOrders(transformedOrders);
    } catch (err) {
      console.error('[PartnerOrdersScreen] Failed to fetch orders by packages:', err);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Alternative query if services table structure is different
  const fetchOrdersAlternative = async () => {
    if (!user) return;

    try {
      // Query all bookings and filter by checking if package belongs to caterer
      // Services table no longer exists, so we only check packages
      const { data: allBookings, error } = await supabase
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

      if (error) throw error;

      // Filter bookings where package belongs to this caterer
      const filteredBookings = (allBookings || []).filter(
        (booking: any) => booking.packages && booking.packages.caterer_id === user.id
      );

      // Transform similar to above
      const transformedOrders: Order[] = filteredBookings.map((booking: any) => {
        let notesData: any = {};
        try {
          notesData = booking.notes ? JSON.parse(booking.notes) : {};
        } catch (e) {
          notesData = { extra: booking.notes || '' };
        }

        const selectedDishes = notesData.picks
          ? notesData.picks.map((pick: any) => ({
              sectionLabel: pick.categoryName || 'Unknown',
              chosenDish: pick.optionName || 'Unknown'
            }))
          : [];

        // Get package information from database or fallback to notes
        const packageInfo = booking.packages || null;
        const packageName = packageInfo?.name || (notesData.packageId ? `Package ${notesData.packageId}` : undefined);
        
        // Calculate total price - use package price (multiply by guests)
        let total = 0;
        if (packageInfo?.price) {
          // Parse package price string (e.g., "12,500" or "₱12,500")
          const priceMatch = packageInfo.price.match(/(\d+(?:,\d+)*(?:\.\d+)?)/);
          if (priceMatch) {
            const packagePrice = parseFloat(priceMatch[1].replace(/,/g, ''));
            // Package price is per head, multiply by guests
            total = packagePrice * (booking.guests || 0);
          }
        }

        return {
          id: booking.id,
          bookingId: `ORD-${booking.id}`,
          customerName: booking.customer?.username || 'Unknown',
          customerEmail: booking.customer?.email || '',
          customerId: booking.customer?.id || '',
          serviceName: booking.packages?.name || 'Unknown Service',
          packageName: packageName,
          packagePrice: packageInfo?.price,
          venue: notesData.address || 'Not specified',
          selectedDishes,
          inclusions: notesData.inclusions || [],
          status: booking.status,
          eventDate: formatEventDate(booking.event_date),
          guests: booking.guests,
          totalPrice: `₱${total.toLocaleString()}`,
          notes: notesData.extra || ''
        };
      });

      setOrders(transformedOrders);
    } catch (err) {
      console.error('Alternative fetch failed:', err);
      Alert.alert('Error', 'Failed to load orders');
    }
  };

  const formatEventDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      fetchOrders();
    }, [user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === "ALL" || order.status === statusFilter;
    const matchesSearch = !searchQuery.trim()
      ? true
      : order.customerName.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        order.customerEmail.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        order.serviceName.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        order.bookingId.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Calculate stats
  const totalBookings = orders.length;
  const pendingCount = orders.filter(o => o.status === "PENDING").length;
  const confirmedCount = orders.filter(o => o.status === "CONFIRMED").length;
  const onTheWayCount = orders.filter(o => o.status === "ON_THE_WAY").length;
  const completedCount = orders.filter(o => o.status === "COMPLETED").length;

  if (!user) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={{ color: "#6b6b6b" }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {isWeb && <Sidebar />}
      <View style={styles.mainArea}>
        <TopBar title="Orders" />
        <ScrollView
          style={styles.scrollRegion}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.pageHeaderRow}>
            <View>
              <Text style={styles.pageTitle}>Orders</Text>
              <Text style={styles.pageSubTitle}>
                View bookings, accept or decline orders from customers.
              </Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Bookings</Text>
              <Text style={styles.statValue}>{totalBookings}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Pending</Text>
              <Text style={[styles.statValue, { color: "#1D4ED8" }]}>{pendingCount}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Confirmed</Text>
              <Text style={[styles.statValue, { color: "#22c55e" }]}>{confirmedCount}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>On the Way</Text>
              <Text style={[styles.statValue, { color: "#f59e0b" }]}>{onTheWayCount}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Completed</Text>
              <Text style={[styles.statValue, { color: "#0ea5e9" }]}>{completedCount}</Text>
            </View>
          </View>

          {/* Search Bar and Filters */}
          <View style={styles.toolbar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by customer, email, service, or order ID..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <View style={styles.filterGroup}>
              {["ALL", "PENDING", "CONFIRMED", "ON_THE_WAY", "COMPLETED", "DECLINED", "CANCELLED"].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterChip,
                    statusFilter === status && styles.filterChipActive
                  ]}
                  onPress={() => setStatusFilter(status)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      statusFilter === status && styles.filterChipTextActive
                    ]}
                  >
                    {status === 'ON_THE_WAY' ? 'ON THE WAY' : status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#9333ea" />
              <Text style={styles.loadingText}>Loading orders...</Text>
            </View>
          ) : filteredOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {statusFilter === "ALL"
                  ? "No orders yet."
                  : `No ${statusFilter.toLowerCase()} orders.`}
              </Text>
              <Text style={styles.emptySubText}>
                Orders from customers will appear here.
              </Text>
            </View>
          ) : isWeb ? (
            // Web: Table layout
            <View style={styles.tableWrapper}>
              <View style={[styles.row, styles.headerRow]}>
                <Text style={[styles.cell, styles.headerText, { flex: 2 }]}>Customer</Text>
                <Text style={[styles.cell, styles.headerText, { flex: 2 }]}>Service</Text>
                <Text style={[styles.cell, styles.headerText, { flex: 2 }]}>Venue</Text>
                <Text style={[styles.cell, styles.headerText, { flex: 1 }]}>Status</Text>
                <Text style={[styles.cell, styles.headerText, { flex: 1 }]}>Event</Text>
                <Text style={[styles.cell, styles.headerText, { flex: 1 }]}>Actions</Text>
              </View>

              {filteredOrders.map((order, idx) => (
                <View
                  key={order.id}
                  style={[
                    styles.row,
                    idx === filteredOrders.length - 1 ? styles.lastRow : styles.bodyRow
                  ]}
                >
                  <View style={[styles.cell, { flex: 2 }]}>
                    <Text style={styles.customerNameText}>{order.customerName}</Text>
                    <Text style={styles.customerEmailText}>{order.customerEmail}</Text>
                  </View>
                  <View style={[styles.cell, { flex: 2 }]}>
                    <Text style={styles.serviceNameText}>{order.serviceName}</Text>
                    {order.packageName && (
                      <Text style={styles.packageNameText}>
                        📦 {order.packageName}
                        {order.packagePrice && (
                          <Text style={styles.packagePriceText}> • {order.packagePrice}</Text>
                        )}
                      </Text>
                    )}
                    <Text style={styles.totalPriceText}>{order.totalPrice}</Text>
                  </View>
                  <Text style={[styles.cell, { flex: 2 }]} numberOfLines={2}>
                    {order.venue}
                  </Text>
                  <View style={[styles.cell, { flex: 1 }]}>
                    <Text
                      style={[
                        styles.statusChip,
                        order.status === "PENDING" && styles.statusPending,
                        order.status === "CONFIRMED" && styles.statusConfirmed,
                        order.status === "ON_THE_WAY" && styles.statusOnTheWay,
                        order.status === "COMPLETED" && styles.statusCompleted,
                        order.status === "DECLINED" && styles.statusDeclined,
                        order.status === "CANCELLED" && styles.statusCancelled
                      ]}
                    >
                      {order.status === "ON_THE_WAY" ? "ON THE WAY" : order.status}
                    </Text>
                  </View>
                  <Text style={[styles.cell, { flex: 1, fontSize: 11 }]} numberOfLines={2}>
                    {order.eventDate}
                  </Text>
                  <View style={[styles.cell, { flex: 1 }]}>
                    <TouchableOpacity
                      style={styles.detailsBtn}
                      onPress={() =>
                        navigation.navigate("PartnerOrderDetails", { order } as any)
                      }
                      activeOpacity={0.7}
                    >
                      <Text style={styles.detailsBtnText}>View</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            // Mobile: Card layout
            <View style={styles.mobileWrapper}>
              {filteredOrders.map((order, idx) => (
                <View key={order.id} style={styles.mobileCard}>
                  <View style={styles.mobileCardHeader}>
                    <View style={styles.mobileCardHeaderLeft}>
                      <Text style={styles.mobileOrderId}>Order #{order.bookingId || order.id}</Text>
                      <Text style={styles.mobileEventDate}>{order.eventDate}</Text>
                    </View>
                    <Text
                      style={[
                        styles.mobileStatusChip,
                        order.status === "PENDING" && styles.statusPending,
                        order.status === "CONFIRMED" && styles.statusConfirmed,
                        order.status === "ON_THE_WAY" && styles.statusOnTheWay,
                        order.status === "COMPLETED" && styles.statusCompleted,
                        order.status === "DECLINED" && styles.statusDeclined,
                        order.status === "CANCELLED" && styles.statusCancelled
                      ]}
                    >
                      {order.status === "ON_THE_WAY" ? "ON THE WAY" : order.status}
                    </Text>
                  </View>

                  <View style={styles.mobileCardBody}>
                    <View style={styles.mobileInfoRow}>
                      <Text style={styles.mobileInfoLabel}>Customer:</Text>
                      <View style={styles.mobileInfoValueContainer}>
                        <Text style={styles.mobileInfoValue}>{order.customerName}</Text>
                        {order.customerEmail && (
                          <Text style={styles.mobileInfoSubValue}>{order.customerEmail}</Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.mobileInfoRow}>
                      <Text style={styles.mobileInfoLabel}>Service:</Text>
                      <View style={styles.mobileInfoValueContainer}>
                        <Text style={styles.mobileInfoValue}>{order.serviceName}</Text>
                        {order.packageName && (
                          <Text style={styles.mobileInfoSubValue}>
                            📦 {order.packageName}
                            {order.packagePrice && ` • ${order.packagePrice}`}
                          </Text>
                        )}
                        <Text style={styles.mobileTotalPrice}>{order.totalPrice}</Text>
                      </View>
                    </View>

                    <View style={styles.mobileInfoRow}>
                      <Text style={styles.mobileInfoLabel}>Venue:</Text>
                      <Text style={styles.mobileInfoValue}>{order.venue}</Text>
                    </View>

                    {order.guests && (
                      <View style={styles.mobileInfoRow}>
                        <Text style={styles.mobileInfoLabel}>Guests:</Text>
                        <Text style={styles.mobileInfoValue}>{order.guests}</Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.mobileDetailsBtn}
                    onPress={() =>
                      navigation.navigate("PartnerOrderDetails", { order } as any)
                    }
                    activeOpacity={0.7}
                  >
                    <Text style={styles.mobileDetailsBtnText}>View Details</Text>
                  </TouchableOpacity>
                </View>
              ))}
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
    paddingBottom: Platform.OS === 'web' ? 40 : 100
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center"
  },
  pageHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    alignItems: "flex-start",
    marginBottom: 16
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827"
  },
  pageSubTitle: {
    color: "#6b7280",
    fontSize: 13,
    marginTop: 4,
    maxWidth: 260,
    lineHeight: 18
  },
  metaInfoBox: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10
  },
  metaInfoText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151"
  },
  tableWrapper: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  headerRow: {
    backgroundColor: "#f9fafb",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb"
  },
  headerText: {
    fontSize: 12,
    color: "#4b5563",
    fontWeight: "700"
  },
  bodyRow: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb"
  },
  lastRow: {
    borderBottomWidth: 0
  },
  cell: {
    paddingRight: 8
  },
  statusChip: {
    fontSize: 12,
    fontWeight: "600",
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: "flex-start",
    overflow: "hidden"
  },
  statusPending: {
    backgroundColor: "#DBEAFE",
    color: "#1D4ED8"
  },
  statusConfirmed: {
    backgroundColor: "#D1FAE5",
    color: "#065F46"
  },
  statusOnTheWay: {
    backgroundColor: "#FEF3C7",
    color: "#92400E"
  },
  statusCompleted: {
    backgroundColor: "#E5E7EB",
    color: "#374151"
  },
  statusDeclined: {
    backgroundColor: "#FEE2E2",
    color: "#991B1B"
  },
  statusCancelled: {
    backgroundColor: "#FEE2E2",
    color: "#991B1B"
  },
  detailsBtn: {
    backgroundColor: "#FF8000",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  detailsBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db"
  },
  filterChipActive: {
    backgroundColor: "#FF8000",
    borderColor: "#FF8000"
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151"
  },
  filterChipTextActive: {
    color: "#fff"
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
    paddingHorizontal: Platform.OS === 'web' ? 0 : 4
  },
  statCard: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? 140 : 100,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 8
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827"
  },
  toolbar: {
    flexDirection: Platform.OS === 'web' ? "row" : "column",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 20,
    flexWrap: "wrap"
  },
  searchInput: {
    flex: Platform.OS === 'web' ? 1 : undefined,
    minWidth: Platform.OS === 'web' ? 200 : undefined,
    width: Platform.OS === 'web' ? 'auto' : '100%',
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'web' ? 10 : 12,
    fontSize: 14,
    color: "#111827"
  },
  filterGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  loadingText: {
    marginTop: 12,
    color: "#6b7280",
    fontSize: 14
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb"
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8
  },
  emptySubText: {
    fontSize: 14,
    color: "#6b7280"
  },
  // Mobile styles
  mobileWrapper: {
    width: "100%",
    gap: 12
  },
  mobileCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  mobileCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6"
  },
  mobileCardHeaderLeft: {
    flex: 1
  },
  mobileOrderId: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4
  },
  mobileEventDate: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500"
  },
  mobileStatusChip: {
    fontSize: 11,
    fontWeight: "600",
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    overflow: "hidden"
  },
  mobileCardBody: {
    marginBottom: 16
  },
  mobileInfoRow: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-start"
  },
  mobileInfoLabel: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
    width: 80,
    flexShrink: 0
  },
  mobileInfoValueContainer: {
    flex: 1
  },
  mobileInfoValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
    marginBottom: 2
  },
  mobileInfoSubValue: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2
  },
  mobileTotalPrice: {
    fontSize: 14,
    color: "#059669",
    fontWeight: "700",
    marginTop: 4
  },
  mobileDetailsBtn: {
    backgroundColor: "#FF8000",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  mobileDetailsBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14
  },
  customerNameText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2
  },
  customerEmailText: {
    fontSize: 12,
    color: "#6b7280"
  },
  serviceNameText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2
  },
  packageNameText: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 2
  },
  packagePriceText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500"
  },
  totalPriceText: {
    fontSize: 12,
    color: "#10b981",
    fontWeight: "700",
    marginTop: 2
  }
});

