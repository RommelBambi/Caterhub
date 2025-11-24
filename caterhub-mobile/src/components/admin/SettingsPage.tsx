import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from 'react-native';

const COLORS = {
  primary: "#FF8000",
  text: "#1e293b",
  textLight: "#64748b",
  bg: "#f8fafc",
  white: "#ffffff",
  border: "#e2e8f0",
  hover: "#f1f5f9",
  success: "#22c55e",
  danger: "#dc2626",
  info: "#0ea5e9",
  warning: "#f59e0b",
};

export default function SettingsPage() {
  const [platformSettings, setPlatformSettings] = useState({
    platformName: 'CaterHub',
    supportEmail: 'support@caterhub.com',
  });

  const handleSavePlatformSettings = () => {
    // TODO: Implement actual save to database
    Alert.alert('Success', 'Platform settings saved successfully');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.pageTitle}>Settings</Text>

      {/* Platform Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Platform Settings</Text>
        <View style={styles.card}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Platform Name</Text>
            <TextInput
              style={styles.input}
              value={platformSettings.platformName}
              onChangeText={(text) => setPlatformSettings({ ...platformSettings, platformName: text })}
              placeholder="CaterHub"
            />
            <Text style={styles.helpText}>Name displayed to users</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Support Email</Text>
            <TextInput
              style={styles.input}
              value={platformSettings.supportEmail}
              onChangeText={(text) => setPlatformSettings({ ...platformSettings, supportEmail: text })}
              keyboardType="email-address"
              placeholder="support@caterhub.com"
            />
            <Text style={styles.helpText}>Contact email for customer support</Text>
          </View>

          <Pressable style={styles.saveButton} onPress={handleSavePlatformSettings}>
            <Text style={styles.saveButtonText}>Save Settings</Text>
          </Pressable>
        </View>
      </View>

      {/* Platform Fee Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Platform Fee Structure</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Base Fee:</Text>
            <Text style={styles.infoValue}>3%</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>At 300k+ GMV:</Text>
            <Text style={styles.infoValue}>2% (next month)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>At 500k+ GMV:</Text>
            <Text style={styles.infoValue}>1% (next month)</Text>
          </View>
          <Text style={styles.helpText}>
            Platform fees are automatically calculated based on caterer GMV. Fees are tiered and applied to the next month after reaching thresholds.
          </Text>
        </View>
      </View>

      {/* System Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Information</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version:</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Database:</Text>
            <Text style={styles.infoValue}>Supabase PostgreSQL</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 24,
    color: COLORS.text,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: COLORS.text,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  helpText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.textLight,
  },
});
