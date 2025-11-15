import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PartnerStackParamList } from '../../navigation/caterer/PartnerNav';
import { useAuth } from '../../store/auth';
import { supabase } from '../../services/supabase';
import { COLORS } from '../../constants/colors';
import { isWeb } from '../../utils/platform';
import Sidebar from '../../components/caterer/Sidebar';
import TopBar from '../../components/caterer/TopBar';
import BottomNav from '../../components/caterer/BottomNav';

type PaymentMethod = 'gcash' | 'paymaya' | 'bank_transfer';

interface PaymentDetails {
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
  bankAccountNumber?: string;
  mobileNumber?: string;
}

export default function PartnerWithdrawalScreen({ route }: any) {
  const navigation = useNavigation<NativeStackNavigationProp<PartnerStackParamList>>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { availableBalance } = route.params || { availableBalance: 0 };

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Payment details based on method
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    accountNumber: '',
    accountName: '',
    bankName: '',
    bankAccountNumber: '',
    mobileNumber: '',
  });

  const paymentMethods: { id: PaymentMethod; name: string; icon: string; color: string }[] = [
    { id: 'gcash', name: 'GCash', icon: 'wallet', color: '#007DFF' },
    { id: 'paymaya', name: 'PayMaya', icon: 'card', color: '#00D632' },
    { id: 'bank_transfer', name: 'Bank Transfer', icon: 'business', color: '#6366f1' },
  ];

  const handleWithdrawal = async () => {
    if (!selectedMethod) {
      Alert.alert('Select Payment Method', 'Please select a payment method to continue.');
      return;
    }

    const withdrawalAmount = parseFloat(amount);
    if (!withdrawalAmount || withdrawalAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid withdrawal amount.');
      return;
    }

    if (withdrawalAmount > availableBalance) {
      Alert.alert('Insufficient Balance', `You can only withdraw up to ${formatCurrency(availableBalance)}.`);
      return;
    }

    if (withdrawalAmount < 100) {
      Alert.alert('Minimum Amount', 'Minimum withdrawal amount is ₱100.00.');
      return;
    }

    // Validate payment details based on method
    if (selectedMethod === 'gcash' || selectedMethod === 'paymaya') {
      if (!paymentDetails.mobileNumber || paymentDetails.mobileNumber.length < 10) {
        Alert.alert('Invalid Mobile Number', 'Please enter a valid mobile number.');
        return;
      }
      if (!paymentDetails.accountName) {
        Alert.alert('Account Name Required', 'Please enter the account name.');
        return;
      }
    } else if (selectedMethod === 'bank_transfer') {
      if (!paymentDetails.bankName) {
        Alert.alert('Bank Name Required', 'Please enter the bank name.');
        return;
      }
      if (!paymentDetails.bankAccountNumber) {
        Alert.alert('Account Number Required', 'Please enter the bank account number.');
        return;
      }
      if (!paymentDetails.accountName) {
        Alert.alert('Account Name Required', 'Please enter the account holder name.');
        return;
      }
    }

    Alert.alert(
      'Confirm Withdrawal',
      `Are you sure you want to withdraw ${formatCurrency(withdrawalAmount)} to ${paymentMethods.find(m => m.id === selectedMethod)?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            await submitWithdrawal(withdrawalAmount);
          },
        },
      ]
    );
  };

  const submitWithdrawal = async (withdrawalAmount: number) => {
    if (!user) return;

    try {
      setLoading(true);

      // Prepare payment details JSON
      const details: PaymentDetails = {};
      if (selectedMethod === 'gcash' || selectedMethod === 'paymaya') {
        details.mobileNumber = paymentDetails.mobileNumber;
        details.accountName = paymentDetails.accountName;
      } else if (selectedMethod === 'bank_transfer') {
        details.bankName = paymentDetails.bankName;
        details.bankAccountNumber = paymentDetails.bankAccountNumber;
        details.accountName = paymentDetails.accountName;
      }

      // Create withdrawal request
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .insert({
          caterer_id: user.id,
          amount: withdrawalAmount,
          payment_method: selectedMethod,
          payment_details: details,
          status: 'PENDING',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating withdrawal request:', error);
        Alert.alert('Error', 'Failed to create withdrawal request. Please try again.');
        return;
      }

      Alert.alert(
        'Withdrawal Request Submitted',
        'Your withdrawal request has been submitted successfully. It will be processed within 1-3 business days.',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error submitting withdrawal:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <View style={styles.screen}>
      {isWeb && <Sidebar />}
      <View style={styles.mainArea}>
        <TopBar title="Request Withdrawal" />
        <ScrollView
          style={styles.scrollRegion}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Available Balance Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Available Balance</Text>
            <Text style={styles.balanceAmount}>{formatCurrency(availableBalance)}</Text>
            <Text style={styles.balanceNote}>
              This is your total earnings after platform fees have been deducted.
            </Text>
          </View>

          {/* Withdrawal Amount */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Withdrawal Amount</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>₱</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholderTextColor={COLORS.textLight}
              />
            </View>
            <Text style={styles.amountHint}>
              Minimum: ₱100.00 • Maximum: {formatCurrency(availableBalance)}
            </Text>
          </View>

          {/* Payment Method Selection */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Select Payment Method</Text>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.methodCard,
                  selectedMethod === method.id && styles.methodCardSelected,
                ]}
                onPress={() => setSelectedMethod(method.id)}
                activeOpacity={0.7}
              >
                <View style={styles.methodLeft}>
                  <View style={[styles.methodIcon, { backgroundColor: method.color + '20' }]}>
                    <Ionicons name={method.icon as any} size={24} color={method.color} />
                  </View>
                  <Text style={styles.methodName}>{method.name}</Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    selectedMethod === method.id && styles.radioSelected,
                  ]}
                >
                  {selectedMethod === method.id && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Payment Details Form */}
          {selectedMethod && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Payment Details</Text>
              
              {(selectedMethod === 'gcash' || selectedMethod === 'paymaya') ? (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Mobile Number</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="09XX XXX XXXX"
                      value={paymentDetails.mobileNumber}
                      onChangeText={(text) =>
                        setPaymentDetails({ ...paymentDetails, mobileNumber: text })
                      }
                      keyboardType="phone-pad"
                      placeholderTextColor={COLORS.textLight}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Account Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Full name as registered"
                      value={paymentDetails.accountName}
                      onChangeText={(text) =>
                        setPaymentDetails({ ...paymentDetails, accountName: text })
                      }
                      placeholderTextColor={COLORS.textLight}
                    />
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Bank Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., BPI, BDO, Metrobank"
                      value={paymentDetails.bankName}
                      onChangeText={(text) =>
                        setPaymentDetails({ ...paymentDetails, bankName: text })
                      }
                      placeholderTextColor={COLORS.textLight}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Account Number</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Bank account number"
                      value={paymentDetails.bankAccountNumber}
                      onChangeText={(text) =>
                        setPaymentDetails({ ...paymentDetails, bankAccountNumber: text })
                      }
                      keyboardType="numeric"
                      placeholderTextColor={COLORS.textLight}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Account Holder Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Full name as registered"
                      value={paymentDetails.accountName}
                      onChangeText={(text) =>
                        setPaymentDetails({ ...paymentDetails, accountName: text })
                      }
                      placeholderTextColor={COLORS.textLight}
                    />
                  </View>
                </>
              )}
            </View>
          )}

          {/* Info Card */}
          <View style={[styles.card, styles.infoCard]}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              Withdrawal requests are processed within 1-3 business days. You will receive a notification once your withdrawal has been processed.
            </Text>
          </View>
        </ScrollView>

        {/* Footer Button */}
        <View style={[styles.footer, { paddingBottom: insets.bottom }]}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!selectedMethod || !amount || loading) && styles.submitButtonDisabled,
            ]}
            onPress={handleWithdrawal}
            disabled={!selectedMethod || !amount || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Request Withdrawal</Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
      {!isWeb && <BottomNav />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    backgroundColor: '#f9fafb',
  },
  mainArea: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollRegion: {
    flex: 1,
  },
  scrollContent: {
    padding: Platform.OS === 'web' ? 16 : 12,
    paddingBottom: Platform.OS === 'web' ? 16 : 100,
  },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: Platform.OS === 'web' ? 12 : 16,
    padding: Platform.OS === 'web' ? 24 : 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: Platform.OS === 'web' ? 2 : 4 },
    shadowOpacity: 0.05,
    shadowRadius: Platform.OS === 'web' ? 8 : 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: Platform.OS === 'web' ? 18 : 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: 8,
  },
  balanceNote: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
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
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  methodCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05',
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: COLORS.primary,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
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
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: '#fff',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primary + '10',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});

