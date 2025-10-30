import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { useAuth } from '../../store/auth';

const COLORS = {
  primary: "#C836F9",
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

export default function AdminDashboardScreen() {
  const { user, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>("dashboard");

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
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.sidebarTitle}>CaterHub Admin</Text>
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
              <Text style={styles.menuIcon}>{item.icon}</Text>
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

      {/* Main Content */}
      <ScrollView style={styles.mainContent}>
        {renderPageContent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    minHeight: '100vh',
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

