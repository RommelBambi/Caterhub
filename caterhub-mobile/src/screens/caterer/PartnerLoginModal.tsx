import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";

import { PartnerStackParamList } from "../../navigation/caterer/PartnerNav";
import { useAuth } from "../../store/auth";

export default function PartnerLoginModal() {
  const navigation =
    useNavigation<NativeStackNavigationProp<PartnerStackParamList>>();
  const { login } = useAuth();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter email and password.");
      return;
    }

    try {
      setLoading(true);
      await login(email.trim(), password);
      // Navigation will happen automatically via RootNav role detection
      navigation.replace("PartnerDashboard" as any);
    } catch (error: any) {
      Alert.alert("Login Failed", error?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    navigation.goBack();
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.modalCard}>
        <Text style={styles.title}>Log in to CaterHub Partner</Text>
        <Text style={styles.subtitle}>
          Enter your credentials to access your dashboard.
        </Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="your@email.com"
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter password"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <View style={styles.buttonRow}>
          <Pressable style={[styles.button, styles.cancelBtn]} onPress={handleCancel}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>

          <Pressable style={[styles.button, styles.loginBtn]} onPress={handleLogin} disabled={loading}>
            <Text style={styles.loginBtnText}>{loading ? "Logging in..." : "Login"}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 5
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827"
  },
  subtitle: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 16
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
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 24,
    flexWrap: "wrap"
  },
  button: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 90,
    alignItems: "center",
    marginLeft: 8
  },
  cancelBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db"
  },
  cancelBtnText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 14
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
  }
});

