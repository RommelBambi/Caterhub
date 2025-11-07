import React from "react";
import { View, Text, StyleSheet, ScrollView, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Sidebar from "../../components/caterer/Sidebar";
import TopBar from "../../components/caterer/TopBar";
import BottomNav from "../../components/caterer/BottomNav";
import { PartnerStackParamList } from "../../navigation/caterer/PartnerNav";
import { useAuth } from "../../store/auth";
import { isWeb } from "../../utils/platform";
import { COLORS } from "../../constants/colors";

export default function PartnerWalletScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PartnerStackParamList>>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      {isWeb && <Sidebar />}

      <View style={styles.mainArea}>
        <TopBar title="Wallet" />

        <ScrollView
          style={styles.scrollRegion}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.pageHeaderRow}>
            <View style={styles.pageHeaderLeft}>
              <Text style={styles.pageTitle}>Wallet</Text>
              <Text style={styles.pageSubTitle}>
                Manage your payment methods and earnings
              </Text>
            </View>
          </View>

          {/* Coming Soon Card */}
          <View style={styles.card}>
            <View style={styles.comingSoonContainer}>
              <Ionicons name="wallet" size={64} color={COLORS.primary} />
              <Text style={styles.comingSoonTitle}>Payment Methods</Text>
              <Text style={styles.comingSoonText}>
                Payment methods and wallet features are coming soon. You'll be able to:
              </Text>
              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  <Text style={styles.featureText}>Add payment methods</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  <Text style={styles.featureText}>View earnings and transactions</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  <Text style={styles.featureText}>Withdraw funds</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  <Text style={styles.featureText}>Track payment history</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Footer */}
          {isWeb && (
            <View style={styles.footerArea}>
              <Text style={styles.footerText}>© 2025 CaterHub • Partner</Text>
            </View>
          )}
        </ScrollView>
      </View>
      {!isWeb && <BottomNav />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    flexDirection: Platform.OS === 'web' ? "row" : "column",
    backgroundColor: "#f9fafb"
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
  pageHeaderRow: {
    flexDirection: Platform.OS === 'web' ? "row" : "column",
    justifyContent: Platform.OS === 'web' ? "space-between" : "flex-start",
    alignItems: Platform.OS === 'web' ? "flex-start" : "flex-start",
    marginBottom: 24,
    gap: Platform.OS === 'web' ? 0 : 12
  },
  pageHeaderLeft: {
    flex: 1
  },
  pageTitle: {
    fontSize: Platform.OS === 'web' ? 24 : 28,
    fontWeight: "700",
    color: "#111827"
  },
  pageSubTitle: {
    color: "#6b7280",
    fontSize: Platform.OS === 'web' ? 14 : 15,
    marginTop: 4
  },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: Platform.OS === 'web' ? 12 : 16,
    padding: Platform.OS === 'web' ? 24 : 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: Platform.OS === 'web' ? 2 : 4 },
    shadowOpacity: 0.05,
    shadowRadius: Platform.OS === 'web' ? 8 : 12,
    elevation: 2
  },
  comingSoonContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Platform.OS === 'web' ? 40 : 32
  },
  comingSoonTitle: {
    fontSize: Platform.OS === 'web' ? 20 : 22,
    fontWeight: "700",
    color: "#111827",
    marginTop: 16,
    marginBottom: 12
  },
  comingSoonText: {
    fontSize: Platform.OS === 'web' ? 14 : 15,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22
  },
  featuresList: {
    width: "100%",
    maxWidth: 400,
    gap: 12
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8
  },
  featureText: {
    fontSize: Platform.OS === 'web' ? 14 : 15,
    color: "#374151",
    flex: 1
  },
  footerArea: {
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: "center"
  },
  footerText: {
    fontSize: 12,
    color: "#9ca3af"
  }
});

