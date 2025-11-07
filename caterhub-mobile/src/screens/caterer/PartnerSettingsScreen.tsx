import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import Sidebar from "../../components/caterer/Sidebar";
import TopBar from "../../components/caterer/TopBar";
import BottomNav from "../../components/caterer/BottomNav";

import { PartnerStackParamList } from "../../navigation/caterer/PartnerNav";
import { useAuth } from "../../store/auth";
import { isWeb } from "../../utils/platform";
import { Platform } from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

// Extra business profile data aside from what's in user
// We persist this separately so you can extend it later.
type CatererProfile = {
  contactNumber: string;
  address: string;
  about: string;
};

// We'll store extra profile data per username.
// TODO: Replace with Supabase
async function loadProfile(username: string): Promise<CatererProfile> {
  try {
    const raw = await AsyncStorage.getItem(
      "caterhub_profile_" + username
    );
    if (!raw) {
      return {
        contactNumber: "",
        address: "",
        about: ""
      };
    }
    return JSON.parse(raw) as CatererProfile;
  } catch (e) {
    console.warn("loadProfile error", e);
    return {
      contactNumber: "",
      address: "",
      about: ""
    };
  }
}

// TODO: Replace with Supabase
async function saveProfile(username: string, data: CatererProfile) {
  try {
    await AsyncStorage.setItem(
      "caterhub_profile_" + username,
      JSON.stringify(data)
    );
  } catch (e) {
    console.warn("saveProfile error", e);
  }
}

export default function PartnerSettingsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<PartnerStackParamList>>();
  const { user, logout } = useAuth();

  // editable fields
  const [businessName, setBusinessName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [address, setAddress] = useState("");
  const [about, setAbout] = useState("");

  const [loaded, setLoaded] = useState(false);

  // Load current user + profile on mount
  useEffect(() => {
    if (!user) {
      navigation.replace("PartnerDashboard");
      return;
    }

    (async () => {
      setBusinessName(user.username); // Use username as default business name

      const prof = await loadProfile(user.username);
      setContactNumber(prof.contactNumber ?? "");
      setAddress(prof.address ?? "");
      setAbout(prof.about ?? "");

      setLoaded(true);
    })();
  }, [navigation, user]);

  async function handleSaveProfile() {
    if (!user) return;

    if (!businessName.trim()) {
      Alert.alert(
        "Missing business name",
        "Please enter your catering business name."
      );
      return;
    }

    // TODO: Save to Supabase instead of AsyncStorage
    // For now, just save extended profile info
    const newProfile: CatererProfile = {
      contactNumber: contactNumber.trim(),
      address: address.trim(),
      about: about.trim()
    };
    await saveProfile(user.username, newProfile);

    Alert.alert("Saved", "Your profile has been updated.");
  }

  async function handleLogout() {
    logout();
    navigation.reset({
      index: 0,
      routes: [{ name: "PartnerDashboard" }]
    });
  }

  if (!loaded || !user) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={{ color: "#6b6b6b" }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {isWeb && <Sidebar />}

      <View style={styles.mainArea}>
        <TopBar title="Catering Profile" />

        <ScrollView
          style={styles.scrollRegion}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.pageHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pageTitle}>Your Business Profile</Text>
              <Text style={styles.pageSubTitle}>
                This information will be shown to customers when they view
                your catering service.
              </Text>
            </View>

            <Pressable style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutBtnText}>Log out</Text>
            </Pressable>
          </View>

          {/* Business Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Business Information</Text>

            <Text style={styles.label}>Catering / Business Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Sevilla's Catering"
              placeholderTextColor="#9ca3af"
              value={businessName}
              onChangeText={setBusinessName}
            />

            <Text style={styles.label}>Contact Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 0917 123 4567"
              placeholderTextColor="#9ca3af"
              value={contactNumber}
              onChangeText={setContactNumber}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Address / Service Area</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Tayabas / Lucena / nearby areas"
              placeholderTextColor="#9ca3af"
              value={address}
              onChangeText={setAddress}
            />

            <Text style={styles.label}>About / Description</Text>
            <TextInput
              style={[styles.input, styles.aboutInput]}
              placeholder="Describe your specialties, capacity, style of service..."
              placeholderTextColor="#9ca3af"
              multiline
              value={about}
              onChangeText={setAbout}
            />

            <Pressable
              style={styles.saveBtn}
              onPress={handleSaveProfile}
            >
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </Pressable>
          </View>

          {/* Display / Preview Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Preview for Customers</Text>

            <View style={styles.previewHeaderRow}>
              <View style={styles.previewAvatar}>
                <Text style={styles.previewAvatarText}>
                  {businessName
                    ? businessName.charAt(0).toUpperCase()
                    : "?"}
                </Text>
              </View>

              <View style={{ flexShrink: 1 }}>
                <Text style={styles.previewNameText}>
                  {businessName || "Your Catering"}
                </Text>
                <Text style={styles.previewMetaText}>
                  {contactNumber
                    ? contactNumber
                    : "No contact number yet"}
                </Text>
                <Text style={styles.previewMetaText}>
                  {address ? address : "No service area set"}
                </Text>
              </View>
            </View>

            <Text style={styles.previewAboutHeader}>About</Text>
            <Text style={styles.previewAboutText}>
              {about
                ? about
                : "Tell customers what makes your catering special, what events you handle, and what they can expect."}
            </Text>
          </View>
        </ScrollView>
      </View>
      {!isWeb && <BottomNav />}
    </View>
  );
}

/* STYLES */

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
    paddingBottom: Platform.OS === 'web' ? 80 : 100
  },

  loadingWrap: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center"
  },

  pageHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    alignItems: "flex-start",
    marginBottom: 16
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827"
  },
  pageSubTitle: {
    color: "#6b7280",
    fontSize: 13,
    marginTop: 4,
    maxWidth: 300,
    lineHeight: 18
  },

  logoutBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2
  },
  logoutBtnText: {
    color: "#ef4444",
    fontWeight: "600",
    fontSize: 13
  },

  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12
  },

  label: {
    fontWeight: "600",
    fontSize: 13,
    color: "#111827",
    marginBottom: 4,
    marginTop: 12
  },

  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#111827"
  },
  aboutInput: {
    minHeight: 100,
    textAlignVertical: "top"
  },

  saveBtn: {
    backgroundColor: "#FF8000",
    borderRadius: 8,
    alignSelf: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
    marginTop: 24,
    marginBottom: 8
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14
  },

  previewHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16
  },
  previewAvatar: {
    width: 48,
    height: 48,
    borderRadius: 9999,
    backgroundColor: "#FF8000",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3
  },
  previewAvatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16
  },

  previewNameText: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 15
  },
  previewMetaText: {
    color: "#6b7280",
    fontSize: 13,
    marginTop: 2
  },

  previewAboutHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6
  },
  previewAboutText: {
    fontSize: 13,
    color: "#4b5563",
    lineHeight: 18
  }
});

