import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, Pressable, Alert, TextInput } from 'react-native';

interface User {
  id: string;
  email: string;
  username: string;
  role: 'CUSTOMER' | 'CATER' | 'ADMIN' | 'CUSTOM';
  location?: string | null;
  created_at: string;
  updated_at: string;
}

const COLORS_ADMIN = {
  primary: "#C836F9",
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

interface Props {
  user: User | null;
  visible: boolean;
  onClose: () => void;
  onSave: (userId: string, updates: { username?: string; email?: string; role?: string; location?: string | null }) => Promise<void>;
}

export default function UserEditModal({ user, visible, onClose, onSave }: Props) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'CUSTOMER' | 'CATER' | 'ADMIN' | 'CUSTOM'>('CUSTOMER');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
      setRole(user.role);
      setLocation(user.location || '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    // Validate
    if (!username.trim()) {
      Alert.alert('Error', 'Username is required');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Error', 'Valid email is required');
      return;
    }

    setSaving(true);
    try {
      await onSave(user.id, {
        username: username.trim(),
        email: email.trim(),
        role,
        location: location.trim() || null,
      });
      Alert.alert('Success', 'User updated successfully');
      onClose();
    } catch (error: any) {
      console.error('Error updating user:', error);
      Alert.alert('Error', error?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const formatRole = (r: string) => {
    switch (r) {
      case 'CUSTOMER': return 'Customer';
      case 'CATER': return 'Caterer';
      case 'ADMIN': return 'Admin';
      default: return r;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit User</Text>
            <Pressable onPress={onClose} style={styles.closeButton} disabled={saving}>
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.scrollContent}>
            {/* User ID (read-only) */}
            <View style={styles.section}>
              <Text style={styles.label}>User ID</Text>
              <Text style={styles.readOnlyValue} numberOfLines={1} ellipsizeMode="middle">
                {user.id}
              </Text>
            </View>

            {/* Username */}
            <View style={styles.section}>
              <Text style={styles.label}>Username *</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter username"
                placeholderTextColor={COLORS_ADMIN.textLight}
                editable={!saving}
              />
            </View>

            {/* Email */}
            <View style={styles.section}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email"
                placeholderTextColor={COLORS_ADMIN.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!saving}
              />
            </View>

            {/* Role */}
            <View style={styles.section}>
              <Text style={styles.label}>Role *</Text>
              <View style={styles.roleButtons}>
                {(['CUSTOMER', 'CATER', 'ADMIN'] as const).map((roleOption) => (
                  <Pressable
                    key={roleOption}
                    style={[
                      styles.roleButton,
                      role === roleOption && styles.roleButtonActive,
                      saving && styles.roleButtonDisabled,
                    ]}
                    onPress={() => !saving && setRole(roleOption)}
                    disabled={saving}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        role === roleOption && styles.roleButtonTextActive,
                      ]}
                    >
                      {formatRole(roleOption)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Location */}
            <View style={styles.section}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="Enter location (optional)"
                placeholderTextColor={COLORS_ADMIN.textLight}
                editable={!saving}
              />
            </View>

            {/* Read-only info */}
            <View style={styles.section}>
              <Text style={styles.label}>Joined</Text>
              <Text style={styles.readOnlyValue}>
                {new Date(user.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.modalActions}>
            <Pressable
              style={[styles.modalActionButton, styles.cancelButton]}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.modalActionButton, styles.saveButton, saving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS_ADMIN.white,
    borderRadius: 16,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS_ADMIN.border,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS_ADMIN.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS_ADMIN.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: COLORS_ADMIN.text,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS_ADMIN.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS_ADMIN.bg,
    borderWidth: 1,
    borderColor: COLORS_ADMIN.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS_ADMIN.text,
  },
  readOnlyValue: {
    backgroundColor: COLORS_ADMIN.bg,
    borderWidth: 1,
    borderColor: COLORS_ADMIN.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS_ADMIN.textLight,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  roleButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS_ADMIN.border,
    backgroundColor: COLORS_ADMIN.white,
  },
  roleButtonActive: {
    backgroundColor: COLORS_ADMIN.primary,
    borderColor: COLORS_ADMIN.primary,
  },
  roleButtonDisabled: {
    opacity: 0.5,
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS_ADMIN.text,
  },
  roleButtonTextActive: {
    color: COLORS_ADMIN.white,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS_ADMIN.border,
  },
  modalActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS_ADMIN.bg,
    borderWidth: 1,
    borderColor: COLORS_ADMIN.border,
  },
  cancelButtonText: {
    color: COLORS_ADMIN.text,
    fontWeight: '600',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: COLORS_ADMIN.primary,
  },
  saveButtonText: {
    color: COLORS_ADMIN.white,
    fontWeight: '600',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

