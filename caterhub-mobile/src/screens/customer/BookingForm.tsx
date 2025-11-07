import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Text, TextInput, Button, Card, RadioButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { createBooking } from '../../services/services';
import { useAuth } from '../../store/auth';
import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

type FormVals = {
  date: string;
  guests: string;
  address: string;
  notes: string;
};

export default function BookingForm({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user, token, logout } = useAuth();
  const { service, pkg, picks, notes: initialNotes } = route.params || {};

  // Check authentication
  React.useEffect(() => {
    if (!token || !user) {
      console.warn('[BookingForm] User not authenticated, redirecting to login...');
      Alert.alert(
        'Login Required',
        'Please log in to create a booking.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => navigation.goBack(),
          },
          {
            text: 'Login',
            onPress: () => {
              // Logout to show login screen
              logout();
            },
          },
        ]
      );
    }
  }, [token, user, navigation, logout]);

  const { control, handleSubmit, watch } = useForm<FormVals>({
    defaultValues: {
      date: '',
      guests: '50',
      address: '',
      notes: initialNotes ?? '',
    },
  });

  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [pickerDate, setPickerDate] = React.useState<Date>(new Date());
  const iosOnChangeRef = React.useRef<((value: string) => void) | null>(null);

  const date = watch('date')?.trim() ?? '';
  const guestsStr = watch('guests')?.trim() ?? '';
  const address = watch('address')?.trim() ?? '';

  const guests = Number(guestsStr || 0);
  
  // Extract price from package - handle both string format (e.g., "12,500") and number format
  let price = 0;
  if (pkg) {
    if (typeof pkg._raw?.price === 'string') {
      // Parse string price like "12,500" or "₱12,500"
      const priceMatch = pkg._raw.price.match(/(\d+(?:,\d+)*(?:\.\d+)?)/);
      if (priceMatch) {
        price = parseFloat(priceMatch[1].replace(/,/g, ''));
      }
    } else if (pkg.pricePerHead) {
      price = pkg.pricePerHead;
    }
  }
  
  if (price === 0 && service?.pricePerHead) {
    price = service.pricePerHead;
  }
  
  const total = guests * price;

  const valid =
    date.length > 0 &&
    !Number.isNaN(guests) &&
    guests > 0 &&
    address.length > 0;

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (d: FormVals) => {
    if (!valid) {
      setError('Please fill in all required fields');
      return;
    }

    // Check authentication before submitting
    if (!token || !user) {
      setError('Please log in to create a booking');
      Alert.alert(
        'Login Required',
        'Please log in to create a booking.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Login',
            onPress: () => {
              // Logout to show login screen
              logout();
            },
          },
        ]
      );
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Calculate deposit (50%) and remaining (50%)
      const depositAmount = Math.round(total / 2);
      const remainingAmount = total - depositAmount;
      
      // Pack additional info into notes (including address for backward compatibility)
      const packedNotes = JSON.stringify({
        packageId: pkg?.id,
        picks,
        address: d.address, // Store in notes until migration is run
        extra: d.notes,
      });

      console.log('[BookingForm] Creating booking with payload:', {
        serviceId: service.id,
        eventDate: d.date,
        guests: Number(d.guests),
        packageId: pkg?.id,
        address: d.address,
        depositAmount,
        remainingAmount,
      });

      const bookingData = await createBooking({
        serviceId: service.id,
        eventDate: d.date,
        guests: Number(d.guests),
        notes: packedNotes,
        packageId: pkg?.id,
        address: d.address,
        depositAmount,
        remainingAmount,
      });

      console.log('[BookingForm] Booking created successfully, navigating to payment...');
      
      // Navigate to payment screen with deposit info
      navigation.navigate('Payment', {
        bookingId: bookingData.id,
        amount: total,
        depositAmount,
        remainingAmount,
        description: `${service?.name || 'Catering Service'}${pkg ? ` - ${pkg.name}` : ''}`,
        serviceId: service.id,
        packageId: pkg?.id,
      });
    } catch (err: any) {
      console.error('[BookingForm] Error creating booking:', err);
      
      let errorMessage = 'Failed to create booking. Please try again.';
      if (err?.message) {
        errorMessage = err.message;
        // Check if it's an authentication error
        if (err.message.includes('not authenticated') || err.message.includes('authentication')) {
          errorMessage = 'Your session has expired. Please log in again.';
          // Redirect to login after showing error
          setTimeout(() => {
            Alert.alert(
              'Session Expired',
              'Please log in again to create a booking.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    // Logout to show login screen
                    logout();
                  },
                },
              ]
            );
          }, 500);
        }
      } else if (err?.error?.message) {
        errorMessage = err.error.message;
      }
      
      setError(errorMessage);
      
      // Also show alert on mobile
      if (Platform.OS !== 'web') {
        Alert.alert('Booking Failed', errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show message if not authenticated
  if (!token || !user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 12, justifyContent: 'center', alignItems: 'center' }]}>
        <Card style={{ padding: 24, maxWidth: 400 }}>
          <Card.Content>
            <Ionicons name="lock-closed" size={48} color="#FF8000" style={{ alignSelf: 'center', marginBottom: 16 }} />
            <Text style={{ fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
              Login Required
            </Text>
            <Text style={{ color: '#6b7280', textAlign: 'center', marginBottom: 16 }}>
              Please log in to create a booking.
            </Text>
            <Button
              mode="contained"
              style={{ backgroundColor: '#FF8000' }}
              onPress={() => {
                // Logout to show login screen
                logout();
              }}
            >
              Go to Login
            </Button>
            <Button
              mode="text"
              onPress={() => navigation.goBack()}
              style={{ marginTop: 8 }}
            >
              Go Back
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  const parseDateValue = React.useCallback((value?: string) => {
    if (!value) {
      return new Date();
    }
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, []);

  const formatDateForDisplay = React.useCallback((value?: string) => {
    if (!value) return '';
    const parsed = parseDateValue(value);
    return parsed.toLocaleDateString();
  }, [parseDateValue]);

  const formatDateForStorage = React.useCallback((value: Date) => {
    return value.toISOString().split('T')[0];
  }, []);

  const openDatePicker = React.useCallback(
    (currentValue: string | undefined, onChange: (value: string) => void) => {
      const baseDate = parseDateValue(currentValue);

      if (Platform.OS === 'android') {
        DateTimePickerAndroid.open({
          value: baseDate,
          mode: 'date',
          display: 'calendar',
          onChange: (_event: DateTimePickerEvent, selectedDate?: Date) => {
            if (selectedDate) {
              onChange(formatDateForStorage(selectedDate));
            }
          },
        });
        return;
      }

      iosOnChangeRef.current = onChange;
      setPickerDate(baseDate);
      setShowDatePicker(true);
    },
    [formatDateForStorage, parseDateValue],
  );

  const closeIOSPicker = React.useCallback(() => {
    setShowDatePicker(false);
    iosOnChangeRef.current = null;
  }, []);

  const handleIOSDateChange = React.useCallback((_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setPickerDate(selectedDate);
    }
  }, []);

  const confirmIOSPicker = React.useCallback(() => {
    if (iosOnChangeRef.current) {
      iosOnChangeRef.current(formatDateForStorage(pickerDate));
    }
    closeIOSPicker();
  }, [closeIOSPicker, formatDateForStorage, pickerDate]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Back (scrolls with content) */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backTap}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Error message */}
        {error && (
          <Card style={[styles.summaryCard, { backgroundColor: '#fee2e2', borderColor: '#ef4444', borderWidth: 1 }]}>
            <Card.Content>
              <Text style={[styles.serviceName, { color: '#dc2626' }]}>Error</Text>
              <Text style={styles.errorText}>{error}</Text>
            </Card.Content>
          </Card>
        )}

        {/* Summary */}
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.serviceName}>{service?.name}</Text>
            {pkg && (
              <Text style={styles.packageText}>
                Selected: {pkg.name} • {price > 0 ? `₱${price.toLocaleString()}${guests > 0 ? ` × ${guests} guests` : ''}` : 'Price TBD'}
              </Text>
            )}
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
            <>
              <TouchableOpacity activeOpacity={0.8} onPress={() => openDatePicker(value, onChange)}>
                <View pointerEvents="none">
                  <TextInput
                    label="Event Date"
                    value={formatDateForDisplay(value)}
                    style={styles.input}
                    editable={false}
                    right={<TextInput.Icon icon="calendar" forceTextInputFocus={false} />}
                  />
                </View>
              </TouchableOpacity>

              {Platform.OS === 'ios' && showDatePicker && (
                <View style={styles.iosPickerContainer}>
                  <View style={styles.iosPickerHeader}>
                    <Button onPress={closeIOSPicker}>Cancel</Button>
                    <Button onPress={confirmIOSPicker}>Done</Button>
                  </View>
                  <DateTimePicker
                    value={pickerDate}
                    mode="date"
                    display="spinner"
                    onChange={handleIOSDateChange}
                    style={{ alignSelf: 'center' }}
                  />
                </View>
              )}
            </>
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

        {/* Payment Info */}
        <View style={[styles.input, { backgroundColor: '#FFF5E6', padding: 16, borderRadius: 8 }]}>
          <Text style={[styles.label, { marginBottom: 8 }]}>💳 Payment Information</Text>
          <Text style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
            • 50% deposit required to confirm booking
          </Text>
          <Text style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
            • Remaining 50% payable during event
          </Text>
          <Text style={{ fontSize: 13, color: '#666' }}>
            • Payment methods: GCash or PayMaya
          </Text>
        </View>

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
        <Text style={styles.total}>Total: ₱{isNaN(total) ? 0 : total.toLocaleString()}</Text>
        <Button
          mode="contained"
          style={{ flex: 1, marginLeft: 12, backgroundColor: (valid && !isSubmitting) ? '#FF8000' : '#ccc' }}
          disabled={!valid || isSubmitting}
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
        >
          {isSubmitting ? 'Creating...' : 'Confirm Booking'}
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
  errorText: { color: '#dc2626', fontSize: 14, marginTop: 4 },

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
  iosPickerContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
});
