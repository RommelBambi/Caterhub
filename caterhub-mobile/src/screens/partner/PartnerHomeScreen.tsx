import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { PartnerStackParamList } from "../../navigation/partner/PartnerNav";
import { useAuth } from "../../store/auth";

export default function PartnerHomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<PartnerStackParamList>>();
  const { token, user } = useAuth();

  // if already logged in as caterer, just send them straight to dashboard
  useEffect(() => {
    if (token && user?.role === 'CATER') {
      navigation.replace("PartnerDashboard" as any);
    }
  }, [token, user, navigation]);

  function handleLoginPress() {
    navigation.navigate("PartnerLoginModal" as any);
  }

  function handleSignupPress() {
    navigation.navigate("PartnerSignupModal" as any);
  }

  return (
    <View style={styles.wrap}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.centerContent}
      >
        <View style={styles.card}>
          <Text style={styles.appName}>CaterHub Partner</Text>
          <Text style={styles.tagline}>
            Accept orders, manage your packages, and handle events — all
            in one place.
          </Text>

          <View style={styles.btnRow}>
            <Pressable
              style={[styles.btn, styles.loginBtn]}
              onPress={handleLoginPress}
            >
              <Text style={styles.loginBtnText}>Login</Text>
            </Pressable>

            <Pressable
              style={[styles.btn, styles.signupBtn]}
              onPress={handleSignupPress}
            >
              <Text style={styles.signupBtnText}>Sign up</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.footerNote}>
          © 2025 CaterHub • Partner Console
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center"
  },
  centerContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 4
  },
  appName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center"
  },
  tagline: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20
  },
  btnRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap"
  },
  btn: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 120,
    alignItems: "center",
    marginHorizontal: 4,
    marginVertical: 4
  },
  loginBtn: {
    backgroundColor: "#9333ea",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 3
  },
  loginBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14
  },
  signupBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db"
  },
  signupBtnText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 14
  },
  footerNote: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 24
  }
});

