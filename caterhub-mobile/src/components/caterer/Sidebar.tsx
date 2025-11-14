import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PartnerStackParamList } from "../../navigation/caterer/PartnerNav";
import { useAuth } from "../../store/auth";
import { COLORS } from "../../constants/colors";

type NavKey = "PartnerDashboard" | "PartnerOrders" | "PartnerManagePackages" | "PartnerSettings" | "PartnerWallet";

const NAV_ITEMS = [
  { key: "PartnerDashboard" as NavKey, label: "Dashboard", icon: "grid-outline" },
  { key: "PartnerOrders" as NavKey, label: "Orders", icon: "receipt-outline" },
  { key: "PartnerManagePackages" as NavKey, label: "Manage Packages", icon: "cube-outline" },
  { key: "PartnerSettings" as NavKey, label: "Settings", icon: "settings-outline" },
  { key: "PartnerWallet" as NavKey, label: "Wallet", icon: "wallet-outline" },
];

export default function Sidebar() {
  const navigation =
    useNavigation<NativeStackNavigationProp<PartnerStackParamList>>();
  const route = useRoute();
  const current = route.name as NavKey | string;
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  function go(screen: NavKey) {
    if (screen !== current) {
      navigation.navigate(screen as any);
    }
  }

  async function handleLogout() {
    await logout();
  }

  return (
    <View style={[styles.sidebar, collapsed && styles.sidebarCollapsed]}>
      {/* Header with Logo and Toggle */}
      <View style={styles.header}>
        {!collapsed && <Text style={styles.logoText}>CaterHub</Text>}
        <TouchableOpacity 
          onPress={() => setCollapsed(!collapsed)} 
          style={styles.toggleButton}
        >
          <Ionicons 
            name={collapsed ? "chevron-forward" : "chevron-back"} 
            size={20} 
            color="#6b7280" 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.navList}>
        {NAV_ITEMS.map((item) => (
          <SidebarItem
            key={item.key}
            label={item.label}
            icon={item.icon}
            active={current === item.key}
            collapsed={collapsed}
            onPress={() => go(item.key)}
          />
        ))}
      </View>

      <Pressable style={styles.logoutRow} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        {!collapsed && <Text style={styles.logoutText}>Logout</Text>}
      </Pressable>
    </View>
  );
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

const styles = StyleSheet.create({
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
  }
});

