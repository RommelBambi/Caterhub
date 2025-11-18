import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PaymentWebView from '../payment/PaymentWebView';
import { supabase } from '../../services/supabase';
import { SUBSCRIPTION_PRICES, type SubscriptionPlan } from '../../services/subscriptions';
import { COLORS } from '../../constants/colors';

type PaymentMethod = 'gcash' | 'paymaya';

interface Props {
  visible: boolean;
  onClose: () => void;
  planType: SubscriptionPlan;
  subscriptionId: number;
  onPaymentSuccess: () => void;
}

const paymentMethods: { id: PaymentMethod; name: string; icon: string; color: string; description: string }[] = [
  {
    id: 'gcash',
    name: 'GCash',
    icon: 'wallet',
    color: '#007DFF',
    description: 'Pay via GCash e-wallet',
  },
  {
    id: 'paymaya',
    name: 'PayMaya',
    icon: 'card',
    color: '#00D632',
    description: 'Pay via PayMaya e-wallet',
  },
];

export default function SubscriptionPaymentModal({
  visible,
  onClose,
  planType,
  subscriptionId,
  onPaymentSuccess,
}: Props) {
  const insets = useSafeAreaInsets();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPaymentWebView, setShowPaymentWebView] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState('');

  const amount = planType === 'monthly' ? SUBSCRIPTION_PRICES.monthly : SUBSCRIPTION_PRICES.yearly;
  const planName = planType === 'monthly' ? 'Monthly Premium' : 'Yearly Premium';

  const handlePayment = async () => {
    if (!selectedMethod) {
      Alert.alert('Select Payment Method', 'Please select a payment method to continue.');
      return;
    }

    try {
      setLoading(true);

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call edge function to create payment
      const supabaseUrl = 'https://qiudzzioqgdusoyylktr.supabase.co';
      const response = await fetch(`${supabaseUrl}/functions/v1/create-subscription-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          subscriptionId: subscriptionId,
          planType: planType,
          paymentMethod: selectedMethod,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment');
      }

      const paymentData = await response.json();
      console.log('[SubscriptionPaymentModal] Payment response:', paymentData);

      if (!paymentData.checkoutUrl) {
        console.error('[SubscriptionPaymentModal] No checkoutUrl in response:', paymentData);
        throw new Error('No checkout URL received from payment service');
      }

      console.log('[SubscriptionPaymentModal] Opening checkout URL:', paymentData.checkoutUrl);
      
      // Open checkout URL in WebView
      setCheckoutUrl(paymentData.checkoutUrl);
      setShowPaymentWebView(true);
    } catch (error: any) {
      console.error('Error creating subscription payment:', error);
      Alert.alert('Payment Failed', error.message || 'Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentComplete = () => {
    setShowPaymentWebView(false);
    onPaymentSuccess();
    onClose();
    Alert.alert(
      'Payment Successful',
      'Your premium subscription payment is being processed. You will be notified once it is activated.',
      [{ text: 'OK' }]
    );
  };

  const handlePaymentFailed = () => {
    setShowPaymentWebView(false);
    Alert.alert('Payment Failed', 'The payment was not completed. Please try again.');
  };

  return (
    <>
      <Modal
        visible={visible && !showPaymentWebView}
        animationType="fade"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Subscribe to Premium</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Plan Summary */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Plan:</Text>
                  <Text style={styles.summaryValue}>{planName}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Amount:</Text>
                  <Text style={styles.summaryValue}>₱{amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                </View>
                {planType === 'yearly' && (
                  <View style={styles.savingsBadge}>
                    <Ionicons name="gift" size={16} color="#f59e0b" />
                    <Text style={styles.savingsText}>
                      Save ₱{(SUBSCRIPTION_PRICES.monthly * 12 - SUBSCRIPTION_PRICES.yearly).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}!
                    </Text>
                  </View>
                )}
              </View>

              {/* Payment Methods */}
              <Text style={styles.sectionTitle}>Select Payment Method</Text>
              <View style={styles.paymentMethods}>
                {paymentMethods.map((method) => (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.paymentMethodCard,
                      selectedMethod === method.id && styles.paymentMethodCardSelected,
                    ]}
                    onPress={() => setSelectedMethod(method.id)}
                  >
                    <View style={[styles.paymentMethodIcon, { backgroundColor: method.color + '20' }]}>
                      <Ionicons name={method.icon as any} size={22} color={method.color} />
                    </View>
                    <View style={styles.paymentMethodInfo}>
                      <Text style={styles.paymentMethodName}>{method.name}</Text>
                      <Text style={styles.paymentMethodDescription}>{method.description}</Text>
                    </View>
                    {selectedMethod === method.id && (
                      <Ionicons name="checkmark-circle" size={22} color={method.color} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Pay Button */}
              <TouchableOpacity
                style={[styles.payButton, (!selectedMethod || loading) && styles.payButtonDisabled]}
                onPress={handlePayment}
                disabled={!selectedMethod || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={styles.payButtonText}>Pay ₱{amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Payment WebView */}
      <PaymentWebView
        visible={showPaymentWebView}
        checkoutUrl={checkoutUrl}
        onClose={() => {
          setShowPaymentWebView(false);
          onClose();
        }}
        onPaymentComplete={handlePaymentComplete}
        onPaymentFailed={handlePaymentFailed}
      />
    </>
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
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  summaryCard: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '700',
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },
  savingsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f59e0b',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
  },
  paymentMethods: {
    gap: 10,
    marginBottom: 20,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
  },
  paymentMethodCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  paymentMethodIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 3,
  },
  paymentMethodDescription: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 16,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

