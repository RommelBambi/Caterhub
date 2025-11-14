import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../store/auth';
import { isWeb } from '../../utils/platform';
import TopBar from '../../components/admin/TopBar';
import RecruitmentPage from '../../components/admin/RecruitmentPage';
import ApplicationDetailModal from '../../components/admin/ApplicationDetailModal';
import UsersPage from '../../components/admin/UsersPage';
import BookingsPage from '../../components/admin/BookingsPage';
import PaymentsPage from '../../components/admin/PaymentsPage';
import AnalyticsPage from '../../components/admin/AnalyticsPage';
import SettingsPage from '../../components/admin/SettingsPage';
import RefundsPage from '../../components/admin/RefundsPage';
import TicketsPage from '../../components/admin/TicketsPage';
import { supabase } from '../../services/supabase';

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
};

interface MenuItem {
  id: string;
  label: string;
  icon: string;
}

interface PartnerApplication {
  id: string;
  user_id: string | null;
  business_name: string;
  locations: any;
  website: string | null;
  owner_name: string;
  owner_phone: string;
  owner_email: string;
  telephone_number: string | null;
  contact_number: string | null;
  permits_ready: boolean;
  food_safety: boolean;
  agree_terms: boolean;
  notes: string | null;
  uploaded_documents: string[];
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
  updated_at: string;
}

