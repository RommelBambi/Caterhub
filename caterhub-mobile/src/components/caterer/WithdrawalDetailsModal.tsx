import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

type PaymentMethod = 'gcash' | 'paymaya';

interface Props {
  visible: boolean;
  onClose: () => void;
  paymentMethod: PaymentMethod | null;
  availableBalance: number;
  onSubmit: (data: {
    amount: number;
    name: string;
    accountNumber: string;
  }) => Promise<void>;
}

export default function WithdrawalDetailsModal({
  visible,
  onClose,
  paymentMethod,
  availableBalance,
  onSubmit,
}: Props) {
  const [name, setName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    accountNumber?: string;
    amount?: string;
  }>({});

  useEffect(() => {
    if (visible) {
      // Reset form when modal opens
      console.log('[WithdrawalDetailsModal] Modal opened, resetting form');
      setName('');
      setAccountNumber('');
      setAmount('');
      setErrors({});
    }
  }, [visible]);

  // Debug: Log form state changes
  useEffect(() => {
    console.log('[WithdrawalDetailsModal] Form state changed', {
      name: name,
      accountNumber: accountNumber,
      amount: amount,
      loading: loading,
      errors: errors,
      hasAllFields: !!(name && accountNumber && amount),
    });
  }, [name, accountNumber, amount, loading, errors]);

  const formatCurrency = (value: number) => {
    return `₱${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleWithdrawAll = () => {
    setAmount(availableBalance.toFixed(2));
    setErrors((prev) => ({ ...prev, amount: undefined }));
  };

  const validateForm = (): boolean => {
    console.log('[WithdrawalDetailsModal] validateForm called', {
      name: name,
      accountNumber: accountNumber,
      amount: amount,
      availableBalance: availableBalance,
      paymentMethod: paymentMethod,
    });

    const newErrors: typeof errors = {};

    // Validate name
    if (!name.trim()) {
      newErrors.name = 'Name is required';
      console.log('[WithdrawalDetailsModal] Name validation failed: empty');
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
      console.log('[WithdrawalDetailsModal] Name validation failed: too short');
    } else {
      console.log('[WithdrawalDetailsModal] Name validation passed');
    }

    // Validate account number
    if (!accountNumber.trim()) {
      newErrors.accountNumber = `${paymentMethod === 'gcash' ? 'GCash' : 'PayMaya'} number is required`;
      console.log('[WithdrawalDetailsModal] Account number validation failed: empty');
    } else {
      // Validate phone number format (Philippines: 09XXXXXXXXX or +639XXXXXXXXX)
      const phoneRegex = /^(09|\+639)\d{9}$/;
      const cleanedNumber = accountNumber.replace(/\s|-/g, '');
      console.log('[WithdrawalDetailsModal] Account number validation', {
        original: accountNumber,
        cleaned: cleanedNumber,
        matches: phoneRegex.test(cleanedNumber),
      });
      if (!phoneRegex.test(cleanedNumber)) {
        newErrors.accountNumber = `Please enter a valid ${paymentMethod === 'gcash' ? 'GCash' : 'PayMaya'} number (e.g., 09123456789)`;
        console.log('[WithdrawalDetailsModal] Account number validation failed: invalid format');
      } else {
        console.log('[WithdrawalDetailsModal] Account number validation passed');
      }
    }

    // Validate amount
    if (!amount.trim()) {
      newErrors.amount = 'Amount is required';
      console.log('[WithdrawalDetailsModal] Amount validation failed: empty');
    } else {
      const amountValue = parseFloat(amount);
      console.log('[WithdrawalDetailsModal] Amount validation', {
        amount: amount,
        parsed: amountValue,
        isNaN: isNaN(amountValue),
        isPositive: amountValue > 0,
        isMinValid: amountValue >= 100,
        isMaxValid: amountValue <= availableBalance,
        availableBalance: availableBalance,
      });
      if (isNaN(amountValue) || amountValue <= 0) {
        newErrors.amount = 'Please enter a valid amount';
        console.log('[WithdrawalDetailsModal] Amount validation failed: invalid or <= 0');
      } else if (amountValue < 100) {
        newErrors.amount = 'Minimum withdrawal amount is ₱100.00';
        console.log('[WithdrawalDetailsModal] Amount validation failed: < 100');
      } else if (amountValue > availableBalance) {
        newErrors.amount = `Amount cannot exceed available balance of ${formatCurrency(availableBalance)}`;
        console.log('[WithdrawalDetailsModal] Amount validation failed: > availableBalance');
      } else {
        console.log('[WithdrawalDetailsModal] Amount validation passed');
      }
    }

    console.log('[WithdrawalDetailsModal] Validation complete', {
      errors: newErrors,
      isValid: Object.keys(newErrors).length === 0,
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    console.log('[WithdrawalDetailsModal] handleSubmit called', {
      name: name,
      accountNumber: accountNumber,
      amount: amount,
      loading: loading,
      paymentMethod: paymentMethod,
    });

    const isValid = validateForm();
    console.log('[WithdrawalDetailsModal] Form validation result:', isValid, {
      errors: errors,
    });

    if (!isValid) {
      console.log('[WithdrawalDetailsModal] Form validation failed, returning');
      return;
    }

    const amountValue = parseFloat(amount);
    console.log('[WithdrawalDetailsModal] Amount value:', amountValue);

    // Show confirmation
    const confirmMessage = `Are you sure you want to withdraw ${formatCurrency(amountValue)} to ${paymentMethod === 'gcash' ? 'GCash' : 'PayMaya'}?\n\nAccount: ${name}\n${paymentMethod === 'gcash' ? 'GCash' : 'PayMaya'} Number: ${accountNumber}`;
    
    console.log('[WithdrawalDetailsModal] Showing confirmation dialog');

    if (Platform.OS === 'web') {
      // Use window.confirm for web
      const confirmed = window.confirm(confirmMessage);
      console.log('[WithdrawalDetailsModal] User confirmed:', confirmed);
      
      if (confirmed) {
        try {
          console.log('[WithdrawalDetailsModal] Starting withdrawal submission');
          setLoading(true);
          await onSubmit({
            amount: amountValue,
            name: name.trim(),
            accountNumber: accountNumber.replace(/\s|-/g, ''),
          });
          // Reset form on success
          console.log('[WithdrawalDetailsModal] Withdrawal submitted successfully');
          setName('');
          setAccountNumber('');
          setAmount('');
          onClose();
        } catch (error: any) {
          console.error('[WithdrawalDetailsModal] Error submitting withdrawal:', error);
          const errorMessage = error.message || 'Failed to submit withdrawal request';
          
          // Show more helpful error message
          if (errorMessage.includes('Account verification failed') || errorMessage.includes('account name')) {
            window.alert(
              'Withdrawal Failed\n\n' +
              'The account name you entered does not match the name registered on your ' + 
              (paymentMethod === 'gcash' ? 'GCash' : 'PayMaya') + ' account.\n\n' +
              'Please ensure:\n' +
              '• The account name exactly matches your ' + (paymentMethod === 'gcash' ? 'GCash' : 'PayMaya') + ' account holder name\n' +
              '• The mobile number is correct and active\n' +
              '• Try again with the correct information'
            );
          } else {
            window.alert('Error: ' + errorMessage);
          }
        } finally {
          setLoading(false);
        }
      } else {
        console.log('[WithdrawalDetailsModal] User cancelled withdrawal');
      }
    } else {
      // Use Alert.alert for mobile
      Alert.alert(
        'Confirm Withdrawal',
        confirmMessage,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => console.log('[WithdrawalDetailsModal] User cancelled') },
          {
            text: 'Confirm',
            style: 'default',
            onPress: async () => {
              try {
                console.log('[WithdrawalDetailsModal] Starting withdrawal submission');
                setLoading(true);
                await onSubmit({
                  amount: amountValue,
                  name: name.trim(),
                  accountNumber: accountNumber.replace(/\s|-/g, ''),
                });
                // Reset form on success
                console.log('[WithdrawalDetailsModal] Withdrawal submitted successfully');
                setName('');
                setAccountNumber('');
                setAmount('');
                onClose();
              } catch (error: any) {
                console.error('[WithdrawalDetailsModal] Error submitting withdrawal:', error);
                const errorMessage = error.message || 'Failed to submit withdrawal request';
                
                // Show more helpful error message
                if (errorMessage.includes('Account verification failed') || errorMessage.includes('account name')) {
                  Alert.alert(
                    'Withdrawal Failed',
                    'The account name you entered does not match the name registered on your ' + 
                    (paymentMethod === 'gcash' ? 'GCash' : 'PayMaya') + ' account.\n\n' +
                    'Please ensure:\n' +
                    '• The account name exactly matches your ' + (paymentMethod === 'gcash' ? 'GCash' : 'PayMaya') + ' account holder name\n' +
                    '• The mobile number is correct and active\n' +
                    '• Try again with the correct information'
                  );
                } else {
                  Alert.alert('Error', errorMessage);
                }
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    }
  };

  const methodName = paymentMethod === 'gcash' ? 'GCash' : 'PayMaya';
  const methodColor = paymentMethod === 'gcash' ? '#007DFF' : '#00D632';

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
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.methodIconContainer,
                  { backgroundColor: methodColor + '15' },
                ]}
              >
                <Ionicons
                  name={paymentMethod === 'gcash' ? 'wallet' : 'card'}
                  size={24}
                  color={methodColor}
                />
              </View>
              <View>
                <Text style={styles.modalTitle}>Withdraw to {methodName}</Text>
                <Text style={styles.modalSubtitle}>
                  Available: {formatCurrency(availableBalance)}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              disabled={loading}
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Amount Input */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Withdrawal Amount</Text>
              <View style={styles.amountContainer}>
                <Text style={styles.currencySymbol}>₱</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  value={amount}
                  onChangeText={(text) => {
                    // Allow only numbers and one decimal point
                    const cleaned = text.replace(/[^0-9.]/g, '');
                    const parts = cleaned.split('.');
                    if (parts.length > 2) return;
                    if (parts[1] && parts[1].length > 2) return;
                    setAmount(cleaned);
                    setErrors((prev) => ({ ...prev, amount: undefined }));
                  }}
                  keyboardType="decimal-pad"
                  placeholderTextColor={COLORS.textLight}
                  editable={!loading}
                />
              </View>
              {errors.amount && (
                <Text style={styles.errorText}>{errors.amount}</Text>
              )}
              <Pressable
                style={styles.withdrawAllButton}
                onPress={handleWithdrawAll}
                disabled={loading}
              >
                <Ionicons name="arrow-down" size={16} color={COLORS.primary} />
                <Text style={styles.withdrawAllText}>Withdraw All</Text>
              </Pressable>
              <Text style={styles.amountHint}>
                Minimum: ₱100.00 • Maximum: {formatCurrency(availableBalance)}
              </Text>
            </View>

            {/* Account Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account Details</Text>

              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Account Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  placeholder="Full name as registered on GCash/PayMaya"
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  placeholderTextColor={COLORS.textLight}
                  editable={!loading}
                  autoCapitalize="words"
                />
                {errors.name && (
                  <Text style={styles.errorText}>{errors.name}</Text>
                )}
                <Text style={styles.warningText}>
                  ⚠️ In production, the account name must exactly match the name registered on your {methodName} account. For testing, you can use any test data.
                </Text>
              </View>

              {/* Account Number Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {methodName} Number <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.accountNumber && styles.inputError]}
                  placeholder="09123456789"
                  value={accountNumber}
                  onChangeText={(text) => {
                    // Allow only numbers, spaces, dashes, and + for phone number
                    const cleaned = text.replace(/[^0-9+\s-]/g, '');
                    setAccountNumber(cleaned);
                    setErrors((prev) => ({ ...prev, accountNumber: undefined }));
                  }}
                  keyboardType="phone-pad"
                  placeholderTextColor={COLORS.textLight}
                  editable={!loading}
                  maxLength={13}
                />
                {errors.accountNumber && (
                  <Text style={styles.errorText}>{errors.accountNumber}</Text>
                )}
                <Text style={styles.inputHint}>
                  Enter your {methodName} mobile number
                </Text>
                <Text style={styles.warningText}>
                  ⚠️ Make sure the mobile number is registered and active on your {methodName} account.
                </Text>
              </View>
            </View>

            {/* Info Note */}
            <View style={styles.infoNote}>
              <Ionicons
                name="information-circle"
                size={18}
                color={COLORS.primary}
              />
              <Text style={styles.infoText}>
                Withdrawal requests are processed within 1-3 business days. You
                will receive a notification once processed.
              </Text>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <Pressable
              style={[styles.cancelButton, loading && styles.buttonDisabled]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.submitButton,
                loading && styles.buttonDisabled,
              ]}
              onPress={() => {
                console.log('[WithdrawalDetailsModal] Submit button pressed', {
                  loading: loading,
                  name: name,
                  accountNumber: accountNumber,
                  amount: amount,
                  paymentMethod: paymentMethod,
                });
                handleSubmit();
              }}
              disabled={loading}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Request Withdrawal</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={COLORS.white}
                  />
                </>
              )}
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
      maxWidth: 600,
      width: '90%',
      maxHeight: '90%',
    }),
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  methodIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.bg,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  amountHint: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 8,
  },
  withdrawAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 8,
  },
  withdrawAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  required: {
    color: COLORS.danger,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  inputHint: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: 4,
  },
  warningText: {
    fontSize: 11,
    color: COLORS.warn,
    marginTop: 6,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
    position: 'relative',
    zIndex: Platform.OS === 'web' ? 5 : 0,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    zIndex: Platform.OS === 'web' ? 10 : 0,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      pointerEvents: 'auto',
    }),
  } as any,
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

