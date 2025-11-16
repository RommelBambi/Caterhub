import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PartnerStackParamList } from "../../navigation/caterer/PartnerNav";
import { useAuth } from "../../store/auth";
import { isWeb } from "../../utils/platform";

type NavKey = "PartnerDashboard" | "PartnerOrders" | "PartnerManagePackages" | "PartnerSettings" | "PartnerWallet";

export default function BottomNav() {
  const navigation = useNavigation<NativeStackNavigationProp<PartnerStackParamList>>();
  const route = useRoute();
  const current = route.name as NavKey | string;
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();

  if (isWeb) {
    return null; // Don't show on web
  }

  function go(screen: NavKey) {
    if (screen !== current) {
      navigation.navigate(screen as any);
    }
  }

  async function handleLogout() {
    await logout();
  }

  const navItems: { key: NavKey; label: string; icon: string; iconOutline: string }[] = [
    { key: "PartnerDashboard", label: "Dashboard", icon: "grid", iconOutline: "grid-outline" },
    { key: "PartnerOrders", label: "Orders", icon: "receipt", iconOutline: "receipt-outline" },
    { key: "PartnerManagePackages", label: "Packages", icon: "cube", iconOutline: "cube-outline" },
    { key: "PartnerWallet", label: "Wallet", icon: "wallet", iconOutline: "wallet-outline" },
    { key: "PartnerSettings", label: "Settings", icon: "settings", iconOutline: "settings-outline" },
  ];

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {navItems.map((item) => {
        // Keep Orders highlighted when viewing order details
        const isActive = current === item.key || (current === "PartnerOrderDetails" && item.key === "PartnerOrders");
        return (
          <Pressable
            key={item.key}
            style={styles.navItem}
            onPress={() => go(item.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isActive ? (item.icon as any) : (item.iconOutline as any)}
              size={24}
              color={isActive ? "#FF8000" : "#9ca3af"}
            />
            <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: 8,
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 4
  },
  navLabel: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "500"
  },
  navLabelActive: {
    color: "#FF8000",
    fontWeight: "600"
  }
});

