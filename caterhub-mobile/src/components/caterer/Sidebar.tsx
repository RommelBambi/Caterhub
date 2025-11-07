import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PartnerStackParamList } from "../../navigation/caterer/PartnerNav";
import { useAuth } from "../../store/auth";
import { COLORS } from "../../constants/colors";

type NavKey = "PartnerDashboard" | "PartnerOrders" | "PartnerManagePackages" | "PartnerSettings" | "PartnerWallet";

export default function Sidebar() {
  const navigation =
    useNavigation<NativeStackNavigationProp<PartnerStackParamList>>();
  const route = useRoute();
  const current = route.name as NavKey | string;
  const { logout } = useAuth();

  function go(screen: NavKey) {
    if (screen !== current) {
      navigation.navigate(screen as any);
    }
  }

  async function handleLogout() {
    await logout();
  }

  return (
    <View style={styles.sidebar}>
      <Text style={styles.logoText}>CaterHub</Text>

      <View style={styles.navList}>
        <SidebarItem
          label="Dashboard"
          active={current === "PartnerDashboard"}
          onPress={() => go("PartnerDashboard")}
        />
        <SidebarItem
          label="Orders"
          active={current === "PartnerOrders"}
          onPress={() => go("PartnerOrders")}
        />
        <SidebarItem
          label="Manage Packages"
          active={current === "PartnerManagePackages"}
          onPress={() => go("PartnerManagePackages")}
        />
        <SidebarItem
          label="Settings"
          active={current === "PartnerSettings"}
          onPress={() => go("PartnerSettings")}
        />
        <SidebarItem
          label="Wallet"
          active={current === "PartnerWallet"}
          onPress={() => go("PartnerWallet")}
        />
      </View>

      <Pressable style={styles.logoutRow} onPress={handleLogout}>
        <Text style={styles.logoutText}>⏻ Logout</Text>
      </Pressable>
    </View>
  );
}

function SidebarItem({
  label,
  active,
  onPress
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.sidebarItem,
        active ? styles.sidebarItemActive : null
      ]}
    >
      <View style={styles.sidebarBullet} />
      <Text
        style={[
          styles.sidebarItemText,
          active ? styles.sidebarItemTextActive : null
        ]}
      >
        {label}
      </Text>
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
  logoText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FF8000",
    marginBottom: 16
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
    marginBottom: 4
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
  sidebarBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginRight: 8
  },
  logoutRow: {
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