function SidebarItem({
  label,
  icon,
  active,
  collapsed,
  onPress
}: {
  label: string;
  icon: string;
  active: boolean;
  collapsed: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.sidebarItem,
        active ? styles.sidebarItemActive : null,
        collapsed && styles.sidebarItemCollapsed
      ]}
    >
      <Ionicons 
        name={icon as any} 
        size={20} 
        color={active ? COLORS.primary : "#6b7280"} 
      />
      {!collapsed && (
        <Text
          style={[
            styles.sidebarItemText,
            active ? styles.sidebarItemTextActive : null
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export default function AdminDashboardScreen() {
  const { user, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>("dashboard");
  const [selectedApplication, setSelectedApplication] = useState<PartnerApplication | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    totalUsers: 0,
    activeBookings: 0,
    revenue: 0,
    loading: true
  });

  const menuItems: MenuItem[] = [
    { id: "dashboard", label: "Dashboard", icon: "grid-outline" },
    { id: "recruitment", label: "Recruitment", icon: "people-outline" },
    { id: "users", label: "Users", icon: "person-outline" },
    { id: "bookings", label: "Bookings", icon: "calendar-outline" },
    { id: "tickets", label: "Support Tickets", icon: "help-circle-outline" },
    { id: "payments", label: "Payments", icon: "card-outline" },
    { id: "analytics", label: "Analytics", icon: "bar-chart-outline" },
    { id: "settings", label: "Settings", icon: "settings-outline" },
    { id: "refunds", label: "Refunds", icon: "return-down-back-outline" },
  ];

  const fetchDashboardStats = async () => {
    try {
      // Fetch total users count
      const { count: usersCount, error: usersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (usersError) throw usersError;

      // Fetch active bookings count (this month)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: bookingsCount, error: bookingsError } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString())
        .in('status', ['confirmed', 'pending']);

      if (bookingsError) console.warn('Bookings fetch error:', bookingsError);

      // Fetch revenue (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('amount')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .eq('status', 'completed');

      if (paymentsError) console.warn('Payments fetch error:', paymentsError);

      const totalRevenue = paymentsData?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

      setDashboardStats({
        totalUsers: usersCount || 0,
        activeBookings: bookingsCount || 0,
        revenue: totalRevenue,
        loading: false
      });
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      setDashboardStats(prev => ({ ...prev, loading: false }));
    }
  };

  React.useEffect(() => {
    fetchDashboardStats();
  }, []);

  const handleApproveApplication = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from('partner_applications')
        .update({ status: 'Approved', updated_at: new Date().toISOString() })
        .eq('id', applicationId);

      if (error) throw error;
      
      // Trigger refresh of the recruitment page
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      console.error('Error approving application:', error);
      alert(error?.message || 'Failed to approve application');
    }
  };

  const handleRejectApplication = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from('partner_applications')
        .update({ status: 'Rejected', updated_at: new Date().toISOString() })
        .eq('id', applicationId);

      if (error) throw error;
      
      // Trigger refresh of the recruitment page
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      console.error('Error rejecting application:', error);
      alert(error?.message || 'Failed to reject application');
    }
  };

  const handleViewDetails = (app: PartnerApplication) => {
    setSelectedApplication(app);
    setDetailModalVisible(true);
  };

  const renderPageContent = () => {
    switch (currentPage) {
      case "dashboard":
        return (
          <View style={styles.dashboardContainer}>
            {/* Welcome Header */}
            <View style={styles.welcomeSection}>
              <View>
                <Text style={styles.welcomeTitle}>Welcome back, {user?.username || 'Admin'}!</Text>
                <Text style={styles.welcomeSubtitle}>
                  Here's what's happening with your platform today
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
                    <Ionicons name="people" size={24} color={COLORS.primary} />
                  </View>
                  <Ionicons name="trending-up-outline" size={16} color={COLORS.success} />
                </View>
                <Text style={styles.statLabel}>Total Users</Text>
                <Text style={[styles.statValue, { color: COLORS.primary }]}>
                  {dashboardStats.loading ? '...' : dashboardStats.totalUsers.toLocaleString()}
                </Text>
                <Text style={styles.statSub}>Registered users</Text>
              </View>

              <View style={[styles.statCard, styles.statCardSuccess]}>
                <View style={styles.statCardHeader}>
                  <View style={[styles.statIconContainer, { backgroundColor: COLORS.success + '15' }]}>
                    <Ionicons name="calendar" size={24} color={COLORS.success} />
                  </View>
                  <Ionicons name="trending-up-outline" size={16} color={COLORS.success} />
                </View>
                <Text style={styles.statLabel}>Active Bookings</Text>
                <Text style={[styles.statValue, { color: COLORS.success }]}>
                  {dashboardStats.loading ? '...' : dashboardStats.activeBookings.toLocaleString()}
                </Text>
                <Text style={styles.statSub}>This month</Text>
              </View>

              <View style={[styles.statCard, styles.statCardInfo]}>
                <View style={styles.statCardHeader}>
                  <View style={[styles.statIconContainer, { backgroundColor: COLORS.info + '15' }]}>
                    <Ionicons name="cash" size={24} color={COLORS.info} />
                  </View>
                  <Ionicons name="trending-up-outline" size={16} color={COLORS.success} />
                </View>
                <Text style={styles.statLabel}>Revenue</Text>
                <Text style={[styles.statValue, { color: COLORS.info }]}>
                  {dashboardStats.loading ? '...' : `₱${dashboardStats.revenue.toLocaleString()}`}
                </Text>
                <Text style={styles.statSub}>Last 30 days</Text>
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
                  onPress={() => setCurrentPage('recruitment')}
                >
                  <View style={[styles.quickActionIconContainer, { backgroundColor: COLORS.primary + '10' }]}>
                    <Ionicons name="person-add" size={28} color={COLORS.primary} />
                  </View>
                  <Text style={styles.quickActionLabel}>Review Applications</Text>
                </Pressable>
                <Pressable 
                  style={({ pressed }) => [
                    styles.quickActionCard,
                    pressed && styles.quickActionCardPressed
                  ]}
                  onPress={() => setCurrentPage('bookings')}
                >
                  <View style={[styles.quickActionIconContainer, { backgroundColor: COLORS.success + '10' }]}>
                    <Ionicons name="calendar" size={28} color={COLORS.success} />
                  </View>
                  <Text style={styles.quickActionLabel}>Manage Bookings</Text>
                </Pressable>
                <Pressable 
                  style={({ pressed }) => [
                    styles.quickActionCard,
                    pressed && styles.quickActionCardPressed
                  ]}
                  onPress={() => setCurrentPage('tickets')}
                >
                  <View style={[styles.quickActionIconContainer, { backgroundColor: COLORS.info + '10' }]}>
                    <Ionicons name="help-circle" size={28} color={COLORS.info} />
                  </View>
                  <Text style={styles.quickActionLabel}>Support Tickets</Text>
                </Pressable>
                <Pressable 
                  style={({ pressed }) => [
                    styles.quickActionCard,
                    pressed && styles.quickActionCardPressed
                  ]}
                  onPress={() => setCurrentPage('analytics')}
                >
                  <View style={[styles.quickActionIconContainer, { backgroundColor: COLORS.danger + '10' }]}>
                    <Ionicons name="bar-chart" size={28} color={COLORS.danger} />
                  </View>
                  <Text style={styles.quickActionLabel}>View Analytics</Text>
                </Pressable>
              </View>
            </View>
          </View>
        );
      case "recruitment":
        return (
          <View style={styles.sectionCard}>
            <RecruitmentPage onViewDetails={handleViewDetails} refreshTrigger={refreshTrigger} />
          </View>
        );
      case "bookings":
        return (
          <View style={styles.sectionCard}>
            <BookingsPage />
          </View>
        );
      case "users":
        return (
          <View style={styles.sectionCard}>
            <UsersPage refreshTrigger={refreshTrigger} />
          </View>
        );
      case "tickets":
        return (
          <View style={styles.sectionCard}>
            <TicketsPage />
          </View>
        );
      case "payments":
        return (
          <View style={styles.sectionCard}>
            <PaymentsPage />
          </View>
        );
      case "analytics":
        return (
          <View style={styles.sectionCard}>
            <AnalyticsPage />
          </View>
        );
      case "settings":
        return (
          <View style={styles.sectionCard}>
            <SettingsPage />
          </View>
        );
      case "refunds":
        return (
          <View style={styles.sectionCard}>
            <RefundsPage />
          </View>
        );
      default:
        const menuItem = menuItems.find(item => item.id === currentPage);
        return (
          <View style={styles.sectionCard}>
            <Text style={styles.pageTitle}>
              {menuItem?.label || "Page"}
            </Text>
            <Text style={styles.placeholderText}>This page is under development.</Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.screen}>
      {/* Sidebar */}
      {isWeb && (
        <View style={[styles.sidebar, sidebarCollapsed && styles.sidebarCollapsed]}>
          {/* Header with Logo and Toggle */}
          <View style={styles.header}>
            {!sidebarCollapsed && <Text style={styles.logoText}>CaterAdmin</Text>}
            <TouchableOpacity 
              onPress={() => setSidebarCollapsed(!sidebarCollapsed)} 
              style={styles.toggleButton}
            >
              <Ionicons 
                name={sidebarCollapsed ? "chevron-forward" : "chevron-back"} 
                size={20} 
                color="#6b7280" 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.navList}>
            {menuItems.map((item) => (
              <SidebarItem
                key={item.id}
                label={item.label}
                icon={item.icon}
                active={currentPage === item.id}
                collapsed={sidebarCollapsed}
                onPress={() => setCurrentPage(item.id)}
              />
            ))}
          </View>

          <Pressable style={styles.logoutRow} onPress={logout}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            {!sidebarCollapsed && <Text style={styles.logoutText}>Logout</Text>}
          </Pressable>
        </View>
      )}

      <View style={styles.mainArea}>
        <TopBar title={menuItems.find(item => item.id === currentPage)?.label || "Admin Panel"} />
        
        <ScrollView
          style={styles.scrollRegion}
          contentContainerStyle={styles.scrollContent}
        >
          {renderPageContent()}
          
          {/* Footer */}
          {isWeb && (
            <View style={styles.footerArea}>
              <Text style={styles.footerText}>© 2025 CaterHub • Admin Panel</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Application Detail Modal */}
      <ApplicationDetailModal
        application={selectedApplication}
        visible={detailModalVisible}
        onClose={() => {
          setDetailModalVisible(false);
          setSelectedApplication(null);
        }}
        onApprove={handleApproveApplication}
        onReject={handleRejectApplication}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    flexDirection: Platform.OS === 'web' ? "row" : "column",
    backgroundColor: "#f9fafb"
  },
  sidebar: {
    width: 240,
    backgroundColor: "#ffffff",
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb",
    paddingTop: 20,
    paddingHorizontal: 16,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3
  },
  sidebarCollapsed: {
    width: 70,
    paddingHorizontal: 12
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6"
  },
  logoText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FF8000",
    letterSpacing: -0.5
  },
  toggleButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb"
  },
  navList: {
    flexGrow: 1
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
    gap: 12,
    transition: "all 0.2s"
  },
  sidebarItemCollapsed: {
    justifyContent: "center",
    paddingHorizontal: 16
  },
  sidebarItemActive: {
    backgroundColor: "#fff5e6",
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary
  },
  sidebarItemText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600"
  },
  sidebarItemTextActive: {
    color: COLORS.primary,
    fontWeight: "700"
  },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingVertical: 14,
    marginTop: 16,
    borderRadius: 8,
    paddingHorizontal: 12
  },
  logoutText: {
    color: "#ef4444",
    fontWeight: "600",
    fontSize: 14
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
    paddingBottom: Platform.OS === 'web' ? 16 : 100
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
  statCardInfo: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.info
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
    marginTop: 8
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
  footerArea: {
    alignItems: "center",
    marginTop: 16,
    paddingBottom: 40
  },
  footerText: {
    fontSize: 12,
    color: "#6b7280"
  },
  placeholderText: {
    color: COLORS.textLight,
    fontSize: 16,
  },
});

