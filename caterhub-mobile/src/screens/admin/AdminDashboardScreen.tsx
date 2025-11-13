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
          <View style={styles.pageHeaderRow}>
            <View style={styles.pageHeaderLeft}>
              <Text style={styles.pageTitle}>Dashboard Overview</Text>
              <Text style={styles.pageSubTitle}>
                Welcome back, {user?.username}
              </Text>
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total Users</Text>
                <Text style={[styles.statValue, { color: COLORS.primary }]}>
                  {dashboardStats.loading ? '...' : dashboardStats.totalUsers.toLocaleString()}
                </Text>
                <Text style={styles.statSub}>Registered users</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Active Bookings</Text>
                <Text style={[styles.statValue, { color: COLORS.success }]}>
                  {dashboardStats.loading ? '...' : dashboardStats.activeBookings.toLocaleString()}
                </Text>
                <Text style={styles.statSub}>This month</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Revenue</Text>
                <Text style={[styles.statValue, { color: COLORS.info }]}>
                  {dashboardStats.loading ? '...' : `₱${dashboardStats.revenue.toLocaleString()}`}
                </Text>
                <Text style={styles.statSub}>Last 30 days</Text>
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
    width: 220,
    backgroundColor: "#ffffff",
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb",
    paddingTop: 16,
    paddingHorizontal: 12,
    justifyContent: "space-between"
  },
  sidebarCollapsed: {
    width: 70,
    paddingHorizontal: 8
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16
  },
  logoText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FF8000"
  },
  toggleButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: "#f3f4f6"
  },
  navList: {
    flexGrow: 1
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 4,
    gap: 12
  },
  sidebarItemCollapsed: {
    justifyContent: "center",
    paddingHorizontal: 12
  },
  sidebarItemActive: {
    backgroundColor: "#fff5e6"
  },
  sidebarItemText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600"
  },
  sidebarItemTextActive: {
    color: COLORS.primary
  },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingVertical: 12,
    marginTop: 16
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
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Platform.OS === 'web' ? 16 : 8,
    marginTop: 16
  },
  statCard: {
    flex: Platform.OS === 'web' ? 1 : 0,
    flexBasis: Platform.OS === 'web' ? 'auto' : '30%',
    maxWidth: Platform.OS === 'web' ? undefined : '30%',
    minWidth: Platform.OS === 'web' ? 200 : 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: Platform.OS === 'web' ? 8 : 8,
    paddingVertical: Platform.OS === 'web' ? 16 : 12,
    paddingHorizontal: Platform.OS === 'web' ? 16 : 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: Platform.OS === 'web' ? 10 : 2 },
    shadowOpacity: 0.05,
    shadowRadius: Platform.OS === 'web' ? 20 : 4,
    elevation: 2
  },
  statLabel: {
    fontSize: Platform.OS === 'web' ? 12 : 10,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: Platform.OS === 'web' ? 8 : 4
  },
  statValue: {
    fontSize: Platform.OS === 'web' ? 24 : 16,
    fontWeight: "700",
    color: "#111827"
  },
  statSub: {
    fontSize: Platform.OS === 'web' ? 12 : 9,
    color: "#6b7280",
    marginTop: Platform.OS === 'web' ? 4 : 2
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

