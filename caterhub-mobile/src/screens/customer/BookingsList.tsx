// src/screens/customer/BookingsList.tsx
import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, ActivityIndicator, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { fetchMyBookings } from '../../services/services';
import { useAuth } from '../../store/auth';

type Booking = {
  id: number;
  service_id?: number | null;
  package_id?: string | null;
  packages?: { 
    id: string; 
    name: string; 
    price: string; 
    caterer_id: string;
    business_name?: string;
  } | null;
  event_date: string;
  guests: number;
  notes?: string;
  status?: 'PENDING' | 'CONFIRMED' | 'ON_THE_WAY' | 'DECLINED' | 'COMPLETED' | 'CANCELLED';
  pricePerHead?: number;
  // Legacy fields for backward compatibility
  serviceId?: number;
  eventDate?: string;
  service?: { id: number; name: string };
};

export default function BookingsList({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [items, setItems] = React.useState<Booking[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMyBookings();
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const statusColor = (s?: Booking['status']) =>
    s === 'CONFIRMED'
      ? '#10b981'
      : s === 'ON_THE_WAY'
      ? '#f59e0b'
      : s === 'COMPLETED'
      ? '#2563eb'
      : s === 'DECLINED'
      ? '#ef4444'
      : s === 'CANCELLED'
      ? '#9ca3af'
      : '#f59e0b';

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + 40 }]}>
        <ActivityIndicator animating color="#FF8000" />
        <Text style={{ marginTop: 8, color: '#6b7280' }}>Loading bookings…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.topRow}>
        <Text style={styles.title}>My bookings</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {items.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="calendar-outline" size={40} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptyText}>Browse caterers and make your first booking.</Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16 }}>
            {items.map((b) => (
              <Card key={b.id} style={styles.card}>
                <Card.Content>
                  <View style={styles.rowBetween}>
                    <Text style={styles.serviceName}>
                      {b.packages?.business_name ?? b.service?.name ?? 'Catering Service'}
                    </Text>
                    <Chip compact style={{ backgroundColor: statusColor(b.status) }} textStyle={{ color: '#fff' }}>
                      {b.status ?? 'PENDING'}
                    </Chip>
                  </View>

                  <View style={styles.row}>
                    <Ionicons name="calendar" size={16} color="#6b7280" />
                    <Text style={styles.muted}>
                      {(b.event_date || b.eventDate)?.slice(0, 10)} • {b.guests} guests
                    </Text>
                  </View>

                  {/* ✅ Navigate within same stack */}
                  <TouchableOpacity onPress={() => navigation.navigate('BookingDetails', { bookingId: b.id })}>
                    <Text style={styles.link}>View details</Text>
                  </TouchableOpacity>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topRow: { paddingHorizontal: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  card: { marginBottom: 12, borderRadius: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  serviceName: { fontWeight: '700', fontSize: 16 },
  muted: { color: '#6b7280' },
  link: { marginTop: 10, color: '#FF8000', fontWeight: '600' },
  emptyWrap: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 24 },
  emptyTitle: { marginTop: 10, fontSize: 16, fontWeight: '700' },
  emptyText: { marginTop: 4, color: '#6b7280', textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
