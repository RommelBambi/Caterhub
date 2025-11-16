import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

type PaymentMethod = 'gcash' | 'paymaya';

interface PaymentMethodOption {
  id: PaymentMethod;
  name: string;
  icon: string;
  color: string;
  description: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectMethod: (method: PaymentMethod) => void;
}

const paymentMethods: PaymentMethodOption[] = [
  {
    id: 'gcash',
    name: 'GCash',
    icon: 'wallet',
    color: '#007DFF',
    description: 'Fast and secure mobile wallet',
  },
  {
    id: 'paymaya',
    name: 'PayMaya',
    icon: 'card',
    color: '#00D632',
    description: 'Convenient e-wallet payment',
  },
];

export default function WithdrawalMethodModal({
  visible,
  onClose,
  onSelectMethod,
}: Props) {
  const handleSelect = (method: PaymentMethod) => {
    console.log('[WithdrawalMethodModal] Method selected:', method);
    onSelectMethod(method);
    onClose();
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
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Withdrawal Method</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </Pressable>
          </View>

          {/* Description */}
          <Text style={styles.modalDescription}>
            Choose how you want to receive your withdrawal
          </Text>

          {/* Payment Methods */}
          <View style={styles.methodsContainer}>
            {paymentMethods.map((method) => (
              <Pressable
                key={method.id}
                style={styles.methodCard}
                onPress={() => handleSelect(method.id)}
                android_ripple={{ color: COLORS.primary + '20' }}
              >
                <View style={styles.methodLeft}>
                  <View
                    style={[
                      styles.methodIconContainer,
                      { backgroundColor: method.color + '15' },
                    ]}
                  >
                    <Ionicons
                      name={method.icon as any}
                      size={28}
                      color={method.color}
                    />
                  </View>
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodName}>{method.name}</Text>
                    <Text style={styles.methodDescription}>
                      {method.description}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={COLORS.textLight}
                />
              </Pressable>
            ))}
          </View>

          {/* Info Note */}
          <View style={styles.infoNote}>
            <Ionicons
              name="information-circle"
              size={16}
              color={COLORS.primary}
            />
            <Text style={styles.infoText}>
              Withdrawals are processed within 1-3 business days
            </Text>
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
    justifyContent: 'flex-end',
    ...(Platform.OS === 'web' && {
      justifyContent: 'center',
      alignItems: 'center',
    }),
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...(Platform.OS === 'web' && {
      borderRadius: 16,
      maxWidth: 500,
      width: '90%',
    }),
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'web' ? 24 : 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  methodsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bg,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  methodIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.primary + '10',
    marginHorizontal: 20,
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 18,
  },
});

