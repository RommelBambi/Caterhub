import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Switch } from 'react-native';

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
    commissionRate: '15',
    minBookingAmount: '5000',
    maxBookingAmount: '500000',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    newBookingAlerts: true,
    paymentAlerts: true,
    applicationAlerts: true,
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: '30',
    passwordExpiry: '90',
  });

  const handleSavePlatformSettings = () => {
    Alert.alert('Success', 'Platform settings saved successfully');
  };

  const handleSaveNotificationSettings = () => {
    Alert.alert('Success', 'Notification settings saved successfully');
  };

  const handleSaveSecuritySettings = () => {
    Alert.alert('Success', 'Security settings saved successfully');
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
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Support Email</Text>
            <TextInput
              style={styles.input}
              value={platformSettings.supportEmail}
              onChangeText={(text) => setPlatformSettings({ ...platformSettings, supportEmail: text })}
              keyboardType="email-address"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Commission Rate (%)</Text>
            <TextInput
              style={styles.input}
              value={platformSettings.commissionRate}
              onChangeText={(text) => setPlatformSettings({ ...platformSettings, commissionRate: text })}
              keyboardType="numeric"
            />
            <Text style={styles.helpText}>Platform commission on each completed booking</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Minimum Booking Amount (₱)</Text>
            <TextInput
              style={styles.input}
              value={platformSettings.minBookingAmount}
              onChangeText={(text) => setPlatformSettings({ ...platformSettings, minBookingAmount: text })}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Maximum Booking Amount (₱)</Text>
            <TextInput
              style={styles.input}
              value={platformSettings.maxBookingAmount}
              onChangeText={(text) => setPlatformSettings({ ...platformSettings, maxBookingAmount: text })}
              keyboardType="numeric"
            />
          </View>

          <Pressable style={styles.saveButton} onPress={handleSavePlatformSettings}>
            <Text style={styles.saveButtonText}>Save Platform Settings</Text>
          </Pressable>
        </View>
      </View>

      {/* Notification Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Settings</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.label}>Email Notifications</Text>
              <Text style={styles.helpText}>Receive notifications via email</Text>
            </View>
            <Switch
              value={notificationSettings.emailNotifications}
              onValueChange={(value) => setNotificationSettings({ ...notificationSettings, emailNotifications: value })}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.label}>SMS Notifications</Text>
              <Text style={styles.helpText}>Receive notifications via SMS</Text>
            </View>
            <Switch
              value={notificationSettings.smsNotifications}
              onValueChange={(value) => setNotificationSettings({ ...notificationSettings, smsNotifications: value })}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.label}>New Booking Alerts</Text>
              <Text style={styles.helpText}>Get notified of new bookings</Text>
            </View>
            <Switch
              value={notificationSettings.newBookingAlerts}
              onValueChange={(value) => setNotificationSettings({ ...notificationSettings, newBookingAlerts: value })}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.label}>Payment Alerts</Text>
              <Text style={styles.helpText}>Get notified of payment activities</Text>
            </View>
            <Switch
              value={notificationSettings.paymentAlerts}
              onValueChange={(value) => setNotificationSettings({ ...notificationSettings, paymentAlerts: value })}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.label}>Application Alerts</Text>
              <Text style={styles.helpText}>Get notified of new partner applications</Text>
            </View>
            <Switch
              value={notificationSettings.applicationAlerts}
              onValueChange={(value) => setNotificationSettings({ ...notificationSettings, applicationAlerts: value })}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>

          <Pressable style={styles.saveButton} onPress={handleSaveNotificationSettings}>
            <Text style={styles.saveButtonText}>Save Notification Settings</Text>
          </Pressable>
        </View>
      </View>

      {/* Security Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security Settings</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.label}>Two-Factor Authentication</Text>
              <Text style={styles.helpText}>Add an extra layer of security</Text>
            </View>
            <Switch
              value={securitySettings.twoFactorAuth}
              onValueChange={(value) => setSecuritySettings({ ...securitySettings, twoFactorAuth: value })}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Session Timeout (minutes)</Text>
            <TextInput
              style={styles.input}
              value={securitySettings.sessionTimeout}
              onChangeText={(text) => setSecuritySettings({ ...securitySettings, sessionTimeout: text })}
              keyboardType="numeric"
            />
            <Text style={styles.helpText}>Auto logout after inactivity</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Password Expiry (days)</Text>
            <TextInput
              style={styles.input}
              value={securitySettings.passwordExpiry}
              onChangeText={(text) => setSecuritySettings({ ...securitySettings, passwordExpiry: text })}
              keyboardType="numeric"
            />
            <Text style={styles.helpText}>Force password change after this period</Text>
          </View>

          <Pressable style={styles.saveButton} onPress={handleSaveSecuritySettings}>
            <Text style={styles.saveButtonText}>Save Security Settings</Text>
          </Pressable>
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
            <Text style={styles.infoLabel}>Environment:</Text>
            <Text style={styles.infoValue}>Production</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Database:</Text>
            <Text style={styles.infoValue}>Supabase PostgreSQL</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Updated:</Text>
            <Text style={styles.infoValue}>{new Date().toLocaleDateString()}</Text>
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 12,
  },
  switchLabel: {
    flex: 1,
    marginRight: 16,
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
