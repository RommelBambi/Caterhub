import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';

const COLORS_ADMIN = {
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

interface Props {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}

export default function DeleteConfirmModal({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  loading = false,
}: Props) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
          </View>

          <View style={styles.body}>
            <Text style={styles.message}>{message}</Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>{cancelText}</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.confirmButton, loading && styles.buttonDisabled]}
              onPress={onConfirm}
              disabled={loading}
            >
              <Text style={styles.confirmButtonText}>
                {loading ? 'Deleting...' : confirmText}
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
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS_ADMIN.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS_ADMIN.text,
  },
  body: {
    padding: 20,
  },
  message: {
    fontSize: 16,
    color: COLORS_ADMIN.textLight,
    lineHeight: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS_ADMIN.border,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
  confirmButton: {
    backgroundColor: COLORS_ADMIN.danger,
  },
  confirmButtonText: {
    color: COLORS_ADMIN.white,
    fontWeight: '600',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

