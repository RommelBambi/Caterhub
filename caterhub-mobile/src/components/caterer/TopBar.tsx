import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { PartnerStackParamList } from "../../navigation/caterer/PartnerNav";
import { useAuth } from "../../store/auth";

type TopBarProps = {
  title?: string;
};

export default function TopBar({ title }: TopBarProps) {
  const navigation =
    useNavigation<NativeStackNavigationProp<PartnerStackParamList>>();
  const { user } = useAuth();

  function handleProfilePress() {
    navigation.navigate("PartnerSettings" as any);
  }

  function handleNotifPress() {
    // TODO: notifications
  }

  const businessName = user?.username || "Your Catering";

  return (
    <View style={styles.wrap}>
      <View style={styles.leftCol}>
        <Text style={styles.screenTitle}>{title ?? ""}</Text>
      </View>

      <View style={styles.rightCol}>
        <Pressable style={styles.iconBtn} onPress={handleNotifPress}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>🔔</Text>
          </View>
        </Pressable>

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
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  leftCol: {
    flexShrink: 1,
    paddingRight: 12
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827"
  },
  rightCol: {
    flexDirection: "row",
    alignItems: "center"
  },
  iconBtn: {
    marginRight: 12
  },
  iconCircle: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 999,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center"
  },
  iconEmoji: {
    fontSize: 16
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
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 9999,
    backgroundColor: "#9333ea",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3
  },
  avatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14
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

