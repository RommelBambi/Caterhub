import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { PartnerStackParamList } from "../../navigation/caterer/PartnerNav";
import { useAuth } from "../../store/auth";

import Sidebar from "../../components/caterer/Sidebar";
import TopBar from "../../components/caterer/TopBar";
import KPIBlock from "../../components/caterer/KPIBlock";
import BookingList, { Booking } from "../../components/caterer/BookingList";

export default function PartnerDashboardScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<PartnerStackParamList>>();
  const { user } = useAuth();

  const bookings: Booking[] = [
    {
      id: "ORD-2025-014",
      client: "Ana Reyes",
      date: "Oct 30, 2025",
      headcount: 80,
      status: "pending",
      total: "₱18,000"
    },
    {
      id: "ORD-2025-013",
      client: "Mark Santos",
      date: "Oct 29, 2025",
      headcount: 50,
      status: "pending",
      total: "₱12,500"
    },
    {
      id: "ORD-2025-012",
      client: "Eduardo Cruz",
      date: "Oct 28, 2025",
      headcount: 120,
      status: "pending",
      total: "₱0"
    }
  ];

  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const kpis = [
    { label: "New Orders (7d)", value: "5", sub: "↑ 2 vs last week" },
    { label: "Revenue (₱)", value: "22,900", sub: "Last 30 days" },
    { label: "Pending Orders", value: String(pendingCount), sub: "Awaiting action" }
  ];

  if (!user) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={{ color: "#6b6b6b" }}>Loading dashboard…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Sidebar />

      <View style={styles.mainArea}>
        <TopBar title="Dashboard" />

        <ScrollView
          style={styles.scrollRegion}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.pageHeaderRow}>
            <View>
              <Text style={styles.pageTitle}>Overview</Text>
              <Text style={styles.pageSubTitle}>
                Welcome back, {user.username}
              </Text>
            </View>

            <View style={styles.metaRight}>
              <Text style={styles.metaText}>
                Status:{" "}
                <Text style={styles.statusBadge}>
                  {user.role === "CATER" ? "Verified" : "Pending"}
                </Text>
              </Text>
            </View>
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
              <Text style={styles.smallMuted}>3 latest</Text>
            </View>
            <BookingList data={bookings} />
          </View>

          {/* Footer */}
          <View style={styles.footerArea}>
            <Text style={styles.footerText}>© 2025 CaterHub • Partner</Text>
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
    padding: 16
  },
  pageHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
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
    flexWrap: "wrap",
    marginBottom: 24
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 16,
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
  }
});

