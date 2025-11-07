import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";

type Props = {
  label: string;
  value: string;
  sub?: string;
};

export default function KPIBlock({ label, value, sub }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: Platform.OS === 'web' ? 1 : 0,
    flexBasis: Platform.OS === 'web' ? 100 : 'auto',
    flex: Platform.OS === 'web' ? 1 : 0,
    width: Platform.OS === 'web' ? 'auto' : '100%',
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: Platform.OS === 'web' ? 8 : 12,
    paddingVertical: Platform.OS === 'web' ? 16 : 20,
    paddingHorizontal: Platform.OS === 'web' ? 16 : 16,
    marginBottom: Platform.OS === 'web' ? 0 : 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: Platform.OS === 'web' ? 10 : 2 },
    shadowOpacity: 0.05,
    shadowRadius: Platform.OS === 'web' ? 20 : 4,
    elevation: 2
  },
  label: {
    fontSize: Platform.OS === 'web' ? 12 : 13,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: Platform.OS === 'web' ? 8 : 10
  },
  value: {
    fontSize: Platform.OS === 'web' ? 24 : 28,
    fontWeight: "700",
    color: "#111827"
  },
  sub: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: Platform.OS === 'web' ? 4 : 6
  }
});

