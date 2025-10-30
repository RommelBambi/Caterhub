import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Sidebar from "../../components/partner/Sidebar";
import TopBar from "../../components/partner/TopBar";
import { PartnerStackParamList } from "../../navigation/partner/PartnerNav";
import { useAuth } from "../../store/auth";

type Order = {
  id: string;
  customerName: string;
  packageName: string;
  packagePrice: string;
  selectedDishes: Array<{
    sectionLabel: string;
    chosenDish: string;
  }>;
  venue: string;
  inclusions: string[];
  status: "Pending" | "Confirmed" | "Completed" | "Cancelled";
  eventDate: string;
  totalPrice: string;
};

export default function PartnerOrdersScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<PartnerStackParamList>>();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);

  // TODO: Replace with Supabase query
  useEffect(() => {
    if (!user) return;

    // Mock orders for now - replace with Supabase fetch
    const sample: Order[] = [
      {
        id: "ORD-2025-001",
        customerName: "Juan Dela Cruz",
        packageName: "Birthday Set A",
        packagePrice: "₱12,500",
        selectedDishes: [
          { sectionLabel: "Pork", chosenDish: "Lechon Kawali" },
          { sectionLabel: "Beef", chosenDish: "Roast Beef" },
          { sectionLabel: "Beverages", chosenDish: "Iced Tea Dispenser" }
        ],
        venue: "Barangay Hall, Tayabas City",
        inclusions: [
          "Chairs & Tables",
          "Buffet Setup",
          "Wait Staff (3)"
        ],
        status: "Pending",
        eventDate: "Nov 2, 2025 • 6:00 PM",
        totalPrice: "₱15,000"
      },
      {
        id: "ORD-2025-002",
        customerName: "Ava Santos",
        packageName: "Wedding Premium",
        packagePrice: "₱45,000",
        selectedDishes: [
          { sectionLabel: "Chicken", chosenDish: "Chicken Cordon Bleu" },
          { sectionLabel: "Beef", chosenDish: "Beef Caldereta" },
          { sectionLabel: "Vegetable", chosenDish: "Chopsuey" }
        ],
        venue: "Villa Leonila Resort, Lucena City",
        inclusions: [
          "Full Buffet Setup",
          "Table Centerpieces",
          "Wait Staff (8)",
          "Cake Cutting Service"
        ],
        status: "Confirmed",
        eventDate: "Nov 5, 2025 • 4:30 PM",
        totalPrice: "₱52,000"
      }
    ];

    setOrders(sample);
  }, [user]);

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
        >
          <View style={styles.pageHeaderRow}>
            <View>
              <Text style={styles.pageTitle}>Orders</Text>
              <Text style={styles.pageSubTitle}>
                View bookings, venues, and requested inclusions.
              </Text>
            </View>
            <View style={styles.metaInfoBox}>
              <Text style={styles.metaInfoText}>
                {orders.length} order{orders.length === 1 ? "" : "s"}
              </Text>
            </View>
          </View>

          <View style={styles.tableWrapper}>
            <View style={[styles.row, styles.headerRow]}>
              <Text style={[styles.cell, styles.headerText, { flex: 2 }]}>Customer</Text>
              <Text style={[styles.cell, styles.headerText, { flex: 2 }]}>Package</Text>
              <Text style={[styles.cell, styles.headerText, { flex: 2 }]}>Venue</Text>
              <Text style={[styles.cell, styles.headerText, { flex: 1 }]}>Status</Text>
              <Text style={[styles.cell, styles.headerText, { flex: 1 }]}>Event</Text>
              <Text style={[styles.cell, styles.headerText, { flex: 1 }]}>Actions</Text>
            </View>

            {orders.map((order, idx) => (
              <View
                key={order.id}
                style={[
                  styles.row,
                  idx === orders.length - 1 ? styles.lastRow : styles.bodyRow
                ]}
              >
                <Text style={[styles.cell, { flex: 2 }]}>{order.customerName}</Text>
                <View style={[styles.cell, { flex: 2 }]}>
                  <Text style={styles.packageNameText}>{order.packageName}</Text>
                  <Text style={styles.packagePriceText}>{order.packagePrice}</Text>
                </View>
                <Text style={[styles.cell, { flex: 2 }]}>{order.venue}</Text>
                <View style={[styles.cell, { flex: 1 }]}>
                  <Text
                    style={[
                      styles.statusChip,
                      order.status === "Pending" && styles.statusPending,
                      order.status === "Confirmed" && styles.statusConfirmed,
                      order.status === "Completed" && styles.statusCompleted,
                      order.status === "Cancelled" && styles.statusCancelled
                    ]}
                  >
                    {order.status}
                  </Text>
                </View>
                <Text style={[styles.cell, { flex: 1 }]}>{order.eventDate}</Text>
                <View style={[styles.cell, { flex: 1 }]}>
                  <Pressable
                    style={styles.detailsBtn}
                    onPress={() =>
                      navigation.navigate("PartnerOrderDetails", { order } as any)
                    }
                  >
                    <Text style={styles.detailsBtnText}>Details</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3
  },
  detailsBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13
  }
});

