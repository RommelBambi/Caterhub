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
      <Text style={styles.label} numberOfLines={2} ellipsizeMode="tail">{label}</Text>
      <Text style={styles.value} numberOfLines={1}>{value}</Text>
      {sub ? <Text style={styles.sub} numberOfLines={1} ellipsizeMode="tail">{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: Platform.OS === 'web' ? 1 : 0,
    flexBasis: Platform.OS === 'web' ? 'auto' : '30%',
    maxWidth: Platform.OS === 'web' ? undefined : '30%',
    minWidth: 0, // Important: allows flex items to shrink below content size
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: Platform.OS === 'web' ? 8 : 8,
    paddingVertical: Platform.OS === 'web' ? 16 : 8,
    paddingHorizontal: Platform.OS === 'web' ? 16 : 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: Platform.OS === 'web' ? 10 : 2 },
    shadowOpacity: 0.05,
    shadowRadius: Platform.OS === 'web' ? 20 : 4,
    elevation: 2
  },
  label: {
    fontSize: Platform.OS === 'web' ? 12 : 8,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: Platform.OS === 'web' ? 8 : 3
  },
  value: {
    fontSize: Platform.OS === 'web' ? 24 : 14,
    fontWeight: "700",
    color: "#111827"
  },
  sub: {
    fontSize: Platform.OS === 'web' ? 12 : 7,
    color: "#6b7280",
    marginTop: Platform.OS === 'web' ? 4 : 2
  }
});

