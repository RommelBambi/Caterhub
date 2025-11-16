import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../store/auth';
import {
  toXenditAmount,
} from '../../services/xendit';
import { createPaymentViaEdgeFunction } from '../../services/paymentEdgeFunction';
import { supabase } from '../../services/supabase';
import { checkXenditKeys } from '../../utils/checkXenditKeys';
import { diagnoseEnvironment } from '../../utils/diagnoseEnv';
import PaymentWebView from '../../components/payment/PaymentWebView';

const COLORS = {
  primary: '#FF8000',
  text: '#1e293b',
  textLight: '#64748b',
  bg: '#f8fafc',
  white: '#ffffff',
  border: '#e2e8f0',
  success: '#22c55e',
  danger: '#dc2626',
};

type PaymentMethod = 'gcash' | 'paymaya';

export default function PaymentScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { bookingId, amount, description, isRemainingPayment = false, paymentOption, depositAmount: routeDepositAmount, remainingAmount: routeRemainingAmount } = route.params;
  
  // Use paymentOption to determine payment amounts
  // If paymentOption is 'full', show full amount; if 'deposit', show 50%
  const isFullPayment = paymentOption === 'full';
  const depositAmount = isRemainingPayment 
    ? 0 
    : (isFullPayment ? amount : (routeDepositAmount ?? Math.round(amount / 2)));
  const remainingAmount = isRemainingPayment 
    ? amount 
    : (isFullPayment ? 0 : (routeRemainingAmount ?? (amount - depositAmount)));
  
  // The amount to pay now
  const paymentAmount = isFullPayment ? amount : depositAmount;

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showPaymentWebView, setShowPaymentWebView] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [paymentResponse, setPaymentResponse] = useState<any>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [paymentAgreementAccepted, setPaymentAgreementAccepted] = useState(false);
  const [remainingBalanceAccepted, setRemainingBalanceAccepted] = useState(false);

  // Check Xendit keys and environment on mount (for debugging)
  React.useEffect(() => {
    if (__DEV__) {
      console.log('\n🔍 Running environment diagnostic...\n');
      diagnoseEnvironment();
      checkXenditKeys();
    }
  }, []);

  const paymentMethods = [
    { id: 'gcash', name: 'GCash', icon: 'wallet', color: '#007DFF', description: 'Pay via GCash e-wallet' },
    { id: 'paymaya', name: 'PayMaya', icon: 'card', color: '#00D632', description: 'Pay via PayMaya e-wallet' },
  ];

  const handlePayment = async () => {
    if (!selectedMethod) {
      Alert.alert('Select Payment Method', 'Please select a payment method to continue.');
      return;
    }

    // Only require terms acceptance when paying deposit (not when paying remaining balance)
    if (!isRemainingPayment && !termsAccepted) {
      Alert.alert('Confirmation Required', 'Please confirm that you understand the booking terms to proceed with payment.');
      return;
    }

    // Only require payment agreement when paying deposit (not when paying remaining balance)
    if (!isRemainingPayment && !paymentAgreementAccepted) {
      Alert.alert('Payment Agreement Required', 'Please confirm your payment agreement to proceed.');
      return;
    }

    // Require remaining balance confirmation when paying remaining balance
    if (isRemainingPayment && !remainingBalanceAccepted) {
      Alert.alert('Confirmation Required', 'Please confirm that you are paying the remaining balance to proceed.');
      return;
    }

    // Only online payments allowed for deposit

    // Handle online payment with Xendit
    try {
      setLoading(true);
      setProcessingPayment(true);

      // Check if payment amount exceeds Xendit limit (₱1,000,000)
      const currentPaymentAmount = isRemainingPayment ? remainingAmount : paymentAmount;
      const xenditAmount = toXenditAmount(currentPaymentAmount);
      const MAX_AMOUNT = 1000000; // ₱1,000,000 limit for Xendit
      
      if (xenditAmount > MAX_AMOUNT) {
        Alert.alert(
          'Amount Too Large',
          `Xendit has a maximum transaction limit of ₱1,000,000. Your payment amount is ₱${currentPaymentAmount.toLocaleString()}. Please contact us directly for large bookings.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
        setLoading(false);
        setProcessingPayment(false);
        return;
      }

      // Use Edge Function for secure payment processing
      let returnUrl = `https://qiudzzioqgdusoyylktr.supabase.co/functions/v1/xendit-redirect?status=success&booking_id=${bookingId}`;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        returnUrl = window.location.origin + '/payment/success';
      }

      console.log('Creating payment via Edge Function...');
      const paymentDescription = isRemainingPayment 
        ? `Remaining Balance (50%) - ${description || `Booking #${bookingId}`}`
        : isFullPayment
        ? `Full Payment - ${description || `Booking #${bookingId}`}`
        : `Deposit (50%) - ${description || `Booking #${bookingId}`}`;
      
      const paymentResponse = await createPaymentViaEdgeFunction({
        amount: xenditAmount,
        currency: 'PHP',
        description: paymentDescription,
        bookingId: bookingId.toString(),
        userId: user?.id || '',
        paymentMethod: selectedMethod,
        customerInfo: {
          name: user?.email || 'Customer',
          email: user?.email || '',
        },
        returnUrl,
      });

      console.log('Payment created via Edge Function:', paymentResponse);
      setPaymentResponse(paymentResponse);

        // Update booking with payment info
        const updateData: any = {
          payment_method: selectedMethod,
          payment_status: 'PENDING',
          xendit_invoice_id: paymentResponse.invoiceId || null,
          xendit_charge_id: paymentResponse.chargeId || null,
          xendit_external_id: paymentResponse.externalId || paymentResponse.referenceId || null,
        };

        if (isRemainingPayment) {
          // For remaining payment, don't update deposit status
          updateData.remaining_paid = false; // Will be updated when payment succeeds
        } else if (isFullPayment) {
          // For full payment, mark both as paid when payment succeeds
          updateData.deposit_paid = false; // Will be updated when payment succeeds
          updateData.remaining_paid = false; // Will be updated when payment succeeds
        } else {
          // For deposit payment
          updateData.deposit_paid = false; // Will be updated when payment succeeds
          updateData.remaining_paid = false;
        }

        await supabase
          .from('bookings')
          .update(updateData)
          .eq('id', bookingId);

      // Open checkout URL in WebView
      if (paymentResponse.checkoutUrl) {
        console.log('Opening checkout URL in WebView:', paymentResponse.checkoutUrl);
        setCheckoutUrl(paymentResponse.checkoutUrl);
        setShowPaymentWebView(true);
      } else {
        throw new Error('No checkout URL received from payment service');
      }
    } catch (error: any) {
      console.error('Xendit payment error:', error);
      Alert.alert('Payment Failed', error.message || 'Failed to process payment with Xendit. Please try again.');
    } finally {
      setLoading(false);
      setProcessingPayment(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Amount Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Booking Amount</Text>
          <Text style={styles.summaryAmount}>₱{amount.toLocaleString()}</Text>
          <Text style={styles.summaryDescription}>{description}</Text>
          
          {/* Payment Info */}
          {isFullPayment ? (
            <View style={styles.depositInfo}>
              <View style={styles.depositRow}>
                <Text style={styles.depositLabel}>Full Payment</Text>
                <Text style={styles.depositAmount}>₱{amount.toLocaleString()}</Text>
              </View>
              <Text style={styles.depositNote}>
                You have selected to pay the full amount upfront.
              </Text>
            </View>
          ) : (
            <View style={styles.depositInfo}>
              <View style={styles.depositRow}>
                <Text style={styles.depositLabel}>Deposit Required (50%)</Text>
                <Text style={styles.depositAmount}>₱{depositAmount.toLocaleString()}</Text>
              </View>
              <View style={styles.depositRow}>
                <Text style={styles.depositLabelSecondary}>Remaining (50%)</Text>
                <Text style={styles.depositAmountSecondary}>₱{remainingAmount.toLocaleString()}</Text>
              </View>
              <Text style={styles.depositNote}>
                Pay remaining amount during the event (cash or online)
              </Text>
            </View>
          )}
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Payment Method</Text>
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.methodCard,
                selectedMethod === method.id && styles.methodCardSelected,
              ]}
              onPress={() => setSelectedMethod(method.id as PaymentMethod)}
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

        {/* Payment Info */}
        {selectedMethod && (
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              You'll be taken to a secure payment screen to complete your {isFullPayment ? 'full' : '50% deposit'} payment via Xendit. Payment will be processed within the app.
            </Text>
          </View>
        )}
        

        {/* Booking Confirmation Checkbox - Only show when paying deposit (not remaining balance) */}
        {!isRemainingPayment && (
          <View style={styles.termsSection}>
            <TouchableOpacity
              style={styles.termsCheckboxContainer}
              onPress={() => setTermsAccepted(!termsAccepted)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                {termsAccepted && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
              </View>
              <View style={styles.termsTextContainer}>
                <Text style={styles.termsText}>
                  Once I have paid, the booking will be confirmed and can no longer be cancelled. I may change my selected dishes, but I cannot change the entire menu.
                </Text>
              </View>
            </TouchableOpacity>
            {!termsAccepted && (
              <Text style={styles.termsWarning}>
                You must confirm your understanding to proceed with payment.
              </Text>
            )}
          </View>
        )}

        {/* Payment Agreement Checkbox - Only show when paying deposit (not remaining balance) */}
        {!isRemainingPayment && (
          <View style={styles.termsSection}>
            <TouchableOpacity
              style={styles.termsCheckboxContainer}
              onPress={() => setPaymentAgreementAccepted(!paymentAgreementAccepted)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, paymentAgreementAccepted && styles.checkboxChecked]}>
                {paymentAgreementAccepted && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
              </View>
              <View style={styles.termsTextContainer}>
                <Text style={styles.termsText}>
                  {isFullPayment 
                    ? 'I agree to pay the full amount.'
                    : 'I agree to pay the remaining balance before or during the event.'}
                </Text>
              </View>
            </TouchableOpacity>
            {!paymentAgreementAccepted && (
              <Text style={styles.termsWarning}>
                You must confirm your payment agreement to proceed with payment.
              </Text>
            )}
          </View>
        )}

        {/* Remaining Balance Confirmation Checkbox - Only show when paying remaining balance */}
        {isRemainingPayment && (
          <View style={styles.termsSection}>
            <TouchableOpacity
              style={styles.termsCheckboxContainer}
              onPress={() => setRemainingBalanceAccepted(!remainingBalanceAccepted)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, remainingBalanceAccepted && styles.checkboxChecked]}>
                {remainingBalanceAccepted && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
              </View>
              <View style={styles.termsTextContainer}>
                <Text style={styles.termsText}>
                  I confirm that I am paying the remaining balance.
                </Text>
              </View>
            </TouchableOpacity>
            {!remainingBalanceAccepted && (
              <Text style={styles.termsWarning}>
                You must confirm that you are paying the remaining balance to proceed with payment.
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.payButton,
            (!selectedMethod || (!isRemainingPayment && (!termsAccepted || !paymentAgreementAccepted)) || (isRemainingPayment && !remainingBalanceAccepted) || loading) && styles.payButtonDisabled,
          ]}
          onPress={handlePayment}
          disabled={!selectedMethod || (!isRemainingPayment && (!termsAccepted || !paymentAgreementAccepted)) || (isRemainingPayment && !remainingBalanceAccepted) || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Text style={styles.payButtonText}>
                {isRemainingPayment 
                  ? `Pay Remaining (₱${remainingAmount.toLocaleString()})`
                  : isFullPayment
                  ? `Pay Full Amount (₱${amount.toLocaleString()})`
                  : `Pay Deposit (₱${depositAmount.toLocaleString()})`
                }
              </Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Payment WebView */}
      <PaymentWebView
        visible={showPaymentWebView}
        checkoutUrl={checkoutUrl}
        onClose={() => setShowPaymentWebView(false)}
        onPaymentComplete={() => {
          setShowPaymentWebView(false);
          setLoading(false);
          setProcessingPayment(false);
          
          // Use safe navigation with fallbacks
          const params = {
            bookingId,
            chargeId: null,
            invoiceId: null,
            externalId: null
          };
          
          try {
            // Only add these if paymentResponse exists
            if (paymentResponse) {
              params.chargeId = paymentResponse.chargeId || null;
              params.invoiceId = paymentResponse.invoiceId || null;
              params.externalId = paymentResponse.externalId || paymentResponse.referenceId || null;
            }
          } catch (err) {
            console.log('Error accessing payment info:', err);
          }
          
          navigation.navigate('PaymentPending', params);
        }}
        onPaymentFailed={() => {
          setShowPaymentWebView(false);
          Alert.alert(
            'Payment Failed',
            'Your payment could not be processed. No charges were made.',
            [{ text: 'OK' }]
          );
        }}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  content: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    padding: 24,
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: 8,
  },
  summaryDescription: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center',
  },
  depositInfo: {
    width: '100%',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  depositRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  depositLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  depositAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  depositLabelSecondary: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  depositAmountSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  depositNote: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primary + '15',
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  payButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  termsSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  termsCheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  termsTextContainer: {
    flex: 1,
  },
  termsText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  termsWarning: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: 8,
    marginLeft: 36,
  },
});
