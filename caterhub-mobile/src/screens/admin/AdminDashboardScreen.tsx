import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, Platform, Alert } from 'react-native';
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
    subscriptionRevenue: 0,
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
  ];

  const fetchDashboardStats = async () => {
    try {
      // Fetch total users count
      const { count: usersCount, error: usersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (usersError) throw usersError;

      // Fetch active bookings count (this month) - using correct uppercase status values
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: bookingsCount, error: bookingsError } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString())
        .in('status', ['CONFIRMED', 'PENDING', 'ON_THE_WAY']);

      if (bookingsError) console.warn('Bookings fetch error:', bookingsError);

      // Fetch platform fee revenue from completed bookings (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: bookingsData, error: bookingsDataError } = await supabase
        .from('bookings')
        .select('platform_fee_amount, platform_fee_percentage, deposit_amount, remaining_amount, delivery_fee, created_at, status')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .in('status', ['COMPLETED', 'CONFIRMED']);

      if (bookingsDataError) {
        console.warn('[AdminDashboard] Bookings data fetch error:', bookingsDataError);
      }

      // Calculate platform fee revenue from bookings
      // This is the actual revenue the platform earns (not total booking value)
      let totalRevenue = 0;
      if (bookingsData && bookingsData.length > 0) {
        console.log('[AdminDashboard] Found bookings:', bookingsData.length);
        totalRevenue = bookingsData.reduce((sum, booking) => {
          let platformFee = booking.platform_fee_amount || 0;
          
          // If platform_fee_amount is not set, calculate it from the booking amounts
          if (platformFee === 0 && booking.platform_fee_percentage) {
            const deposit = booking.deposit_amount || 0;
            const remaining = booking.remaining_amount || 0;
            const deliveryFee = booking.delivery_fee || 0;
            const totalAmount = deposit + remaining + deliveryFee;
            platformFee = totalAmount * (booking.platform_fee_percentage / 100);
            console.log('[AdminDashboard] Calculated platform fee:', {
              totalAmount,
              percentage: booking.platform_fee_percentage,
              platformFee
            });
          }
          
          return sum + platformFee;
        }, 0);
        console.log('[AdminDashboard] Total platform revenue:', totalRevenue);
      } else {
        console.log('[AdminDashboard] No bookings found in last 30 days');
      }

      // Fallback: Also try to get revenue from payments table if bookings data is not available
      // Note: Payments are stored in bookings table, not a separate payments table
      // Revenue is already calculated from bookings above

      // Fetch subscription revenue from active subscriptions
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('caterer_subscriptions')
        .select('amount')
        .eq('status', 'active');

      if (subscriptionsError) console.warn('Subscriptions fetch error:', subscriptionsError);

      const subscriptionRevenue = subscriptionsData?.reduce((sum, sub) => sum + (sub.amount || 0), 0) || 0;

      setDashboardStats({
        totalUsers: usersCount || 0,
        activeBookings: bookingsCount || 0,
        revenue: totalRevenue,
        subscriptionRevenue: subscriptionRevenue,
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

  // Refresh dashboard stats when navigating back to dashboard page
  React.useEffect(() => {
    if (currentPage === 'dashboard') {
      fetchDashboardStats();
    }
  }, [currentPage]);

  const handleApproveApplication = async (applicationId: string) => {
    console.log('[Admin] ===== handleApproveApplication CALLED =====');
    console.log('[Admin] Application ID:', applicationId);
    console.log('[Admin] Current user:', user?.email, 'Role:', user?.role);
    console.log('[Admin] Supabase client:', !!supabase);
    try {
      // First, get the current application to see its status
      const { data: currentApp, error: fetchError } = await supabase
        .from('partner_applications')
        .select('status')
        .eq('id', applicationId)
        .single();
      
      if (fetchError) {
        console.error('[Admin] Error fetching current application:', fetchError);
      } else {
        console.log('[Admin] Current application status:', currentApp?.status);
      }
      
      console.log('[Admin] Attempting to approve application:', applicationId);
      
      const { data, error } = await supabase
        .from('partner_applications')
        .update({ status: 'Approved', updated_at: new Date().toISOString() })
        .eq('id', applicationId)
        .select()
        .single();

      if (error) {
        console.error('[Admin] Error approving application:', error);
        console.error('[Admin] Error code:', error.code);
        console.error('[Admin] Error message:', error.message);
        console.error('[Admin] Error details:', JSON.stringify(error, null, 2));
        
        // Check for RLS policy issues
        if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
          Alert.alert(
            'Permission Denied',
            'You do not have permission to update application status. Please check your admin role and RLS policies.\n\nError: ' + error.message
          );
        } else {
          Alert.alert('Error', 'Failed to approve application: ' + (error.message || 'Unknown error'));
        }
        return;
      }

      if (!data) {
        console.warn('[Admin] Update succeeded but no data returned');
        Alert.alert('Warning', 'Update may have succeeded but could not verify. Please refresh the page.');
      } else {
        console.log('[Admin] Successfully approved application:', data.id, 'New status:', data.status);
        Alert.alert('Success', 'Application approved successfully!');
      }
      
      // Trigger refresh of the recruitment page
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      console.error('[Admin] Unexpected error approving application:', error);
      Alert.alert('Error', 'Failed to approve application: ' + (error?.message || 'Unknown error'));
    }
  };

  const handleRejectApplication = async (applicationId: string) => {
    try {
      // First, get the current application to see its status
      const { data: currentApp, error: fetchError } = await supabase
        .from('partner_applications')
        .select('status')
        .eq('id', applicationId)
        .single();
      
      if (fetchError) {
        console.error('[Admin] Error fetching current application:', fetchError);
      } else {
        console.log('[Admin] Current application status:', currentApp?.status);
      }
      
      console.log('[Admin] Attempting to reject application:', applicationId);
      
      const { data, error } = await supabase
        .from('partner_applications')
        .update({ status: 'Rejected', updated_at: new Date().toISOString() })
        .eq('id', applicationId)
        .select()
        .single();

      if (error) {
        console.error('[Admin] Error rejecting application:', error);
        console.error('[Admin] Error code:', error.code);
        console.error('[Admin] Error message:', error.message);
        console.error('[Admin] Error details:', JSON.stringify(error, null, 2));
        
        // Check for RLS policy issues
        if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
          Alert.alert(
            'Permission Denied',
            'You do not have permission to update application status. Please check your admin role and RLS policies.\n\nError: ' + error.message
          );
        } else {
          Alert.alert('Error', 'Failed to reject application: ' + (error.message || 'Unknown error'));
        }
        return;
      }

      if (!data) {
        console.warn('[Admin] Update succeeded but no data returned');
        Alert.alert('Warning', 'Update may have succeeded but could not verify. Please refresh the page.');
      } else {
        console.log('[Admin] Successfully rejected application:', data.id, 'New status:', data.status);
        Alert.alert('Success', 'Application rejected successfully!');
      }
      
      // Trigger refresh of the recruitment page
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      console.error('[Admin] Unexpected error rejecting application:', error);
      Alert.alert('Error', 'Failed to reject application: ' + (error?.message || 'Unknown error'));
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
                <View style={styles.statCardContent}>
                  <View style={styles.statCardLeft}>
                    <Text style={styles.statLabel}>TOTAL USERS</Text>
                    <Text style={[styles.statValue, { color: COLORS.primary }]}>
                      {dashboardStats.loading ? '...' : dashboardStats.totalUsers.toLocaleString()}
                    </Text>
                    <Text style={styles.statSub}>Registered users</Text>
                  </View>
                  <View style={[styles.statIconContainer, { backgroundColor: '#FFF5E6' }]}>
                    <Ionicons name="people" size={24} color={COLORS.primary} />
                  </View>
                </View>
              </View>

              <View style={[styles.statCard, styles.statCardSuccess]}>
                <View style={styles.statCardContent}>
                  <View style={styles.statCardLeft}>
                    <Text style={styles.statLabel}>ACTIVE BOOKINGS</Text>
                    <Text style={[styles.statValue, { color: COLORS.success }]}>
                      {dashboardStats.loading ? '...' : dashboardStats.activeBookings.toLocaleString()}
                    </Text>
                    <Text style={styles.statSub}>This month</Text>
                  </View>
                  <View style={[styles.statIconContainer, { backgroundColor: '#E6F7ED' }]}>
                    <Ionicons name="calendar" size={24} color={COLORS.success} />
                  </View>
                </View>
              </View>

              <View style={[styles.statCard, styles.statCardInfo]}>
                <View style={styles.statCardContent}>
                  <View style={styles.statCardLeft}>
                    <Text style={styles.statLabel}>PLATFORM REVENUE</Text>
                    <Text style={[styles.statValue, { color: COLORS.info }]}>
                      {dashboardStats.loading ? '...' : `₱${dashboardStats.revenue.toLocaleString()}`}
                    </Text>
                    <Text style={styles.statSub}>Platform fees (last 30 days)</Text>
                  </View>
                  <View style={[styles.statIconContainer, { backgroundColor: '#E0F2FE' }]}>
                    <Ionicons name="cash" size={24} color={COLORS.info} />
                  </View>
                </View>
              </View>

              <View style={[styles.statCard, styles.statCardWarning]}>
                <View style={styles.statCardContent}>
                  <View style={styles.statCardLeft}>
                    <Text style={styles.statLabel}>SUBSCRIPTION REVENUE</Text>
                    <Text style={[styles.statValue, { color: '#f59e0b' }]}>
                      {dashboardStats.loading ? '...' : `₱${dashboardStats.subscriptionRevenue.toLocaleString()}`}
                    </Text>
                    <Text style={styles.statSub}>From subscribed caterers</Text>
                  </View>
                  <View style={[styles.statIconContainer, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="star" size={24} color="#f59e0b" />
                  </View>
                </View>
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
                  <View style={[styles.quickActionIconContainer, { backgroundColor: '#FFF5E6' }]}>
                    <Ionicons name="person-add" size={26} color={COLORS.primary} />
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
                  <View style={[styles.quickActionIconContainer, { backgroundColor: '#E6F7ED' }]}>
                    <Ionicons name="calendar" size={26} color={COLORS.success} />
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
                  <View style={[styles.quickActionIconContainer, { backgroundColor: '#E0F2FE' }]}>
                    <Ionicons name="help-circle" size={26} color={COLORS.info} />
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
                  <View style={[styles.quickActionIconContainer, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="bar-chart" size={26} color={COLORS.danger} />
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
    fontSize: Platform.OS === 'web' ? 26 : 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6
  },
  welcomeSubtitle: {
    color: "#6b7280",
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontWeight: "400"
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
    borderColor: "#f0f0f0"
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
    borderRadius: 10,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f0f0f0"
  },
  statCardPrimary: {
    borderLeftWidth: 0
  },
  statCardSuccess: {
    borderLeftWidth: 0
  },
  statCardInfo: {
    borderLeftWidth: 0
  },
  statCardWarning: {
    borderLeftWidth: 0
  },
  statCardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flex: 1
  },
  statCardLeft: {
    flex: 1,
    marginRight: 12
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center"
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  statValue: {
    fontSize: Platform.OS === 'web' ? 30 : 26,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6
  },
  statSub: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
    fontWeight: "400"
  },
  quickActionsSection: {
    marginTop: 8
  },
  sectionTitle: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
    letterSpacing: -0.2
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
    borderRadius: 10,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
    gap: 10
  },
  quickActionCardPressed: {
    backgroundColor: "#f9fafb",
    transform: [{ scale: 0.98 }]
  },
  quickActionIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: "500",
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
  placeholderText: {
    color: COLORS.textLight,
    fontSize: 16,
  },
});

