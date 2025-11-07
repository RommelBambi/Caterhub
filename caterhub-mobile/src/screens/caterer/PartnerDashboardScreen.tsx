import React from "react";
import { View, Text, StyleSheet, ScrollView, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { PartnerStackParamList } from "../../navigation/caterer/PartnerNav";
import { useAuth } from "../../store/auth";
import { isWeb } from "../../utils/platform";

import Sidebar from "../../components/caterer/Sidebar";
import TopBar from "../../components/caterer/TopBar";
import BottomNav from "../../components/caterer/BottomNav";
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
              <Text style={styles.smallMuted}>3 latest</Text>
            </View>
            <BookingList data={bookings} />
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
    flexDirection: Platform.OS === 'web' ? "row" : "column",
    flexWrap: Platform.OS === 'web' ? "wrap" : "nowrap",
    marginBottom: 24,
    gap: Platform.OS === 'web' ? 0 : 12
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
  }
});

