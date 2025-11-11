import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../services/supabase';
import { checkPaymentStatusViaEdgeFunction } from '../../services/paymentEdgeFunction';

const COLORS = {
  primary: '#FF8000',
  text: '#1e293b',
  textLight: '#64748b',
  bg: '#f8fafc',
  white: '#ffffff',
  border: '#e2e8f0',
  success: '#22c55e',
  danger: '#dc2626',
  info: '#0ea5e9',
};

export default function PaymentPendingScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { bookingId, paymentIntentId, paymentSourceId } = route.params;

  const [checking, setChecking] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const [message, setMessage] = useState('Checking payment status...');

  useEffect(() => {
    checkPaymentStatus();
    
    // Poll every 3 seconds for payment status
    const interval = setInterval(() => {
      checkPaymentStatus();
    }, 3000);

    // Stop polling after 5 minutes
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setPaymentStatus(prev => {
        if (prev === 'pending') {
          setMessage('Payment verification timed out. Please check your booking status.');
          setChecking(false);
          return 'failed';
        }
        return prev;
      });
    }, 300000); // 5 minutes

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [paymentIntentId, paymentSourceId, bookingId]);

  const checkPaymentStatus = async () => {
    try {
      // Use Edge Function to check payment status securely
      const statusResponse = await checkPaymentStatusViaEdgeFunction({
        paymentIntentId: paymentIntentId || undefined,
        paymentSourceId: paymentSourceId || undefined,
      });

      console.log('Payment Status Response:', statusResponse);
      console.log('Payment Status Details:', {
        success: statusResponse.success,
        type: statusResponse.type,
        status: statusResponse.status,
        paymentIntentId,
        paymentSourceId,
        bookingId,
      });

      if (!statusResponse.success) {
        // Payment not found or error
        if (statusResponse.error === 'Payment intent not found') {
          setMessage('Waiting for payment confirmation... (Payment may still be processing)');
        } else {
          setMessage('Checking payment status... (If you completed payment, it may take a moment to process)');
        }
        return;
      }

      const status = statusResponse.status;

      // Handle Payment Intent status
      if (statusResponse.type === 'payment_intent') {
        if (status === 'succeeded') {
          // Update booking status - mark deposit as paid
          // Get transaction ID from payment intent if available
          const transactionId = statusResponse.paymentIntent?.attributes?.last_payment_error 
            ? null 
            : statusResponse.paymentIntent?.id || paymentIntentId;

          const { error } = await supabase
            .from('bookings')
            .update({
              payment_status: 'COMPLETED',
              deposit_paid: true,
              paid_at: new Date().toISOString(),
              status: 'CONFIRMED',
              transaction_id: transactionId || paymentIntentId, // Store payment intent ID as transaction ID
            })
            .eq('id', bookingId);

          if (error) {
            console.error('Error updating booking:', error);
          } else {
            console.log('✅ Booking updated successfully with payment completion');
          }

          setPaymentStatus('success');
          setMessage('Deposit payment successful! Your booking is confirmed.');
          setChecking(false);
          return;
        } else if (status === 'failed') {
          setPaymentStatus('failed');
          setMessage('Payment failed. Please try again.');
          setChecking(false);
          return;
        } else if (status === 'processing') {
          setMessage('Processing your payment...');
        } else if (status === 'awaiting_next_action') {
          // Payment Intent is waiting for user action (authorization)
          // This is normal - user needs to complete payment in PayMongo
          setMessage('Waiting for you to complete payment in PayMongo...');
        } else if (status === 'awaiting_payment_method') {
          setMessage('Waiting for payment method...');
        } else {
          setMessage(`Waiting for payment confirmation... (Status: ${status})`);
        }
      }

      // Handle Payment Source status
      if (statusResponse.type === 'payment_source') {
        if (status === 'chargeable' || status === 'paid') {
          // Update booking status - mark deposit as paid
          // Get transaction ID from source if available
          const transactionId = statusResponse.source?.id || paymentSourceId || paymentIntentId;

          const { error } = await supabase
            .from('bookings')
            .update({
              payment_status: 'COMPLETED',
              deposit_paid: true,
              paid_at: new Date().toISOString(),
              status: 'CONFIRMED',
              transaction_id: transactionId, // Store source ID or payment intent ID as transaction ID
            })
            .eq('id', bookingId);

          if (error) {
            console.error('Error updating booking:', error);
          } else {
            console.log('✅ Booking updated successfully with payment completion');
          }

          setPaymentStatus('success');
          setMessage('Deposit payment successful! Your booking is confirmed.');
          setChecking(false);
        } else if (status === 'failed' || status === 'cancelled') {
          setPaymentStatus('failed');
          setMessage('Payment failed. Please try again.');
          setChecking(false);
        } else if (status === 'pending') {
          setMessage('Waiting for payment confirmation...');
        }
      }
    } catch (error: any) {
      console.error('Error checking payment status:', error);
      // Don't stop checking on error, might be temporary network issue
      // Only show error message if we've been checking for a while
      if (checking && paymentStatus === 'pending') {
        setMessage('Checking payment status... (If you completed payment, it may take a moment to process)');
      }
    }
  };

  const handleDone = () => {
    if (paymentStatus === 'success') {
      // Navigate to bookings list
      navigation.navigate('Bookings');
    } else {
      // Go back to payment screen to retry
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {/* Status Icon */}
        <View style={styles.iconContainer}>
          {checking ? (
            <ActivityIndicator size="large" color={COLORS.primary} />
          ) : paymentStatus === 'success' ? (
            <View style={[styles.iconCircle, { backgroundColor: COLORS.success + '20' }]}>
              <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
            </View>
          ) : (
            <View style={[styles.iconCircle, { backgroundColor: COLORS.danger + '20' }]}>
              <Ionicons name="close-circle" size={80} color={COLORS.danger} />
            </View>
          )}
        </View>

        {/* Status Message */}
        <Text style={styles.title}>
          {checking
            ? 'Verifying Payment'
            : paymentStatus === 'success'
            ? 'Payment Successful!'
            : 'Payment Failed'}
        </Text>
        <Text style={styles.message}>{message}</Text>

        {/* Info Box */}
        {checking && (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={COLORS.info} />
            <Text style={styles.infoText}>
              Please wait while we verify your payment. This may take a few moments.{'\n\n'}
              <Text style={{ fontWeight: '600' }}>Important:</Text> If you see an error page on PayMongo after completing payment, that's normal! Just close that page and return to this app. We'll automatically verify your payment.{'\n\n'}
              <Text style={{ fontWeight: '600' }}>What to do:</Text>
              {'\n'}1. Complete payment in PayMongo
              {'\n'}2. Close the PayMongo page (even if it shows an error)
              {'\n'}3. Return to this app
              {'\n'}4. We'll verify your payment automatically
            </Text>
          </View>
        )}

        {paymentStatus === 'success' && (
          <View style={[styles.infoBox, { backgroundColor: COLORS.success + '15' }]}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={[styles.infoText, { color: COLORS.success }]}>
              Your 50% deposit has been paid successfully! Your booking is now confirmed. The remaining 50% can be paid during the event.
            </Text>
          </View>
        )}

        {paymentStatus === 'failed' && (
          <View style={[styles.infoBox, { backgroundColor: COLORS.danger + '15' }]}>
            <Ionicons name="alert-circle" size={20} color={COLORS.danger} />
            <Text style={[styles.infoText, { color: COLORS.danger }]}>
              Your payment could not be processed. Please try again or contact support.
            </Text>
          </View>
        )}

        {/* Action Button */}
        {!checking && (
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor:
                  paymentStatus === 'success' ? COLORS.success : COLORS.primary,
              },
            ]}
            onPress={handleDone}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {paymentStatus === 'success' ? 'View Bookings' : 'Try Again'}
            </Text>
            <Ionicons
              name={paymentStatus === 'success' ? 'calendar' : 'refresh'}
              size={20}
              color={COLORS.white}
            />
          </TouchableOpacity>
        )}

        {/* Manual Check Button */}
        {checking && (
          <TouchableOpacity
            style={styles.manualButton}
            onPress={checkPaymentStatus}
            activeOpacity={0.7}
          >
            <Text style={styles.manualButtonText}>Check Status Now</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.info + '15',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    width: '100%',
    maxWidth: 400,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    width: '100%',
    maxWidth: 400,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  manualButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  manualButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
