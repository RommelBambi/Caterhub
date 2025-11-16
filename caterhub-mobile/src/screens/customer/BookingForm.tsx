import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Text, TextInput, Button, Card, RadioButton, Dialog, Portal } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { createBooking } from '../../services/services';
import { useAuth } from '../../store/auth';
import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { calculateDeliveryFeeFromAddresses, getClosestCatererLocation } from '../../services/deliveryFee';

type FormVals = {
  date: string;
  guests: string;
  address: string;
  notes: string;
  paymentOption: 'deposit' | 'full';
  agreeToTerms: boolean;
};

export default function BookingForm({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user, token, logout } = useAuth();
  const { service, pkg, picks, notes: initialNotes, allergies } = route.params || {};

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

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormVals>({
    defaultValues: {
      date: '',
      guests: '50',
      address: '',
      notes: initialNotes ?? '',
      paymentOption: 'deposit',
      agreeToTerms: false,
    },
  });

  const [showTermsModal, setShowTermsModal] = React.useState(false);

  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [pickerDate, setPickerDate] = React.useState<Date>(new Date());
  const iosOnChangeRef = React.useRef<((value: string) => void) | null>(null);

  // Delivery fee state
  const [deliveryFee, setDeliveryFee] = React.useState<number>(0);
  const [calculatingDeliveryFee, setCalculatingDeliveryFee] = React.useState(false);
  const [deliveryFeeError, setDeliveryFeeError] = React.useState<string | null>(null);

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
  
  const packageSubtotal = guests * price;
  const total = packageSubtotal + deliveryFee;
  const depositAmount = Math.round(total / 2);
  const remainingAmount = total - depositAmount;

  const paymentOption = watch('paymentOption');
  const agreeToTerms = watch('agreeToTerms');

  const valid =
    date.length > 0 &&
    !Number.isNaN(guests) &&
    guests > 0 &&
    address.length > 0 &&
    agreeToTerms;

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Calculate delivery fee when address or guests change
  React.useEffect(() => {
    const calculateFee = async () => {
      // Only calculate if we have address, guests, and service locations
      if (!address || guests <= 0 || !service?.locations || service.locations.length === 0) {
        setDeliveryFee(0);
        setDeliveryFeeError(null);
        return;
      }

      setCalculatingDeliveryFee(true);
      setDeliveryFeeError(null);

      try {
        // Get caterer locations from service
        const catererLocations = service.locations
          .filter((loc: any) => loc.latitude && loc.longitude)
          .map((loc: any) => ({
            latitude: loc.latitude,
            longitude: loc.longitude,
            address: loc.address,
          }));

        if (catererLocations.length === 0) {
          setDeliveryFee(0);
          setDeliveryFeeError('No valid caterer locations found');
          return;
        }

        // Get closest caterer location
        const closestLocation = await getClosestCatererLocation(address, catererLocations);

        if (!closestLocation) {
          setDeliveryFee(0);
          setDeliveryFeeError('Could not determine distance');
          return;
        }

        // Calculate delivery fee
        const fee = await calculateDeliveryFeeFromAddresses(
          address,
          closestLocation.location.latitude,
          closestLocation.location.longitude,
          guests
        );

        if (fee === null) {
          setDeliveryFee(0);
          setDeliveryFeeError('Failed to calculate delivery fee');
          return;
        }

        setDeliveryFee(fee);
        setDeliveryFeeError(null);
      } catch (err: any) {
        console.error('[BookingForm] Error calculating delivery fee:', err);
        setDeliveryFee(0);
        setDeliveryFeeError('Error calculating delivery fee');
      } finally {
        setCalculatingDeliveryFee(false);
      }
    };

    // Debounce calculation to avoid too many API calls
    const timeoutId = setTimeout(calculateFee, 1000);
    return () => clearTimeout(timeoutId);
  }, [address, guests, service?.locations]);

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
        allergies: allergies || '', // Include allergy/dietary restriction information
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
        deliveryFee: deliveryFee, // Include calculated delivery fee
      });

      console.log('[BookingForm] Booking created successfully, navigating to payment...');
      
      // Navigate to payment screen with deposit info
      navigation.navigate('Payment', {
        bookingId: bookingData.id,
        amount: total,
        depositAmount,
        remainingAmount,
        paymentOption: d.paymentOption, // Pass the selected payment option
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
                {pkg.name} • {price > 0 ? `₱${price.toLocaleString()}` : 'Price TBD'}
              </Text>
            )}
            {Array.isArray(picks) && picks.length > 0 && (
              <View style={styles.dishesTable}>
                <Text style={styles.dishesTableTitle}>Selected Dishes:</Text>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, styles.categoryColumn]}>Category</Text>
                  <Text style={[styles.tableHeaderText, styles.dishColumn]}>Dish</Text>
                </View>
                {picks.map((p: any, index: number) => (
                  <View key={index} style={[styles.tableRow, index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]}>
                    <Text style={[styles.tableCellText, styles.categoryColumn]}>{p.categoryName}</Text>
                    <Text style={[styles.tableCellText, styles.dishColumn]}>{p.optionName}</Text>
                  </View>
                ))}
              </View>
            )}
            {initialNotes ? (
              <Text style={styles.prefilledNote}>Prefilled note: {initialNotes}</Text>
            ) : null}
          </Card.Content>
        </Card>

        {/* Date Input */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Event Date *</Text>
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
          {errors.date && <Text style={styles.errorText}>{errors.date.message}</Text>}
        </View>

        {/* Guest Count */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Number of Guests *</Text>
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
          {errors.guests && <Text style={styles.errorText}>{errors.guests.message}</Text>}
        </View>

        {/* Address */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Event Address *</Text>
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
          {errors.address && <Text style={styles.errorText}>{errors.address.message}</Text>}
        </View>

        {/* Payment Option */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Payment Option</Text>
          <View style={styles.paymentOptions}>
            <TouchableOpacity 
              style={[styles.paymentOption, paymentOption === 'deposit' && styles.paymentOptionSelected]}
              onPress={() => setValue('paymentOption', 'deposit')}
            >
              <View style={styles.radioContainer}>
                <View style={[styles.radio, paymentOption === 'deposit' && styles.radioSelected]}>
                  {paymentOption === 'deposit' && <View style={styles.radioDot} />}
                </View>
                <Text>50% Down Payment</Text>
              </View>
              <Text style={styles.paymentAmount}>₱{depositAmount.toLocaleString()}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.paymentOption, paymentOption === 'full' && styles.paymentOptionSelected]}
              onPress={() => setValue('paymentOption', 'full')}
            >
              <View style={styles.radioContainer}>
                <View style={[styles.radio, paymentOption === 'full' && styles.radioSelected]}>
                  {paymentOption === 'full' && <View style={styles.radioDot} />}
                </View>
                <Text>Full Payment</Text>
              </View>
              <Text style={styles.paymentAmount}>₱{total.toLocaleString()}</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.paymentSummary}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Package Subtotal:</Text>
              <Text style={styles.paymentValue}>₱{packageSubtotal.toLocaleString()}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>
                Delivery Fee
                {calculatingDeliveryFee && <Text style={{ fontSize: 12, color: '#666' }}> (calculating...)</Text>}
                {deliveryFeeError && <Text style={{ fontSize: 12, color: '#ef4444' }}> (error)</Text>}
                :
              </Text>
              <Text style={styles.paymentValue}>
                {calculatingDeliveryFee ? '...' : `₱${deliveryFee.toLocaleString()}`}
              </Text>
            </View>
            {paymentOption === 'deposit' ? (
              <>
                <View style={[styles.paymentRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e5e7eb' }]}>
                  <Text style={styles.paymentLabel}>Subtotal:</Text>
                  <Text style={styles.paymentValue}>₱{total.toLocaleString()}</Text>
                </View>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Deposit (50%):</Text>
                  <Text style={styles.paymentValue}>₱{depositAmount.toLocaleString()}</Text>
                </View>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Remaining (50%):</Text>
                  <Text style={styles.paymentValue}>₱{remainingAmount.toLocaleString()}</Text>
                </View>
                <View style={[styles.paymentRow, styles.paymentTotal]}>
                  <Text style={styles.paymentTotalLabel}>Total:</Text>
                  <Text style={styles.paymentTotalValue}>₱{total.toLocaleString()}</Text>
                </View>
              </>
            ) : (
              <View style={[styles.paymentRow, styles.paymentTotal, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e5e7eb' }]}>
                <Text style={styles.paymentTotalLabel}>Total:</Text>
                <Text style={styles.paymentTotalValue}>₱{total.toLocaleString()}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Additional Notes */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Additional Notes</Text>
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Additional notes (optional)"
                value={value}
                onChangeText={onChange}
                multiline
                numberOfLines={4}
                style={[styles.input, { minHeight: 100 }]}
              />
            )}
          />
        </View>

        <TouchableOpacity 
          style={styles.termsCheckboxContainer}
          onPress={() => setValue('agreeToTerms', !agreeToTerms)}
        >
          <View style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}>
            {agreeToTerms && <Ionicons name="checkmark" size={16} color="white" />}
          </View>
          <Text style={styles.termsText}>
            I agree to the <Text 
              style={styles.termsLink}
              onPress={() => setShowTermsModal(true)}
            >
              Terms and Conditions
            </Text>
            {!agreeToTerms && <Text style={styles.requiredAsterisk}> *</Text>}
          </Text>
        </TouchableOpacity>
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

      {/* Enhanced Terms and Conditions Modal */}
      <Portal>
        <Dialog 
          visible={showTermsModal} 
          onDismiss={() => setShowTermsModal(false)}
          style={styles.termsDialog}
        >
          <Dialog.Title style={styles.termsTitle}>Terms and Conditions</Dialog.Title>
          <Dialog.ScrollArea style={styles.termsScrollArea}>
            <ScrollView 
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 8 }}
            >
            <Text style={styles.termsIntro}>
              Please read and accept our terms and conditions to proceed with your booking.
            </Text>
            
            <Text style={styles.termsSectionTitle}>1. Payment Terms</Text>
            <View style={styles.termsSection}>
              <Text style={styles.termsParagraph}>• A 50% down payment is required to confirm your booking.</Text>
              <Text style={styles.termsParagraph}>• The remaining balance must be paid on the day of the event before service begins.</Text>
              <Text style={styles.termsParagraph}>• We accept GCash and PayMaya for online payments.</Text>
              <Text style={styles.termsParagraph}>• Cash payments are accepted for the remaining balance on the event day.</Text>
            </View>
            
            <Text style={styles.termsSectionTitle}>2. Cancellation Policy</Text>
            <View style={styles.termsSection}>
              <Text style={styles.termsParagraph}>• Cancellations made 14+ days before the event: Full refund of deposit</Text>
              <Text style={styles.termsParagraph}>• Cancellations 7-14 days before: 50% of deposit forfeited</Text>
              <Text style={styles.termsParagraph}>• Cancellations less than 7 days before: Full deposit forfeited</Text>
              <Text style={styles.termsParagraph}>• No-shows will be charged the full amount</Text>
            </View>
            
            <Text style={styles.termsSectionTitle}>3. Changes to Booking</Text>
            <View style={styles.termsSection}>
              <Text style={styles.termsParagraph}>• Guest count changes allowed up to 7 days before the event</Text>
              <Text style={styles.termsParagraph}>• Menu changes must be finalized at least 14 days before the event</Text>
              <Text style={styles.termsParagraph}>• Date changes are subject to availability</Text>
              <Text style={styles.termsParagraph}>• Additional charges may apply for last-minute changes</Text>
            </View>
            
            <Text style={styles.termsSectionTitle}>4. Service Details</Text>
            <View style={styles.termsSection}>
              <Text style={styles.termsParagraph}>• Service time includes setup and teardown</Text>
              <Text style={styles.termsParagraph}>• Additional service hours available at extra cost</Text>
              <Text style={styles.termsParagraph}>• Client is responsible for providing adequate space and utilities</Text>
            </View>
            
            <Text style={styles.termsSectionTitle}>5. Liability & Safety</Text>
            <View style={styles.termsSection}>
              <Text style={styles.termsParagraph}>• Notify us of any food allergies or dietary restrictions in advance</Text>
              <Text style={styles.termsParagraph}>• We follow food safety standards but cannot guarantee allergen-free environments</Text>
              <Text style={styles.termsParagraph}>• Client is responsible for any damage to equipment caused by guests</Text>
            </View>
            
            <Text style={styles.termsAcceptance}>
              By clicking "I Agree", you acknowledge that you have read, understood, and agree to be bound by these terms and conditions.
            </Text>
            </ScrollView>
          </Dialog.ScrollArea>
          
          <Dialog.Actions style={styles.termsActions}>
            <Button 
              mode="outlined" 
              onPress={() => {
                setValue('agreeToTerms', false);
                setShowTermsModal(false);
              }}
              style={styles.termsButton}
              labelStyle={styles.termsButtonLabel}
            >
              Decline
            </Button>
            <Button 
              mode="contained" 
              onPress={() => {
                setValue('agreeToTerms', true);
                setShowTermsModal(false);
              }}
              style={[styles.termsButton, styles.agreeButton]}
              labelStyle={styles.termsButtonLabel}
            >
              I Agree
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc', 
    paddingHorizontal: 20 
  },
  topRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20,
    paddingTop: 8
  },
  backTap: { 
    padding: 10, 
    borderRadius: 25, 
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  
  // Terms and Conditions Modal Styles
  termsDialog: {
    borderRadius: 20,
    backgroundColor: '#ffffff',
    maxWidth: 500,
    maxHeight: '85%',
    marginHorizontal: 20,
    marginVertical: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15
  },
  termsTitle: {
    color: '#1f2937',
    fontSize: 24,
    fontWeight: '700',
    paddingBottom: 12,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    marginBottom: 8
  },
  termsScrollArea: {
    maxHeight: 500,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  termsIntro: {
    marginBottom: 16,
    color: '#4b5563',
    lineHeight: 22,
  },
  termsSectionTitle: {
    fontWeight: '700',
    color: '#1f2937',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  termsSection: {
    marginBottom: 8,
    paddingLeft: 8,
  },
  termsParagraph: {
    color: '#4b5563',
    marginBottom: 6,
    lineHeight: 20,
    fontSize: 14,
  },
  termsAcceptance: {
    marginTop: 20,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    color: '#4b5563',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  termsActions: {
    padding: 20,
    paddingTop: 12,
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6'
  },
  termsButton: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    paddingVertical: 4
  },
  agreeButton: {
    backgroundColor: '#FF8000',
    borderColor: '#FF8000',
    shadowColor: '#FF8000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },
  termsButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 8,
  },

  summaryCard: { 
    marginTop: 8, 
    marginBottom: 24, 
    borderRadius: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    padding: 20
  },
  serviceName: { 
    fontSize: 20, 
    fontWeight: '700', 
    marginBottom: 4,
    color: '#1f2937'
  },
  packageText: { 
    fontWeight: '600', 
    marginBottom: 6,
    color: '#374151',
    fontSize: 16
  },
  choicesText: { 
    color: '#6b7280', 
    fontSize: 14,
    lineHeight: 20
  },
  prefilledNote: { 
    marginTop: 8, 
    color: '#4b5563', 
    fontSize: 13,
    fontStyle: 'italic'
  },
  errorText: { 
    color: '#dc2626', 
    fontSize: 14, 
    marginTop: 6,
    fontWeight: '500'
  },

  label: { 
    fontWeight: '700', 
    color: '#1f2937',
    fontSize: 16,
    marginBottom: 8
  },
  input: { 
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  inputSection: {
    marginBottom: 20,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  total: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
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
  paymentOptions: {
    marginTop: 8,
    gap: 8,
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#9ca3af',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#FF8000',
    backgroundColor: '#FF8000',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'white',
  },
  paymentAmount: {
    fontWeight: '600',
  },
  paymentSummary: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  paymentLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  paymentValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  paymentTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  paymentTotalLabel: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '700',
  },
  paymentTotalValue: {
    fontSize: 16,
    color: '#FF8000',
    fontWeight: '700',
  },
  paymentCard: {
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    padding: 20
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  paymentOption: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  paymentOptionSelected: {
    backgroundColor: '#fff7ed',
    borderColor: '#FF8000',
    shadowColor: '#FF8000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  termsCheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1
  },
  checkboxChecked: {
    backgroundColor: '#FF8000',
    borderColor: '#FF8000',
    shadowColor: '#FF8000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  termsText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  termsLink: {
    color: '#FF8000',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  requiredAsterisk: {
    color: '#ef4444',
  },

  // Table Styles for Selected Dishes
  dishesTable: {
    marginTop: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dishesTableTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  tableHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f2937',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginBottom: 2,
  },
  tableRowEven: {
    backgroundColor: '#ffffff',
  },
  tableRowOdd: {
    backgroundColor: '#f9fafb',
  },
  tableCellText: {
    fontSize: 13,
    color: '#374151',
  },
  categoryColumn: {
    flex: 1,
    fontWeight: '600',
  },
  dishColumn: {
    flex: 2,
  },
});
