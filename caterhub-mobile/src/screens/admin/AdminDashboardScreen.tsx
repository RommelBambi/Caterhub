import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../store/auth';
import RecruitmentPage from '../../components/admin/RecruitmentPage';
import ApplicationDetailModal from '../../components/admin/ApplicationDetailModal';
import UsersPage from '../../components/admin/UsersPage';
import BookingsPage from '../../components/admin/BookingsPage';
import PaymentsPage from '../../components/admin/PaymentsPage';
import AnalyticsPage from '../../components/admin/AnalyticsPage';
import SettingsPage from '../../components/admin/SettingsPage';
import RefundsPage from '../../components/admin/RefundsPage';
import { supabase } from '../../services/supabase';

const COLORS = {
  primary: "#FF8000",
  text: "#1e293b",
  textLight: "#64748b",
  bg: "#f8fafc",
  white: "#ffffff",
  border: "#e2e8f0",
  hover: "#f1f5f9",
  success: "#22c55e",
  danger: "#dc2626",
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

export default function AdminDashboardScreen() {
  const { user, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>("dashboard");
  const [selectedApplication, setSelectedApplication] = useState<PartnerApplication | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const menuItems: MenuItem[] = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "recruitment", label: "Recruitment", icon: "👥" },
    { id: "bookings", label: "Bookings", icon: "📅" },
    { id: "users", label: "Users", icon: "👤" },
    { id: "payments", label: "Payments", icon: "💳" },
    { id: "analytics", label: "Analytics", icon: "📈" },
    { id: "settings", label: "Settings", icon: "⚙️" },
    { id: "refunds", label: "Refunds", icon: "🔄" },
  ];

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
          <View style={styles.contentContainer}>
            <Text style={styles.pageTitle}>Dashboard</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total Users</Text>
                <Text style={[styles.statValue, { color: COLORS.primary }]}>1,234</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Active Bookings</Text>
                <Text style={[styles.statValue, { color: COLORS.success }]}>89</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Revenue</Text>
                <Text style={[styles.statValue, { color: COLORS.info }]}>₱45,678</Text>
              </View>
            </View>
          </View>
        );
      case "recruitment":
        return (
          <View style={styles.contentContainer}>
            <RecruitmentPage onViewDetails={handleViewDetails} refreshTrigger={refreshTrigger} />
          </View>
        );
      case "bookings":
        return (
          <View style={styles.contentContainer}>
            <BookingsPage />
          </View>
        );
      case "users":
        return (
          <View style={styles.contentContainer}>
            <UsersPage refreshTrigger={refreshTrigger} />
          </View>
        );
      case "payments":
        return (
          <View style={styles.contentContainer}>
            <PaymentsPage />
          </View>
        );
      case "analytics":
        return (
          <View style={styles.contentContainer}>
            <AnalyticsPage />
          </View>
        );
      case "settings":
        return (
          <View style={styles.contentContainer}>
            <SettingsPage />
          </View>
        );
      case "refunds":
        return (
          <View style={styles.contentContainer}>
            <RefundsPage />
          </View>
        );
      default:
        const menuItem = menuItems.find(item => item.id === currentPage);
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.pageTitle}>
              {menuItem?.label || "Page"}
            </Text>
            <Text style={styles.placeholderText}>This page is under development.</Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Sidebar */}
      {!sidebarCollapsed && (
        <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.sidebarTitle}>
            CaterHub Admin
          </Text>
          <Text style={styles.sidebarSubtitle}>Welcome, {user?.username}</Text>
        </View>

        <ScrollView style={styles.menu}>
          {menuItems.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setCurrentPage(item.id)}
              style={[
                styles.menuItem,
                currentPage === item.id && styles.menuItemActive,
              ]}
            >
              <Text style={styles.menuIcon}>
                {item.icon}
              </Text>
              <Text
                style={[
                  styles.menuLabel,
                  currentPage === item.id && styles.menuLabelActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.sidebarFooter}>
          <Pressable
            onPress={logout}
            style={styles.logoutButton}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </Pressable>
        </View>
        </View>
      )}

      <Pressable
        onPress={() => setSidebarCollapsed((prev) => !prev)}
        style={[styles.sidebarToggle, sidebarCollapsed && styles.sidebarToggleCollapsed]}
      >
        <Ionicons
          name={sidebarCollapsed ? 'chevron-forward' : 'chevron-back'}
          size={20}
          color={COLORS.textLight}
        />
      </Pressable>

      {/* Main Content */}
      <ScrollView style={styles.mainContent}>
        {renderPageContent()}
      </ScrollView>

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
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
  },
  sidebar: {
    width: 280,
    backgroundColor: COLORS.white,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    paddingVertical: 24,
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarHeader: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sidebarTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.primary,
    margin: 0,
  },
  sidebarSubtitle: {
    marginTop: 4,
    color: COLORS.textLight,
    fontSize: 14,
  },
  menu: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
    backgroundColor: 'transparent',
  },
  menuItemActive: {
    backgroundColor: COLORS.primary + '10',
  },
  menuIcon: {
    fontSize: 20,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  menuLabelActive: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  sidebarFooter: {
    paddingHorizontal: 24,
  },
  logoutButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.danger,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: COLORS.danger,
    fontWeight: '600',
    fontSize: 14,
  },
  sidebarToggle: {
    width: 20,
    backgroundColor: COLORS.white,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  sidebarToggleCollapsed: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 10,
  },
  mainContent: {
    flex: 1,
    padding: 24,
  },
  contentContainer: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 24,
    color: COLORS.text,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  statCard: {
    flex: 1,
    minWidth: 250,
    backgroundColor: COLORS.white,
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statLabel: {
    marginBottom: 12,
    color: COLORS.text,
    fontSize: 14,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '900',
    margin: 0,
  },
  placeholderText: {
    color: COLORS.textLight,
    fontSize: 16,
  },
});

