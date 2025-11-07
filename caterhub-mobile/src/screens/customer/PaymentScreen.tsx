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
  createPaymentIntent,
  createPaymentMethod,
  attachPaymentIntent,
  createSource,
  toPayMongoAmount,
  getPaymentIntent,
} from '../../services/paymongo';
import { supabase } from '../../services/supabase';

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

type PaymentMethod = 'gcash' | 'grab_pay' | 'paymaya' | 'card' | 'cash';

export default function PaymentScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { bookingId, amount, description } = route.params;

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  const paymentMethods = [
    { id: 'gcash', name: 'GCash', icon: 'wallet', color: '#007DFF' },
    { id: 'grab_pay', name: 'GrabPay', icon: 'car', color: '#00B14F' },
    { id: 'paymaya', name: 'PayMaya', icon: 'card', color: '#00D632' },
    { id: 'cash', name: 'Cash on Delivery', icon: 'cash', color: COLORS.success },
  ];

  const handlePayment = async () => {
    if (!selectedMethod) {
      Alert.alert('Select Payment Method', 'Please select a payment method to continue.');
      return;
    }

    if (selectedMethod === 'cash') {
      // Handle cash payment - just update booking status
      try {
        setLoading(true);
        const { error } = await supabase
          .from('bookings')
          .update({
            payment_method: 'cash',
            payment_status: 'PENDING',
          })
          .eq('id', bookingId);

        if (error) throw error;

        Alert.alert(
          'Booking Confirmed',
          'Your booking has been confirmed. Please prepare cash payment on the event day.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Bookings'),
            },
          ]
        );
      } catch (error: any) {
        console.error('Error updating booking:', error);
        Alert.alert('Error', 'Failed to confirm booking. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Handle online payment with PayMongo
    try {
      setLoading(true);
      setProcessingPayment(true);

      // Check if amount exceeds PayMongo limit (₱100,000 = 10,000,000 centavos)
      const payMongoAmount = toPayMongoAmount(amount);
      const MAX_AMOUNT = 10000000; // ₱100,000 in centavos
      
      if (payMongoAmount > MAX_AMOUNT) {
        Alert.alert(
          'Amount Too Large',
          `PayMongo has a maximum transaction limit of ₱100,000. Your booking amount is ₱${amount.toLocaleString()}. Please contact us directly for large bookings.`,
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

      // Step 1: Create Payment Intent
      const paymentIntent = await createPaymentIntent({
        amount: payMongoAmount,
        currency: 'PHP',
        description: description || `CaterHub Booking #${bookingId}`,
        statement_descriptor: 'CaterHub',
        metadata: {
          bookingId: bookingId.toString(),
          userId: user?.id || '',
        },
      });

      console.log('Payment Intent created:', paymentIntent.id);

      // Step 2: Create Payment Source (for GCash, GrabPay)
      if (selectedMethod === 'gcash' || selectedMethod === 'grab_pay') {
        // Note: Replace these URLs with your actual domain when deployed
        // For now, using a generic success page that redirects back to app
        const source = await createSource(
          payMongoAmount,
          selectedMethod,
          description || `CaterHub Booking #${bookingId}`,
          {
            success: `https://paymongo.com/redirect?status=success&booking_id=${bookingId}`,
            failed: `https://paymongo.com/redirect?status=failed&booking_id=${bookingId}`,
          },
          {
            bookingId: bookingId.toString(),
            paymentIntentId: paymentIntent.id,
          }
        );

        console.log('Payment Source created:', source);

        // Update booking with payment info
        await supabase
          .from('bookings')
          .update({
            payment_method: selectedMethod,
            payment_status: 'PENDING',
            payment_intent_id: paymentIntent.id,
            payment_source_id: source.id,
          })
          .eq('id', bookingId);

        // Open payment URL
        const checkoutUrl = source.attributes.redirect.checkout_url;
        if (checkoutUrl) {
          const canOpen = await Linking.canOpenURL(checkoutUrl);
          if (canOpen) {
            await Linking.openURL(checkoutUrl);
            
            // Show instructions
            Alert.alert(
              'Complete Payment',
              'You will be redirected to complete your payment. Please return to the app after payment.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    // Navigate to a pending payment screen
                    navigation.navigate('PaymentPending', {
                      bookingId,
                      paymentIntentId: paymentIntent.id,
                    });
                  },
                },
              ]
            );
          } else {
            throw new Error('Cannot open payment URL');
          }
        }
      } else {
        // For card/paymaya - would need additional UI for card details
        Alert.alert(
          'Coming Soon',
          'Card and PayMaya payments will be available soon. Please use GCash or Cash on Delivery.'
        );
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
          <Text style={styles.summaryLabel}>Total Amount</Text>
          <Text style={styles.summaryAmount}>₱{amount.toLocaleString()}</Text>
          <Text style={styles.summaryDescription}>{description}</Text>
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
        {selectedMethod && selectedMethod !== 'cash' && (
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>
              You will be redirected to complete your payment securely. Please return to the app
              after completing the payment.
            </Text>
          </View>
        )}

        {selectedMethod === 'cash' && (
          <View style={[styles.infoCard, { backgroundColor: COLORS.success + '15' }]}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={[styles.infoText, { color: COLORS.success }]}>
              Your booking will be confirmed. Please prepare the exact amount on the event day.
            </Text>
          </View>
        )}
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
                {selectedMethod === 'cash' ? 'Confirm Booking' : 'Proceed to Payment'}
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
