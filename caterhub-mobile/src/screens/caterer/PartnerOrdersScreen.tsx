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
  RefreshControl
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Sidebar from "../../components/caterer/Sidebar";
import TopBar from "../../components/caterer/TopBar";
import { PartnerStackParamList } from "../../navigation/caterer/PartnerNav";
import { useAuth } from "../../store/auth";
import { supabase } from "../../services/supabase";

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
  status: "PENDING" | "CONFIRMED" | "DECLINED" | "COMPLETED" | "CANCELLED";
  eventDate: string;
  guests: number;
  totalPrice: string;
  notes?: string;
};

export default function PartnerOrdersScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<PartnerStackParamList>>();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Fetch orders from Supabase
  const fetchOrders = async () => {
    if (!user) {
      console.warn('[PartnerOrdersScreen] No user, cannot fetch orders');
      return;
    }

    console.log('[PartnerOrdersScreen] Fetching orders for caterer:', user.id);

    try {
      // First, get all services belonging to this caterer
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('id, name, user_id')
        .eq('user_id', user.id);

      console.log('[PartnerOrdersScreen] Found services:', services?.length || 0, services);

      if (servicesError) {
        console.error('[PartnerOrdersScreen] Error fetching services:', servicesError);
        // Try fetching by packages instead
        await fetchOrdersByPackages();
        return;
      }

      if (!services || services.length === 0) {
        console.warn('[PartnerOrdersScreen] No services found for caterer, trying packages...');
        // Try fetching by packages instead (since packages are linked to caterers)
        await fetchOrdersByPackages();
        return;
      }

      const serviceIds = services.map(s => s.id);
      console.log('[PartnerOrdersScreen] Service IDs:', serviceIds);

      // Also get packages for this caterer (to include bookings by package_id too)
      const { data: packages, error: packagesError } = await supabase
        .from('packages')
        .select('id')
        .eq('caterer_id', user.id)
        .eq('is_active', true);

      const packageIds = packages?.map(p => p.id) || [];
      console.log('[PartnerOrdersScreen] Package IDs for this caterer:', packageIds);

      // Fetch bookings for services OR packages (cover both cases)
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

      // Filter by service_id OR package_id
      // Try to use package_id first since we know bookings have package_id
      if (packageIds.length > 0) {
        bookingsQuery = bookingsQuery.in('package_id', packageIds);
        console.log('[PartnerOrdersScreen] Querying bookings by package_id:', packageIds);
      } else if (serviceIds.length > 0) {
        bookingsQuery = bookingsQuery.in('service_id', serviceIds);
        console.log('[PartnerOrdersScreen] Querying bookings by service_id:', serviceIds);
      } else {
        // No services or packages, set empty
        console.warn('[PartnerOrdersScreen] No services or packages found for caterer');
        setOrders([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const { data: bookings, error } = await bookingsQuery;

      console.log('[PartnerOrdersScreen] Found bookings:', bookings?.length || 0);
      if (bookings && bookings.length > 0) {
        console.log('[PartnerOrdersScreen] Sample booking:', {
          id: bookings[0].id,
          service_id: bookings[0].service_id,
          package_id: bookings[0].package_id,
          user_id: bookings[0].user_id,
          customer: bookings[0].customer?.username,
        });
      }

      if (error) {
        console.error('Error fetching orders:', error);
        Alert.alert('Error', 'Failed to load orders');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // If customer data is missing from joins, fetch it separately
      const bookingsWithCustomers = await Promise.all(
        (bookings || []).map(async (booking: any) => {
          // If customer join worked, use it
          if (booking.customer) {
            return booking;
          }

          // Otherwise, fetch customer data separately
          console.log('[PartnerOrdersScreen] Fetching customer data separately for booking:', booking.id, 'user_id:', booking.user_id);
          
          const { data: customerData, error: customerError } = await supabase
            .from('users')
            .select('id, username, email')
            .eq('id', booking.user_id)
            .single();

          if (customerError) {
            console.warn('[PartnerOrdersScreen] Failed to fetch customer data:', customerError);
            // Still include booking but with minimal customer info
            return {
              ...booking,
              customer: {
                id: booking.user_id,
                username: 'Unknown Customer',
                email: 'N/A',
              },
            };
          }

          return {
            ...booking,
            customer: customerData,
          };
        })
      );

      // Transform bookings to Order format
      const validBookings = bookingsWithCustomers.filter((booking: any) => {
        if (!booking.customer) {
          console.warn('[PartnerOrdersScreen] Booking missing customer after fetch:', booking.id);
          return false;
        }
        // Service is optional if we're fetching by package
        if (!booking.services && !booking.packages) {
          console.warn('[PartnerOrdersScreen] Booking missing both service and package:', booking.id);
          return false;
        }
        return true;
      });

      console.log('[PartnerOrdersScreen] Valid bookings after filtering:', validBookings.length);

      const transformedOrders: Order[] = validBookings.map((booking: any) => {
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
            const pricePerHead = booking.services?.price_per_head || 0;
            total = pricePerHead * booking.guests;
          }

          return {
            id: booking.id,
            bookingId: `ORD-${booking.id}`,
            customerName: booking.customer.username || 'Unknown',
            customerEmail: booking.customer.email || '',
            customerId: booking.customer.id,
            serviceName: booking.services?.name || booking.packages?.name || 'Unknown Service',
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

      console.log('[PartnerOrdersScreen] Transformed orders:', transformedOrders.length);
      setOrders(transformedOrders);
    } catch (err) {
      console.error('[PartnerOrdersScreen] Failed to fetch orders:', err);
      Alert.alert('Error', 'Failed to load orders');
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
            const pricePerHead = booking.services?.price_per_head || 0;
            total = pricePerHead * booking.guests;
          }

          return {
            id: booking.id,
            bookingId: `ORD-${booking.id}`,
            customerName: booking.customer.username || 'Unknown',
            customerEmail: booking.customer.email || '',
            customerId: booking.customer.id,
            serviceName: booking.services?.name || booking.packages?.name || 'Unknown Service',
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
      // Query all bookings and filter by checking if service belongs to caterer
      // This assumes services might be linked differently
      const { data: allBookings, error } = await supabase
        .from('bookings')
        .select(`
          *,
          services:service_id (
            id,
            name,
            price_per_head
          ),
          packages:package_id (
            id,
            name,
            price
          ),
          customer:user_id (
            id,
            username,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter bookings where service owner matches caterer
      // Note: This requires services to have a user_id field
      // If services don't have user_id, we may need to join through packages
      const filteredBookings = (allBookings || []).filter(
        (booking: any) => booking.services
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
          const pricePerHead = booking.services?.price_per_head || 0;
          total = pricePerHead * booking.guests;
        }

        return {
          id: booking.id,
          bookingId: `ORD-${booking.id}`,
          customerName: booking.customer?.username || 'Unknown',
          customerEmail: booking.customer?.email || '',
          customerId: booking.customer?.id || '',
          serviceName: booking.services?.name || 'Unknown Service',
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

  const filteredOrders = statusFilter === "ALL"
    ? orders
    : orders.filter(order => order.status === statusFilter);

  if (!user) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={{ color: "#6b6b6b" }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Sidebar />
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
            <View style={styles.metaInfoBox}>
              <Text style={styles.metaInfoText}>
                {filteredOrders.length} order{filteredOrders.length === 1 ? "" : "s"}
              </Text>
            </View>
          </View>

          {/* Status Filter */}
          <View style={styles.filterRow}>
            {["ALL", "PENDING", "CONFIRMED", "COMPLETED", "DECLINED", "CANCELLED"].map((status) => (
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
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
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
          ) : (
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
                        order.status === "COMPLETED" && styles.statusCompleted,
                        order.status === "DECLINED" && styles.statusDeclined,
                        order.status === "CANCELLED" && styles.statusCancelled
                      ]}
                    >
                      {order.status}
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
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    flexDirection: "row",
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
    padding: 16,
    paddingBottom: 40
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

