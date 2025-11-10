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
  }
});

