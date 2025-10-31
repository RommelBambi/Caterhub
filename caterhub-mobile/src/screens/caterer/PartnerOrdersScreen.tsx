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
    if (!user) return;

    try {
      // First, get all services belonging to this caterer
      // Assuming services have a user_id field that links to caterers
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('id')
        .eq('user_id', user.id);

      if (servicesError) {
        console.error('Error fetching services:', servicesError);
        // Try alternative query if services don't have user_id
        await fetchOrdersAlternative();
        return;
      }

      if (!services || services.length === 0) {
        setOrders([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const serviceIds = services.map(s => s.id);

      // Now fetch bookings for those services
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          *,
          services:service_id (
            id,
            name,
            price_per_head
          ),
          customer:user_id (
            id,
            username,
            email
          )
        `)
        .in('service_id', serviceIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        Alert.alert('Error', 'Failed to load orders');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Transform bookings to Order format
      const transformedOrders: Order[] = (bookings || [])
        .filter((booking: any) => booking.services && booking.customer)
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

          // Calculate total price
          const pricePerHead = booking.services?.price_per_head || 0;
          const total = pricePerHead * booking.guests;

          return {
            id: booking.id,
            bookingId: `ORD-${booking.id}`,
            customerName: booking.customer.username || 'Unknown',
            customerEmail: booking.customer.email || '',
            customerId: booking.customer.id,
            serviceName: booking.services?.name || 'Unknown Service',
            packageName: notesData.packageId ? `Package ${notesData.packageId}` : undefined,
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

      setOrders(transformedOrders);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
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

        const pricePerHead = booking.services?.price_per_head || 0;
        const total = pricePerHead * booking.guests;

        return {
          id: booking.id,
          bookingId: `ORD-${booking.id}`,
          customerName: booking.customer?.username || 'Unknown',
          customerEmail: booking.customer?.email || '',
          customerId: booking.customer?.id || '',
          serviceName: booking.services?.name || 'Unknown Service',
          packageName: notesData.packageId ? `Package ${notesData.packageId}` : undefined,
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
                      <Text style={styles.packageNameText}>{order.packageName}</Text>
                    )}
                    <Text style={styles.packagePriceText}>{order.totalPrice}</Text>
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
  packageNameText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600"
  },
  packagePriceText: {
    fontSize: 12,
    color: "#10b981",
    fontWeight: "700",
    marginTop: 2
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
    backgroundColor: "#9333ea",
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
    backgroundColor: "#9333ea",
    borderColor: "#9333ea"
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
    color: "#10b981",
    fontWeight: "700"
  }
});

