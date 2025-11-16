import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PartnerStackParamList } from "../../navigation/caterer/PartnerNav";
import { useAuth } from "../../store/auth";
import { isWeb } from "../../utils/platform";
import NotificationBell from "../common/NotificationBell";

type TopBarProps = {
  title?: string;
};

export default function TopBar({ title }: TopBarProps) {
  const navigation =
    useNavigation<NativeStackNavigationProp<PartnerStackParamList>>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  function handleProfilePress() {
    navigation.navigate("PartnerSettings" as any);
  }

  // Notification bell handles its own dropdown now

  const businessName = user?.username || "Your Catering";

  return (
    <View style={[styles.wrap, !isWeb && { paddingTop: insets.top + 10 }]}>
      <View style={styles.leftCol}>
        <Text style={styles.screenTitle}>{title ?? ""}</Text>
      </View>

      <View style={styles.rightCol}>
        <View style={styles.iconBtn}>
          <NotificationBell 
            color="#111827"
            size={Platform.OS === 'web' ? 20 : 22}
            userRole="caterer"
            navigation={navigation}
          />
        </View>

        {isWeb ? (
          <Pressable style={styles.profileBtn} onPress={handleProfilePress}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {businessName.charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={styles.profileTextCol}>
              <Text style={styles.profileNameText}>
                {businessName}
              </Text>
              <Text style={styles.profileSubText}>
                View / Edit Profile
              </Text>
            </View>
          </Pressable>
        ) : (
          <Pressable style={styles.profileBtnMobile} onPress={handleProfilePress}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {businessName.charAt(0).toUpperCase()}
              </Text>
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    paddingHorizontal: Platform.OS === 'web' ? 16 : 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  leftCol: {
    flexShrink: 1,
    paddingRight: 12,
    flex: 1
  },
  screenTitle: {
    fontSize: Platform.OS === 'web' ? 18 : 20,
    fontWeight: "700",
    color: "#111827"
  },
  rightCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: Platform.OS === 'web' ? 0 : 8
  },
  iconBtn: {
    marginRight: Platform.OS === 'web' ? 12 : 0
  },
  iconCircle: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 999,
    width: Platform.OS === 'web' ? 36 : 40,
    height: Platform.OS === 'web' ? 36 : 40,
    alignItems: "center",
    justifyContent: "center"
  },
  iconEmoji: {
    fontSize: Platform.OS === 'web' ? 16 : 18
  },
  profileBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: 140,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2
  },
  profileBtnMobile: {
    alignItems: "center",
    justifyContent: "center"
  },
  avatarCircle: {
    width: Platform.OS === 'web' ? 36 : 40,
    height: Platform.OS === 'web' ? 36 : 40,
    borderRadius: 9999,
    backgroundColor: "#FF8000",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Platform.OS === 'web' ? 10 : 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3
  },
  avatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: Platform.OS === 'web' ? 14 : 16
  },
  profileTextCol: {
    flexShrink: 1
  },
  profileNameText: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 13
  },
  profileSubText: {
    fontSize: 11,
    lineHeight: 14,
    color: "#6b7280",
    fontWeight: "500"
  }
});

