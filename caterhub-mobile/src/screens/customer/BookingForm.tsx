import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card, RadioButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { createBooking } from '../../services/services';

type FormVals = {
  date: string;
  guests: string;
  address: string;
  paymentMethod: 'cash' | 'gcash' | 'bank';
  notes: string;
};

export default function BookingForm({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { service, pkg, picks, notes: initialNotes } = route.params || {};

  const { control, handleSubmit, watch } = useForm<FormVals>({
    defaultValues: {
      date: '',
      guests: '50',
      address: '',
      paymentMethod: undefined as any, // force selection
      notes: initialNotes ?? '',
    },
  });

  const date = watch('date')?.trim() ?? '';
  const guestsStr = watch('guests')?.trim() ?? '';
  const address = watch('address')?.trim() ?? '';
  const paymentMethod = watch('paymentMethod');

  const guests = Number(guestsStr || 0);
  const price = pkg?.pricePerHead ?? service?.pricePerHead ?? 0;
  const total = guests * price;

  const valid =
    date.length > 0 &&
    guestsStr.length > 0 &&
    !Number.isNaN(guests) &&
    guests > 0 &&
    address.length > 0 &&
    !!paymentMethod;

  const onSubmit = async (d: FormVals) => {
    if (!valid) return;
    // If the backend doesn't have dedicated fields yet for address/paymentMethod,
    // we include them inside notes as well so nothing is lost.
    const packedNotes = JSON.stringify({
      packageId: pkg?.id,
      picks,
      paymentMethod: d.paymentMethod,
      address: d.address,
      extra: d.notes,
    });

    await createBooking({
      serviceId: service.id,
      eventDate: d.date,
      guests: Number(d.guests),
      notes: packedNotes,
      // Optionally, if your backend already supports these fields, include them too:
      // address: d.address,
      // paymentMethod: d.paymentMethod,
    });
    navigation.getParent()?.navigate('Bookings');

    navigation.navigate('Bookings', { flash: 'Booking created!' });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Back (scrolls with content) */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backTap}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.serviceName}>{service?.name}</Text>
            {pkg && <Text style={styles.packageText}>Selected: {pkg.name} • ₱{price}/head</Text>}
            {Array.isArray(picks) && picks.length > 0 && (
              <Text style={styles.choicesText}>
                {picks.map((p: any) => `${p.categoryName}: ${p.optionName}`).join(' • ')}
              </Text>
            )}
            {initialNotes ? (
              <Text style={styles.prefilledNote}>Prefilled note: {initialNotes}</Text>
            ) : null}
          </Card.Content>
        </Card>

        {/* Date */}
        <Controller
          control={control}
          name="date"
          rules={{ required: true }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Event Date (YYYY-MM-DD)"
              value={value}
              onChangeText={onChange}
              style={styles.input}
            />
          )}
        />

        {/* Guests */}
        <Controller
          control={control}
          name="guests"
          rules={{ required: true }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Guests"
              value={value}
              onChangeText={onChange}
              keyboardType="numeric"
              style={styles.input}
            />
          )}
        />

        {/* Address */}
        <Controller
          control={control}
          name="address"
          rules={{ required: true }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Event Address"
              value={value}
              onChangeText={onChange}
              multiline
              numberOfLines={3}
              style={[styles.input, { minHeight: 80 }]}
            />
          )}
        />

        {/* Payment method */}
        <Text style={[styles.label, { marginTop: 14 }]}>Payment Method</Text>
        <Controller
          control={control}
          name="paymentMethod"
          rules={{ required: true }}
          render={({ field: { onChange, value } }) => (
            <RadioButton.Group onValueChange={onChange} value={value}>
              <RadioButton.Item label="Cash" value="cash" position="leading" color="#C836F9" />
              <RadioButton.Item label="GCash" value="gcash" position="leading" color="#C836F9" />
              <RadioButton.Item label="Bank Transfer" value="bank" position="leading" color="#C836F9" />
            </RadioButton.Group>
          )}
        />

        {/* Additional notes (editable, prefilled from CustomizePackage if provided) */}
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Additional Notes (optional)"
              value={value}
              onChangeText={onChange}
              multiline
              numberOfLines={5}
              style={[styles.input, { minHeight: 110 }]}
              contentStyle={{ paddingTop: 12 }}
            />
          )}
        />
      </ScrollView>

      {/* Sticky footer */}
      <View style={styles.footer}>
        <Text style={styles.total}>Total: ₱{isNaN(total) ? 0 : total}</Text>
        <Button
          mode="contained"
          style={{ flex: 1, marginLeft: 12, backgroundColor: valid ? '#C836F9' : '#ccc' }}
          disabled={!valid}
          onPress={handleSubmit(onSubmit)}
        >
          Confirm Booking
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backTap: { padding: 6, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.04)' },

  summaryCard: { marginTop: 4, marginBottom: 16, borderRadius: 12 },
  serviceName: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  packageText: { fontWeight: '600', marginBottom: 4 },
  choicesText: { color: '#6b7280', fontSize: 13 },
  prefilledNote: { marginTop: 6, color: '#4b5563', fontSize: 13 },

  label: { fontWeight: '700', color: '#374151' },
  input: { marginTop: 12 },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  total: { fontWeight: '700', fontSize: 16 },
});
