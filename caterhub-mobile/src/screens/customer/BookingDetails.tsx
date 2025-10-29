// src/screens/customer/BookingDetails.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Text, ActivityIndicator, Card, Button, Chip, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { fetchBookingDetails, cancelBooking } from '../../services/api';
import { useAuth } from '../../store/auth';

const BookingDetails = ({ route, navigation }: any) => {
  const { bookingId } = route.params;
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);

  // Fetch booking details
  const loadDetails = async () => {
    try {
      setLoading(true);
      const data = await fetchBookingDetails(bookingId);
      setBooking(data);
    } catch (e) {
      console.error('Failed to fetch booking details:', e);
      setError('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [bookingId]);

  const handleCancelBooking = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setCanceling(true);
              const updated = await cancelBooking(bookingId);
              setBooking((prev: any) => ({ ...prev, status: updated.status }));
              Alert.alert('Booking cancelled');
            } catch (e) {
              console.error(e);
              Alert.alert('Error', 'Failed to cancel booking.');
            } finally {
              setCanceling(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#C836F9" />
        <Text style={styles.muted}>Loading booking details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const b = booking;
  if (!b) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Booking not found</Text>
      </View>
    );
  }

  // Parse notes safely
  const meta = (() => {
    try {
      return b.notes ? JSON.parse(b.notes) : {};
    } catch {
      return {};
    }
  })();

  const selectedMenu: { categoryName: string; optionName: string }[] =
    meta?.picks?.map((p: any) => ({
      categoryName: p.categoryName,
      optionName: p.optionName,
    })) ?? [];

  const toNumber = (value: any): number => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const eventDateRaw = b.eventDate ?? b.event_date ?? null;
  const eventDateObj = eventDateRaw ? new Date(eventDateRaw) : null;
  const hasValidEventDate =
    eventDateObj instanceof Date && !Number.isNaN(eventDateObj.getTime());
  const eventDateDisplay = hasValidEventDate
    ? eventDateObj.toLocaleDateString()
    : 'Not set';

  const serviceInfo = b.service ?? b.services ?? {};
  const guestsCount = toNumber(
    b.guests ?? meta.guests ?? meta.guestCount ?? meta.guestsCount ?? 0
  );
  const pricePerHead = toNumber(
    serviceInfo.pricePerHead ??
      serviceInfo.price_per_head ??
      meta.pricePerHead ??
      meta.price_per_head ??
      meta.packagePrice ??
      meta.price ??
      0
  );
  const transportFee = toNumber(
    meta.transportFee ??
      meta.transport_fee ??
      meta.deliveryFee ??
      meta.delivery_fee ??
      b.transportFee ??
      b.transport_fee ??
      0
  );
  const packageSubtotal = guestsCount * pricePerHead;
  const totalCost = packageSubtotal + transportFee;

  const formatCurrency = (amount: number) =>
    `PHP ${toNumber(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  // Status color (same as BookingsList)
  const statusColor = (s?: string) =>
    s === 'CONFIRMED'
      ? '#10b981'
      : s === 'COMPLETED'
      ? '#2563eb'
      : s === 'DECLINED'
      ? '#ef4444'
      : s === 'CANCELLED'
      ? '#9ca3af'
      : '#f59e0b'; // PENDING

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.rowBetween}>
              <Text style={styles.title}>{serviceInfo?.name ?? 'Catering Service'}</Text>
              <Chip
                compact
                style={{
                  backgroundColor: statusColor(b.status),
                }}
                textStyle={{ color: '#fff', fontWeight: '700' }}
              >
                {b.status ?? 'PENDING'}
              </Chip>
            </View>

            {/* Info section */}
            <View style={styles.infoBlock}>
              <View style={styles.row}>
                <Ionicons name="calendar" size={18} color="#6b7280" />
                <Text style={styles.label}>{eventDateDisplay}</Text>
              </View>

              <View style={styles.row}>
                <Ionicons name="people" size={18} color="#6b7280" />
                <Text style={styles.label}>{guestsCount} Guests</Text>
              </View>

              <View style={styles.row}>
                <Ionicons name="cash-outline" size={18} color="#6b7280" />
                <Text style={styles.label}>{formatCurrency(totalCost)}</Text>
              </View>

              {meta.address && (
                <View style={styles.row}>
                  <Ionicons name="location-outline" size={18} color="#6b7280" />
                  <Text style={[styles.label, { flex: 1 }]} numberOfLines={2}>
                    {meta.address}
                  </Text>
                </View>
              )}

              {meta.paymentMethod && (
                <View style={styles.row}>
                  <Ionicons name="card-outline" size={18} color="#6b7280" />
                  <Text style={styles.label}>
                    {meta.paymentMethod.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            {/* Selected Menu */}
            {selectedMenu.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 14 }]}>
                  Selected Menu
                </Text>
                <View style={{ marginTop: 6 }}>
                  {selectedMenu.map((item, i) => (
                    <View key={i} style={styles.menuRow}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#10b981"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.menuText}>
                        {item.categoryName}: {item.optionName}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Receipt</Text>

            <View style={styles.receiptRow}>
              <View>
                <Text style={styles.receiptLabel}>Package</Text>
                <Text style={styles.receiptSubLabel}>
                  {guestsCount} guests × {formatCurrency(pricePerHead)}
                </Text>
              </View>
              <Text style={styles.receiptAmount}>
                {formatCurrency(packageSubtotal)}
              </Text>
            </View>

            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Transport fee</Text>
              <Text style={styles.receiptAmount}>
                {formatCurrency(transportFee)}
              </Text>
            </View>

            <Divider style={{ marginVertical: 12 }} />

            <View style={styles.receiptRow}>
              <Text style={[styles.receiptLabel, styles.receiptTotalLabel]}>
                Total
              </Text>
              <Text style={[styles.receiptAmount, styles.receiptTotalValue]}>
                {formatCurrency(totalCost)}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Cancel Button */}
        {b.status !== 'CANCELLED' &&
          b.status !== 'COMPLETED' &&
          b.status !== 'DECLINED' && (
            <Button
              mode="contained"
              buttonColor="#ef4444"
              textColor="#fff"
              style={styles.cancelBtn}
              loading={canceling}
              disabled={canceling}
              onPress={handleCancelBooking}
            >
              Cancel Booking
            </Button>
          )}
      </ScrollView>
    </View>
  );
};

const HEADER_HEIGHT = 100;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    height: HEADER_HEIGHT,
    backgroundColor: '#C836F9',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  backBtn: { marginRight: 10 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },

  card: {
    margin: 16,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#fff',
  },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  infoBlock: { marginTop: 6 },

  title: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  label: { fontSize: 15, color: '#374151' },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  menuText: { fontSize: 14, color: '#374151' },

  cancelBtn: { marginHorizontal: 16, marginTop: 10, borderRadius: 8 },
  muted: { color: '#6b7280', marginTop: 6 },
  errorText: { color: '#ef4444', fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 12,
  },
  receiptLabel: { fontSize: 15, color: '#1f2937', fontWeight: '600' },
  receiptSubLabel: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  receiptAmount: { fontSize: 15, color: '#111827', fontWeight: '600' },
  receiptTotalLabel: { fontSize: 16 },
  receiptTotalValue: { fontSize: 16, color: '#C836F9' },
});

export default BookingDetails;
