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
  const { bookingId, invoiceId, chargeId, externalId } = route.params;

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
  }, [invoiceId, chargeId, externalId, bookingId]);

  const checkPaymentStatus = async () => {
    try {
      // Check booking status directly from database for Xendit payments
      const { data: booking, error } = await supabase
        .from('bookings')
        .select('payment_status, deposit_paid, xendit_invoice_id, xendit_charge_id, xendit_external_id, status')
        .eq('id', bookingId)
        .single();

      console.log('Booking Status Response:', booking);
      console.log('Payment Status Details:', {
        bookingId,
        invoiceId,
        chargeId,
        externalId,
        booking,
      });

      if (error || !booking) {
        setMessage('Checking payment status... (If you completed payment, it may take a moment to process)');
        return;
      }

      const status = booking.payment_status;

      // Handle Xendit payment status
      if (status === 'COMPLETED' && booking.deposit_paid) {
        // Payment successful
        setPaymentStatus('success');
        setMessage('Payment confirmed! Your booking is now confirmed.');
        setChecking(false);
        
        // Show success state but don't auto-navigate
        // Let user manually tap "View Booking" button for better UX
        
      } else if (status === 'FAILED') {
        // Payment failed
        setPaymentStatus('failed');
        setMessage('Payment failed. Please try again or contact support.');
        setChecking(false);
        
      } else if (status === 'PENDING') {
        // Still pending
        setMessage('Waiting for payment confirmation... Please wait while we verify your payment.');
        
      } else {
        // Unknown status
        setMessage('Checking payment status... Please wait.');
      }

    } catch (error: any) {
      console.error('Error checking payment status:', error);
      setMessage('Error checking payment status. Please check your internet connection.');
    }
  };

  const handleRetry = () => {
    setChecking(true);
    setPaymentStatus('pending');
    setMessage('Checking payment status...');
    checkPaymentStatus();
  };

  const handleGoBack = () => {
    Alert.alert(
      'Cancel Payment Check',
      'Are you sure you want to go back? If you completed the payment, it may still be processing.',
      [
        {
          text: 'Keep Waiting',
          style: 'cancel',
        },
        {
          text: 'Go Back',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const handleViewBooking = () => {
    navigation.navigate('BookingDetails', { bookingId });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Status</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.statusCard}>
          {/* Status Icon */}
          <View style={[
            styles.iconContainer,
            paymentStatus === 'success' && styles.iconSuccess,
            paymentStatus === 'failed' && styles.iconFailed,
            paymentStatus === 'pending' && styles.iconPending,
          ]}>
            {paymentStatus === 'pending' && checking && (
              <ActivityIndicator size="large" color={COLORS.white} />
            )}
            {paymentStatus === 'success' && (
              <Ionicons name="checkmark" size={48} color={COLORS.white} />
            )}
            {paymentStatus === 'failed' && (
              <Ionicons name="close" size={48} color={COLORS.white} />
            )}
            {paymentStatus === 'pending' && !checking && (
              <Ionicons name="time" size={48} color={COLORS.white} />
            )}
          </View>

          {/* Status Title */}
          <Text style={styles.statusTitle}>
            {paymentStatus === 'pending' && 'Verifying Payment'}
            {paymentStatus === 'success' && 'Payment Successful!'}
            {paymentStatus === 'failed' && 'Payment Failed'}
          </Text>

          {/* Status Message */}
          <Text style={styles.statusMessage}>{message}</Text>

          {/* Payment Details */}
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>Payment Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Booking ID:</Text>
              <Text style={styles.detailValue}>#{bookingId}</Text>
            </View>
            {invoiceId && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Invoice ID:</Text>
                <Text style={styles.detailValue}>{invoiceId}</Text>
              </View>
            )}
            {chargeId && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Charge ID:</Text>
                <Text style={styles.detailValue}>{chargeId}</Text>
              </View>
            )}
            {externalId && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Reference ID:</Text>
                <Text style={styles.detailValue}>{externalId}</Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {paymentStatus === 'failed' && (
              <TouchableOpacity
                style={[styles.button, styles.retryButton]}
                onPress={handleRetry}
              >
                <Ionicons name="refresh" size={20} color={COLORS.white} />
                <Text style={styles.buttonText}>Try Again</Text>
              </TouchableOpacity>
            )}

            {paymentStatus === 'success' && (
              <TouchableOpacity
                style={[styles.button, styles.successButton]}
                onPress={handleViewBooking}
              >
                <Ionicons name="eye" size={20} color={COLORS.white} />
                <Text style={styles.buttonText}>View Booking</Text>
              </TouchableOpacity>
            )}

            {paymentStatus === 'pending' && !checking && (
              <TouchableOpacity
                style={[styles.button, styles.retryButton]}
                onPress={handleRetry}
              >
                <Ionicons name="refresh" size={20} color={COLORS.white} />
                <Text style={styles.buttonText}>Check Again</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
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
    padding: 16,
    justifyContent: 'center',
  },
  statusCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconPending: {
    backgroundColor: COLORS.info,
  },
  iconSuccess: {
    backgroundColor: COLORS.success,
  },
  iconFailed: {
    backgroundColor: COLORS.danger,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  statusMessage: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  detailsCard: {
    width: '100%',
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
  },
  successButton: {
    backgroundColor: COLORS.success,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});
