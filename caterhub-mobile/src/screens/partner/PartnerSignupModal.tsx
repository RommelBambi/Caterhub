import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PartnerStackParamList } from "../../navigation/partner/PartnerNav";
import { register } from "../../services/api";

export default function PartnerSignupModal() {
  const navigation =
    useNavigation<NativeStackNavigationProp<PartnerStackParamList>>();

  const [username, setUsername] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [dtiFileName, setDtiFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function pickDTI() {
    // TODO: add real document picker (expo-document-picker)
    setDtiFileName("DTI-Certificate.pdf");
  }

  async function handleSubmit() {
    if (username.trim().length < 3) {
      Alert.alert("Error", "Username must be at least 3 characters.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }
    if (!email.trim()) {
      Alert.alert("Error", "Email is required.");
      return;
    }
    // Note: DTI upload can be optional for now, or implement later

    try {
      setSubmitting(true);
      
      // Register with role='CATER'
      await register(email.trim(), password, username.trim(), "CATER");
      
      Alert.alert(
        "Success",
        "Account created! You can now log in."
      );
      
      navigation.replace("PartnerDashboard" as any);
    } catch (err: any) {
      Alert.alert(
        "Signup failed",
        err?.message || "Something went wrong while creating your account."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.backdrop}>
      <View style={styles.sheet}>
        <Text style={styles.header}>Become a CaterHub Partner</Text>
        <Text style={styles.subheader}>
          We'll review your documents and verify your catering business.
        </Text>

        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. kida_catering"
          placeholderTextColor="#6f6a87"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="At least 6 characters"
              placeholderTextColor="#6f6a87"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Confirm</Text>
            <TextInput
              style={styles.input}
              placeholder="Repeat password"
              placeholderTextColor="#6f6a87"
              secureTextEntry
              value={confirm}
              onChangeText={setConfirm}
            />
          </View>
        </View>

        <Text style={styles.label}>Email (required)</Text>
        <TextInput
          style={styles.input}
          placeholder="you@company.com"
          placeholderTextColor="#6f6a87"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Business name (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Kida Catering Services"
          placeholderTextColor="#6f6a87"
          value={businessName}
          onChangeText={setBusinessName}
        />

        <View style={styles.uploadCard}>
          <Text style={styles.uploadTitle}>DTI Certificate (optional)</Text>
          <Text style={styles.uploadDesc}>
            Upload a clear copy of your DTI Certificate. Accepted: PDF / JPG /
            PNG.
          </Text>

          <Pressable style={styles.uploadBtn} onPress={pickDTI}>
            <Text style={styles.uploadBtnText}>
              {dtiFileName
                ? `Selected: ${dtiFileName}`
                : "Tap to select DTI file"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.rowEnd}>
          <Pressable
            style={[styles.btn, styles.btnGhost]}
            disabled={submitting}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.btnGhostText}>Cancel</Text>
          </Pressable>

          <Pressable
            style={[styles.btn, styles.btnPrimary]}
            disabled={submitting}
            onPress={handleSubmit}
          >
            <Text style={styles.btnPrimaryText}>
              {submitting ? "Submitting..." : "Create account"}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.tip}>
          After signup, your account will be created. You can manage your business profile in Settings.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  sheet: {
    width: "100%",
    maxWidth: 560,
    backgroundColor: "#1c142d",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 30 },
    shadowOpacity: 0.5,
    shadowRadius: 60,
    elevation: 20
  },
  header: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff"
  },
  subheader: {
    color: "#8b84a9",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 20
  },
  label: {
    fontWeight: "700",
    fontSize: 13,
    color: "#c7b5ff",
    marginTop: 10,
    marginBottom: 4
  },
  input: {
    borderWidth: 1,
    borderColor: "#3a2f56",
    backgroundColor: "#2a2141",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#fff"
  },
  row: {
    flexDirection: "row",
    gap: 12
  },
  col: {
    flex: 1
  },
  uploadCard: {
    backgroundColor: "#2a2141",
    borderWidth: 1,
    borderColor: "#3a2f56",
    borderRadius: 14,
    padding: 14,
    marginTop: 16
  },
  uploadTitle: {
    fontWeight: "700",
    fontSize: 14,
    color: "#fff",
    marginBottom: 4
  },
  uploadDesc: {
    color: "#8b84a9",
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10
  },
  uploadBtn: {
    borderWidth: 1,
    borderColor: "#4c3a7a",
    backgroundColor: "#3a2f56",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  uploadBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff"
  },
  rowEnd: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 20
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 120,
    alignItems: "center"
  },
  btnGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#3a2f56"
  },
  btnGhostText: {
    color: "#c7b5ff",
    fontWeight: "600",
    fontSize: 14
  },
  btnPrimary: {
    backgroundColor: "#c836f9"
  },
  btnPrimaryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14
  },
  tip: {
    color: "#6f6a87",
    fontSize: 11,
    marginTop: 16
  }
});

