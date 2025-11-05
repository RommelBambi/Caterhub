// src/screens/caterer/PartnerDashboardScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { PartnerStackParamList } from "../../navigation/caterer/PartnerNav";
import { useAuth } from "../../store/auth";
import supabase from "../../services/supabase";

import Sidebar from "../../components/caterer/Sidebar";
import TopBar from "../../components/caterer/TopBar";
import KPIBlock from "../../components/caterer/KPIBlock";
import BookingList, { Booking } from "../../components/caterer/BookingList";

type ProfileRow = {
  full_name: string | null;
  business_name: string | null;
  is_verified: boolean | null;
  dti_url: string | null;
};

export default function PartnerDashboardScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<PartnerStackParamList>>();
  const { user } = useAuth();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // === KPI metrics ===
  const [newOrders7d, setNewOrders7d] = useState<number>(0);
  const [revenue30d, setRevenue30d] = useState<number>(0);
  const [pendingPayments, setPendingPayments] = useState<number>(0);
  const [cancRefundsOpen, setCancRefundsOpen] = useState<number>(0);
  const [topPackageName] = useState<string | null>(null); // placeholder ONLY

  // If your schema uses a different owner column (e.g., "service_owner_id"), change this:
  const providerColumn = "provider_id";

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;
      setLoadingProfile(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name,business_name,is_verified,dti_url")
        .eq("id", user.id)
        .maybeSingle();
      if (!error && data) setProfile(data as ProfileRow);
      setLoadingProfile(false);
    };
    loadProfile();
  }, [user?.id]);

  useEffect(() => {
    const loadKPIs = async () => {
      if (!user?.id) return;

      const now = new Date();
      const isoNow = now.toISOString();

      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      const iso7dAgo = sevenDaysAgo.toISOString();

      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      const iso30dAgo = thirtyDaysAgo.toISOString();

      try {
        // 1) New Orders (last 7d)
        const { count: newOrdersCount } = await supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq(providerColumn, user.id)
          .gte("created_at", iso7dAgo)
          .lte("created_at", isoNow);
        setNewOrders7d(newOrdersCount ?? 0);

        // 2) Revenue (last 30d) for paid/completed
        const { data: revRows, error: revErr } = await supabase
          .from("bookings")
          .select("total_price,status,created_at")
          .eq(providerColumn, user.id)
          .gte("created_at", iso30dAgo)
          .lte("created_at", isoNow)
          .in("status", ["paid", "completed"]);
        if (revErr) throw revErr;
        const revenue = (revRows ?? []).reduce((sum: number, r: any) => {
          const val = typeof r.total_price === "number" ? r.total_price : Number(r.total_price ?? 0);
          return sum + (isNaN(val) ? 0 : val);
        }, 0);
        setRevenue30d(revenue);

        // 3) Pending Payments (current)
        const { count: pendingCount } = await supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq(providerColumn, user.id)
          .in("status", ["awaiting_payment", "payment_pending", "partial_paid"]);
        setPendingPayments(pendingCount ?? 0);

        // 4) Cancellations/Refunds (open)
        const { count: cancCount } = await supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq(providerColumn, user.id)
          .in("status", ["cancellation_requested", "refund_requested", "refund_pending", "refund_processing"]);
        setCancRefundsOpen(cancCount ?? 0);

        // 5) Top Package (Last 30d) — intentionally not computed yet
      } catch (e) {
        console.warn("KPI load error:", (e as any)?.message ?? e);
      }
    };

    loadKPIs();
  }, [user?.id]);

  const greetName = useMemo(() => {
    const meta = (user as any)?.user_metadata || {};
    return (
      profile?.business_name ||
      profile?.full_name ||
      meta.business_name ||
      meta.full_name ||
      (user?.email ? user.email.split("@")[0] : "Partner")
    );
  }, [profile, user]);

  const verificationState = useMemo(() => {
    const isVerified = !!profile?.is_verified;
    const hasDTI = !!profile?.dti_url;
    if (isVerified) return { label: "Verified", kind: "success" as const };
    if (hasDTI) return { label: "Pending Verification", kind: "warning" as const };
    return { label: "Missing DTI", kind: "danger" as const };
  }, [profile]);

  const badgeStyle = useMemo(() => {
    switch (verificationState.kind) {
      case "success":
        return [styles.statusBadge, styles.statusSuccess];
      case "warning":
        return [styles.statusBadge, styles.statusWarning];
      default:
        return [styles.statusBadge, styles.statusDanger];
    }
  }, [verificationState]);

  const kpis = [
    { label: "New Orders (7d)", value: String(newOrders7d), sub: "" },
    {
      label: "Revenue (₱)",
      value: new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(
        revenue30d
      ),
      sub: "Last 30 days"
    },
    { label: "Pending Payments", value: String(pendingPayments), sub: "Awaiting payment" },
    { label: "Cancellations/Refunds (Open)", value: String(cancRefundsOpen), sub: "Needs action" },
    { label: "Top Package", value: topPackageName ?? "—", sub: "Last 30 days" } // placeholder only
  ];

  const bookings: Booking[] = [
    { id: "ORD-2025-014", client: "Ana Reyes", date: "Oct 30, 2025", headcount: 80, status: "pending", total: "₱18,000" },
    { id: "ORD-2025-013", client: "Mark Santos", date: "Oct 29, 2025", headcount: 50, status: "pending", total: "₱12,500" },
    { id: "ORD-2025-012", client: "Eduardo Cruz", date: "Oct 28, 2025", headcount: 120, status: "pending", total: "₱0" }
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

        <ScrollView style={styles.scrollRegion} contentContainerStyle={styles.scrollContent}>
          <View style={styles.pageHeaderRow}>
            <View>
              <Text style={styles.pageTitle}>Overview</Text>
              <Text style={styles.pageSubTitle}>
                {loadingProfile ? "Loading profile…" : `Welcome back, ${greetName}`}
              </Text>
            </View>

            <View style={styles.metaRight}>
              <Text style={styles.metaText}>
                Status: <Text style={badgeStyle as any}>{verificationState.label}</Text>
              </Text>

              {(verificationState.kind === "danger" || verificationState.kind === "warning") && (
                <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate("Profile" as any)}>
                  <Text style={styles.ctaBtnText}>
                    {verificationState.kind === "danger" ? "Upload DTI" : "Replace/Update DTI"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* KPI cards */}
          <View style={styles.kpiRow}>
            {kpis.map((k) => (
              <KPIBlock key={k.label} label={k.label} value={k.value} sub={k.sub} />
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
  screen: { flex: 1, flexDirection: "row", backgroundColor: "#f9fafb" },
  mainArea: { flex: 1, backgroundColor: "#f9fafb" },
  scrollRegion: { flex: 1 },
  scrollContent: { padding: 16 },
  pageHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  pageTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  pageSubTitle: { color: "#6b7280", fontSize: 13, marginTop: 4 },
  metaRight: { alignItems: "flex-end", gap: 8 },
  metaText: { fontSize: 12, color: "#6b7280", fontWeight: "500" },
  statusBadge: { fontWeight: "700", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: "hidden", fontSize: 12 },
  statusSuccess: { backgroundColor: "#dcfce7", color: "#14532d" },
  statusWarning: { backgroundColor: "#fef9c3", color: "#854d0e" },
  statusDanger: { backgroundColor: "#fee2e2", color: "#7f1d1d" },
  ctaBtn: { backgroundColor: "#111827", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  ctaBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 12 },
  kpiRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 24, gap: 8 },
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
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  smallMuted: { fontSize: 12, color: "#6b7280", fontWeight: "500" },
  footerArea: { alignItems: "center", marginTop: 16, paddingBottom: 40 },
  footerText: { fontSize: 12, color: "#6b7280" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#ffffff" }
});
