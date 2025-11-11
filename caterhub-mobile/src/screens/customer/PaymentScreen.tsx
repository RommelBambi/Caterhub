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
  toPayMongoAmount,
} from '../../services/paymongo';
import { createPaymentViaEdgeFunction } from '../../services/paymentEdgeFunction';
import { supabase } from '../../services/supabase';
import { checkPayMongoKeys } from '../../utils/checkPayMongoKeys';
import { diagnoseEnvironment } from '../../utils/diagnoseEnv';

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
  const { bookingId, amount, description } = route.params;
  
  // Calculate deposit (50%) and remaining (50%)
  const depositAmount = Math.round(amount / 2);
  const remainingAmount = amount - depositAmount;

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Check PayMongo keys and environment on mount (for debugging)
  React.useEffect(() => {
    if (__DEV__) {
      console.log('\n🔍 Running environment diagnostic...\n');
      diagnoseEnvironment();
      checkPayMongoKeys();
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

    // Only online payments allowed for deposit

    // Handle online payment with PayMongo
    try {
      setLoading(true);
      setProcessingPayment(true);

      // Check if deposit amount exceeds PayMongo limit (₱100,000 = 10,000,000 centavos)
      const payMongoAmount = toPayMongoAmount(depositAmount);
      const MAX_AMOUNT = 10000000; // ₱100,000 in centavos
      
      if (payMongoAmount > MAX_AMOUNT) {
        Alert.alert(
          'Amount Too Large',
          `PayMongo has a maximum transaction limit of ₱100,000. Your deposit amount is ₱${depositAmount.toLocaleString()}. Please contact us directly for large bookings.`,
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
      let returnUrl = 'https://www.paymongo.com/success';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        returnUrl = window.location.origin + '/payment/success';
      }

      console.log('Creating payment via Edge Function...');
      const paymentResponse = await createPaymentViaEdgeFunction({
        amount: payMongoAmount,
        currency: 'PHP',
        description: `Deposit (50%) - ${description || `Booking #${bookingId}`}`,
          bookingId: bookingId.toString(),
          userId: user?.id || '',
        paymentMethod: selectedMethod,
        returnUrl,
      });

      console.log('Payment created via Edge Function:', paymentResponse);

        // Update booking with deposit payment info
        await supabase
          .from('bookings')
          .update({
            payment_method: selectedMethod,
            payment_status: 'PENDING',
          payment_intent_id: paymentResponse.paymentIntentId,
          payment_source_id: paymentResponse.paymentSourceId || null,
            deposit_paid: false, // Will be updated when payment succeeds
            remaining_paid: false,
          })
          .eq('id', bookingId);

      // Open checkout URL
      if (paymentResponse.checkoutUrl) {
        console.log('Opening checkout URL in Chrome:', paymentResponse.checkoutUrl);
        const canOpen = await Linking.canOpenURL(paymentResponse.checkoutUrl);
          if (canOpen) {
          // Open in Chrome browser
          await Linking.openURL(paymentResponse.checkoutUrl);
            
          // Show instructions and navigate to pending screen
          Alert.alert(
            'Complete Payment',
            'You will be redirected to Chrome to complete your payment.\n\n' +
            'After completing payment:\n' +
            '1. You may see an error page - that\'s normal!\n' +
            '2. Close that page and return to this app\n' +
            '3. We\'ll automatically verify your payment',
            [
              {
                text: 'OK',
                onPress: () => {
                  navigation.navigate('PaymentPending', {
                    bookingId,
                    paymentIntentId: paymentResponse.paymentIntentId,
                    paymentSourceId: paymentResponse.paymentSourceId || null,
                  });
                },
              },
            ]
          );
          } else {
            throw new Error('Cannot open payment URL');
          }
      } else {
        throw new Error('No checkout URL received from payment service');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      Alert.alert('Payment Failed', error.message || 'Failed to process payment. Please try again.');
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
          
          {/* Deposit Info */}
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
              You will be redirected to Chrome to complete your 50% deposit payment securely. Please return to the app after completing the payment.
            </Text>
          </View>
        )}
        
        {/* Important Notice */}
        <View style={[styles.infoCard, { backgroundColor: COLORS.primary + '10' }]}>
          <Ionicons name="alert-circle" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            <Text style={{ fontWeight: '600' }}>Important:</Text> This is a 50% deposit to confirm your booking. The remaining 50% can be paid during the event.
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.payButton,
            (!selectedMethod || loading) && styles.payButtonDisabled,
          ]}
          onPress={handlePayment}
          disabled={!selectedMethod || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Text style={styles.payButtonText}>
                Pay Deposit (₱{depositAmount.toLocaleString()})
              </Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
            </>
          )}
        </TouchableOpacity>
      </View>

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
});
