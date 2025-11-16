import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Platform
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PartnerStackParamList } from "../../navigation/caterer/PartnerNav";
import { supabase } from "../../services/supabase";

import Sidebar from "../../components/caterer/Sidebar";
import TopBar from "../../components/caterer/TopBar";
import BottomNav from "../../components/caterer/BottomNav";
import { isWeb } from "../../utils/platform";
import { calculateDeliveryFeeFromAddresses, getClosestCatererLocation } from "../../services/deliveryFee";

type OrderDetailsRouteParams = {
  order: {
    id: number;
    bookingId: string;
    customerName: string;
    customerEmail: string;
    customerId: string;
    serviceName: string;
    packageName?: string;
    packagePrice?: string;
    selectedDishes: Array<{
      sectionLabel: string;
      chosenDish: string;
    }>;
    venue: string;
    inclusions: string[];
    status: "PENDING" | "CONFIRMED" | "ON_THE_WAY" | "DECLINED" | "COMPLETED" | "CANCELLED";
    eventDate: string;
    guests: number;
    totalPrice: string;
    notes?: string;
    // Payment fields
    deposit_amount?: number;
    remaining_amount?: number;
    deposit_paid?: boolean;
    remaining_paid?: boolean;
    remaining_paid_method?: string;
    payment_method?: string;
    payment_status?: string;
    delivery_fee?: number;
  };
};

export default function PartnerOrderDetailsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<PartnerStackParamList>>();

  // get order passed from OrdersScreen
  const route =
    useRoute<{
      key: string;
      name: "PartnerOrderDetails";
      params: OrderDetailsRouteParams;
    }>();
  const { order } = route.params;

  const [updating, setUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(order.status);
  const [depositPaid, setDepositPaid] = useState(order.deposit_paid || false);
  const [remainingPaid, setRemainingPaid] = useState(order.remaining_paid || false);
  
  // ----- MODAL STATE (cancel / decline w/ reason) -----
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [modalMode, setModalMode] = useState<"cancel" | "decline" | null>(
    null
  );
  const [reasonText, setReasonText] = useState("");
  
  // ----- DELIVERY FEE MODAL STATE -----
  const [showDeliveryFeeModal, setShowDeliveryFeeModal] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState("");
  const [calculatingFee, setCalculatingFee] = useState(false);
  const [calculatedFee, setCalculatedFee] = useState<number | null>(null);

  function openReasonModal(mode: "cancel" | "decline") {
    setModalMode(mode);
    setReasonText("");
    setShowReasonModal(true);
  }

  function closeReasonModal() {
    setShowReasonModal(false);
    setModalMode(null);
    setReasonText("");
  }

  async function updateBookingStatus(newStatus: string, reason?: string, stayOnPage: boolean = false) {
    console.log('[PartnerOrderDetailsScreen] updateBookingStatus called with:', newStatus, reason);
    setUpdating(true);
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // If there's a reason (for cancel/decline), update notes
      if (reason) {
        const { data: booking, error: fetchError } = await supabase
          .from('bookings')
          .select('notes')
          .eq('id', order.id)
          .single();
        
        if (fetchError) {
          console.error('[PartnerOrderDetailsScreen] Error fetching booking notes:', fetchError);
          throw fetchError;
        }
        
        let notesData: any = {};
        try {
          notesData = booking?.notes ? JSON.parse(booking.notes) : {};
        } catch (e) {
          notesData = { extra: booking?.notes || '' };
        }
        
        notesData.statusReason = reason;
        notesData.statusReasonDate = new Date().toISOString();
        notesData.statusUpdatedBy = 'caterer';
        updateData.notes = JSON.stringify(notesData);
      }

      const { data, error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', order.id)
        .select()
        .single();

      if (error) {
        console.error('[PartnerOrderDetailsScreen] Error updating booking:', error);
        console.error('[PartnerOrderDetailsScreen] Update data:', updateData);
        console.error('[PartnerOrderDetailsScreen] Booking ID:', order.id);
        throw error;
      }

      console.log('[PartnerOrderDetailsScreen] Booking updated successfully:', data);
      console.log('[PartnerOrderDetailsScreen] New status:', data?.status);
      
      // Update local state immediately with the actual status from database
      const updatedStatus = data?.status || newStatus;
      setCurrentStatus(updatedStatus as any);
      console.log('[PartnerOrderDetailsScreen] Updated currentStatus state to:', updatedStatus);
      
      // Also update the order object if data is returned
      if (data && data.status) {
        // Update the order status in the route params (if possible)
        // The state update above should be sufficient for UI re-render
      }
      
      closeReasonModal();
      
      // Only navigate back if not staying on page
      if (!stayOnPage) {
        if (Platform.OS === 'web') {
          // Use window.alert for web
          window.alert(`Order ${newStatus.toLowerCase()} successfully.`);
          // Small delay to let the alert show, then navigate back
          setTimeout(() => {
            navigation.goBack();
          }, 100);
        } else {
          Alert.alert(
            'Success',
            `Order ${newStatus.toLowerCase()} successfully.`,
            [
              {
                text: 'OK',
                onPress: () => navigation.goBack()
              }
            ]
          );
        }
      } else {
        // Just show success message without navigating
        // Don't show alert for ON_THE_WAY to avoid interrupting workflow
        if (newStatus !== 'ON_THE_WAY') {
          if (Platform.OS === 'web') {
            window.alert(`Order ${newStatus.toLowerCase()} successfully.`);
          } else {
            Alert.alert('Success', `Order ${newStatus.toLowerCase()} successfully.`);
          }
        }
      }
    } catch (error: any) {
      console.error('[PartnerOrderDetailsScreen] Error updating booking status:', error);
      
      let errorMessage = 'Failed to update booking status';
      if (error?.message) {
        errorMessage = error.message;
        // Check for RLS policy errors
        if (error.message.includes('policy') || error.message.includes('permission')) {
          errorMessage = 'You do not have permission to update this booking. Please contact support.';
        }
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  async function handleAccept() {
    console.log('[PartnerOrderDetailsScreen] handleAccept called');
    
    // Calculate delivery fee automatically
    setCalculatingFee(true);
    setDeliveryFee("");
    setCalculatedFee(null);
    
    try {
      // Get full booking data to access address
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('address, guests, package_id')
        .eq('id', order.id)
        .single();
      
      if (bookingError || !booking) {
        throw new Error('Failed to fetch booking details');
      }
      
      // Get caterer's locations from partner_applications
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data: application, error: appError } = await supabase
        .from('partner_applications')
        .select('locations')
        .eq('user_id', user.id)
        .eq('status', 'APPROVED')
        .single();
      
      if (appError || !application) {
        throw new Error('Failed to fetch caterer locations');
      }
      
      // Parse locations
      let catererLocations: Array<{ latitude: number; longitude: number; address?: string }> = [];
      try {
        const locs = typeof application.locations === 'string' 
          ? JSON.parse(application.locations) 
          : application.locations;
        
        if (Array.isArray(locs)) {
          catererLocations = locs.filter((loc: any) => loc.latitude && loc.longitude);
        }
      } catch (e) {
        console.warn('[PartnerOrderDetailsScreen] Error parsing locations:', e);
      }
      
      if (catererLocations.length === 0) {
        throw new Error('No valid caterer locations found. Please add locations in settings.');
      }
      
      // Get customer address from booking
      const customerAddress = booking.address || order.venue;
      if (!customerAddress) {
        throw new Error('Customer address not found in booking');
      }
      
      // Get closest caterer location
      const closestLocation = await getClosestCatererLocation(customerAddress, catererLocations);
      
      if (!closestLocation) {
        throw new Error('Could not determine distance to customer location');
      }
      
      // Calculate delivery fee
      const fee = await calculateDeliveryFeeFromAddresses(
        customerAddress,
        closestLocation.location.latitude,
        closestLocation.location.longitude,
        booking.guests || order.guests
      );
      
      if (fee === null) {
        throw new Error('Failed to calculate delivery fee. Please enter manually.');
      }
      
      setCalculatedFee(fee);
      setDeliveryFee(fee.toString());
      console.log('[PartnerOrderDetailsScreen] Calculated delivery fee:', {
        distance: closestLocation.distance.toFixed(2) + 'km',
        guests: booking.guests || order.guests,
        fee: fee
      });
    } catch (error: any) {
      console.error('[PartnerOrderDetailsScreen] Error calculating delivery fee:', error);
      // Still show modal, but with error message
      if (Platform.OS === 'web') {
        alert(`Could not auto-calculate delivery fee: ${error.message}. Please enter manually.`);
      } else {
        Alert.alert('Auto-calculation Failed', error.message || 'Please enter delivery fee manually.');
      }
      setCalculatedFee(null);
    } finally {
      setCalculatingFee(false);
      setShowDeliveryFeeModal(true);
    }
  }

  async function confirmAcceptWithDeliveryFee() {
    const fee = parseFloat(deliveryFee);
    
    if (isNaN(fee) || fee < 0) {
      if (Platform.OS === 'web') {
        alert('Please enter a valid delivery fee (0 or greater)');
      } else {
        Alert.alert('Invalid Fee', 'Please enter a valid delivery fee (0 or greater)');
      }
      return;
    }

    setShowDeliveryFeeModal(false);
    setUpdating(true);

    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({
          status: 'CONFIRMED',
          delivery_fee: fee,
          delivery_fee_set_by_caterer: true
        })
        .eq('id', order.id)
        .select()
        .single();

      if (error) {
        console.error('[PartnerOrderDetailsScreen] Error accepting booking:', error);
        throw error;
      }

      console.log('[PartnerOrderDetailsScreen] Booking accepted with delivery fee:', data);
      setCurrentStatus('CONFIRMED');
      
      if (Platform.OS === 'web') {
        alert('Booking accepted successfully!');
      } else {
        Alert.alert('Success', 'Booking accepted successfully!');
      }
    } catch (error: any) {
      console.error('[PartnerOrderDetailsScreen] Error:', error);
      if (Platform.OS === 'web') {
        alert(`Error: ${error.message}`);
      } else {
        Alert.alert('Error', error.message || 'Failed to accept booking');
      }
    } finally {
      setUpdating(false);
    }
  }

  async function handleDecline() {
    openReasonModal('decline');
  }

  async function handleOnTheWay() {
    console.log('[PartnerOrderDetailsScreen] handleOnTheWay called');
    
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Mark this order as on the way?');
      if (!confirmed) return;
    } else {
      const confirmed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Mark as On the Way',
          'Mark this order as on the way?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Confirm', onPress: () => resolve(true) }
          ]
        );
      });
      if (!confirmed) return;
    }
    
    // Update status and stay on page
    await updateBookingStatus('ON_THE_WAY', undefined, true);
  }

  async function handleComplete() {
    console.log('[PartnerOrderDetailsScreen] handleComplete called');
    
    // Check if remaining balance has been paid
    if (order.remaining_amount && order.remaining_amount > 0 && !remainingPaid) {
      const errorMessage = 'Cannot mark as completed. The customer must pay the remaining balance first.';
      
      if (Platform.OS === 'web') {
        window.alert(errorMessage);
      } else {
        Alert.alert(
          'Payment Required',
          errorMessage,
          [{ text: 'OK' }]
        );
      }
      return;
    }
    
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Mark this booking as completed?');
      if (confirmed) {
        updateBookingStatus('COMPLETED');
      }
    } else {
      Alert.alert(
        'Mark as Completed',
        'Mark this booking as completed?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Complete',
            onPress: () => updateBookingStatus('COMPLETED')
          }
        ]
      );
    }
  }

  async function handleCancel() {
    openReasonModal('cancel');
  }

  async function handleMarkRemainingPaid() {
    console.log('[PartnerOrderDetailsScreen] handleMarkRemainingPaid called');
    
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Mark remaining amount as paid with cash?');
      if (!confirmed) return;
    } else {
      Alert.alert(
        'Mark Remaining Paid',
        'Confirm that the remaining amount has been paid with cash?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            onPress: async () => {
              await markRemainingPaidWithCash();
            }
          }
        ]
      );
      return; // Exit here for mobile, the alert will handle the call
    }
    
    // For web, continue here
    await markRemainingPaidWithCash();
  }

  async function markRemainingPaidWithCash() {
    setUpdating(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({
          remaining_paid: true,
          remaining_paid_method: 'cash',
          remaining_paid_at: new Date().toISOString()
        })
        .eq('id', order.id)
        .select()
        .single();

      if (error) {
        console.error('[PartnerOrderDetailsScreen] Error marking remaining paid:', error);
        throw error;
      }

      console.log('[PartnerOrderDetailsScreen] Remaining marked as paid:', data);
      setRemainingPaid(true);
      
      if (Platform.OS === 'web') {
        alert('Remaining amount marked as paid with cash!');
      } else {
        Alert.alert('Success', 'Remaining amount marked as paid with cash!');
      }
    } catch (error: any) {
      console.error('[PartnerOrderDetailsScreen] Error:', error);
      if (Platform.OS === 'web') {
        alert(`Error: ${error.message}`);
      } else {
        Alert.alert('Error', error.message || 'Failed to update payment status');
      }
    } finally {
      setUpdating(false);
    }
  }

  function confirmReasonSubmit() {
    if (!reasonText.trim()) {
      Alert.alert('Required', 'Please provide a reason.');
      return;
    }

    const newStatus = modalMode === 'cancel' ? 'CANCELLED' : 'DECLINED';
    updateBookingStatus(newStatus, reasonText.trim());
  }

  const modalTitle =
    modalMode === "cancel"
      ? "Cancel Booking"
      : modalMode === "decline"
      ? "Decline Booking"
      : "";
  const modalPrompt =
    modalMode === "cancel"
      ? "Why are you cancelling this booking?"
      : modalMode === "decline"
      ? "Why are you declining this booking?"
      : "";

  return (
    <View style={styles.screen}>
      {isWeb && <Sidebar />}

      <View style={styles.mainArea}>
        <TopBar title="Order Details" />

        <ScrollView
          style={styles.scrollRegion}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pageTitle}>
                {order.customerName}'s Order
              </Text>
              <Text style={styles.pageSub}>
                Status:{" "}
                <Text
                  style={[
                    styles.statusBadge,
                    currentStatus === "PENDING" && styles.statusBadgePending,
                    currentStatus === "CONFIRMED" && styles.statusBadgeConfirmed,
                    currentStatus === "ON_THE_WAY" && styles.statusBadgeOnTheWay,
                    currentStatus === "COMPLETED" && styles.statusBadgeCompleted,
                    currentStatus === "DECLINED" && styles.statusBadgeDeclined,
                    currentStatus === "CANCELLED" && styles.statusBadgeCancelled
                  ]}
                >
                  {currentStatus === "ON_THE_WAY" ? "ON THE WAY" : currentStatus}
                </Text>
              </Text>
            </View>
          </View>

          {/* Summary card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Summary</Text>

            <View style={styles.rowLine}>
              <Text style={styles.labelText}>Order ID:</Text>
              <Text style={styles.valueText}>{order.bookingId}</Text>
            </View>

            <View style={styles.rowLine}>
              <Text style={styles.labelText}>Customer Name:</Text>
              <Text style={styles.valueText}>{order.customerName}</Text>
            </View>

            <View style={styles.rowLine}>
              <Text style={styles.labelText}>Customer Email:</Text>
              <Text style={styles.valueText}>{order.customerEmail}</Text>
            </View>

            <View style={styles.rowLine}>
              <Text style={styles.labelText}>Event Date:</Text>
              <Text style={styles.valueText}>{order.eventDate}</Text>
            </View>

            <View style={styles.rowLine}>
              <Text style={styles.labelText}>Number of Guests:</Text>
              <Text style={styles.valueText}>{order.guests} guests</Text>
            </View>

            <View style={styles.rowLine}>
              <Text style={styles.labelText}>Venue / Location:</Text>
              <Text style={styles.valueText}>{order.venue}</Text>
            </View>

            {/* Show ON THE WAY status */}
            {currentStatus === 'ON_THE_WAY' && (
              <View style={[styles.rowLine, { backgroundColor: '#fef3c7', padding: 12, borderRadius: 8, marginTop: 8 }]}>
                <Text style={{ color: '#f59e0b', fontWeight: '600', fontSize: 14 }}>
                  🚗 Order is on the way!
                </Text>
              </View>
            )}

            {/* Price Breakdown */}
            <View style={[styles.rowLine, { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb' }]}>
              <Text style={[styles.labelText, { fontWeight: '600', fontSize: 15 }]}>Price Breakdown</Text>
            </View>

            {/* Calculate package subtotal */}
            {(() => {
              let packageSubtotal = 0;
              if (order.packagePrice) {
                const priceMatch = order.packagePrice.match(/(\d+(?:,\d+)*(?:\.\d+)?)/);
                if (priceMatch) {
                  const pricePerHead = parseFloat(priceMatch[1].replace(/,/g, ''));
                  packageSubtotal = pricePerHead * order.guests;
                }
              } else {
                // Try to extract from totalPrice if packagePrice not available
                const totalMatch = order.totalPrice.match(/(\d+(?:,\d+)*(?:\.\d+)?)/);
                if (totalMatch) {
                  const total = parseFloat(totalMatch[1].replace(/,/g, ''));
                  packageSubtotal = total - (order.delivery_fee || 0);
                }
              }
              const deliveryFee = order.delivery_fee || 0;
              const total = packageSubtotal + deliveryFee;

              return (
                <>
                  <View style={[styles.rowLine, { marginTop: 12 }]}>
                    <Text style={[styles.labelText, { fontSize: 14 }]}>Package Subtotal:</Text>
                    <Text style={[styles.valueText, { fontSize: 14 }]}>
                      ₱{packageSubtotal.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.rowLine}>
                    <Text style={[styles.labelText, { fontSize: 14 }]}>Delivery Fee:</Text>
                    <Text style={[styles.valueText, { fontSize: 14, color: deliveryFee > 0 ? '#111827' : '#6b7280' }]}>
                      ₱{deliveryFee.toLocaleString()}
                    </Text>
                  </View>
                  <View style={[styles.rowLine, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' }]}>
                    <Text style={[styles.labelText, { fontWeight: '700', fontSize: 16 }]}>Total Price:</Text>
                    <Text style={[styles.valueText, styles.priceText, { fontWeight: '700', fontSize: 18, color: '#22c55e' }]}>
                      ₱{total.toLocaleString()}
                    </Text>
                  </View>
                </>
              );
            })()}
          </View>

          {/* Payment Information card */}
          {(order.deposit_amount || order.remaining_amount) && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Payment Information</Text>

              {order.deposit_amount && (
                <View style={styles.rowLine}>
                  <Text style={styles.labelText}>Deposit (50%):</Text>
                  <View>
                    <Text style={[styles.valueText, styles.priceText]}>
                      ₱{order.deposit_amount.toLocaleString()}
                    </Text>
                    <Text style={[
                      styles.valueText,
                      { fontSize: 12, marginTop: 2 },
                      depositPaid ? { color: '#22c55e', fontWeight: '600' } : { color: '#f59e0b' }
                    ]}>
                      {depositPaid ? '✓ Paid' : 'Pending'}
                      {order.payment_method && depositPaid && ` (${order.payment_method.toUpperCase()})`}
                    </Text>
                  </View>
                </View>
              )}

              {order.remaining_amount && (
                <View style={styles.rowLine}>
                  <Text style={styles.labelText}>Remaining (50%):</Text>
                  <View>
                    <Text style={[styles.valueText, styles.priceText]}>
                      ₱{order.remaining_amount.toLocaleString()}
                    </Text>
                    <Text style={[
                      styles.valueText,
                      { fontSize: 12, marginTop: 2 },
                      remainingPaid ? { color: '#22c55e', fontWeight: '600' } : { color: '#f59e0b' }
                    ]}>
                      {remainingPaid ? `✓ Paid (${order.remaining_paid_method || 'cash'})` : 'Pending'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Mark Remaining Paid Button */}
              {depositPaid && !remainingPaid && currentStatus === 'CONFIRMED' && (
                <TouchableOpacity
                  style={styles.markPaidButton}
                  onPress={handleMarkRemainingPaid}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.markPaidButtonText}>
                      Mark Remaining Paid (Cash)
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Package card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Package Booked</Text>

            {order.packageName && (
              <View style={styles.rowLine}>
                <Text style={styles.labelText}>Package:</Text>
                <Text style={styles.valueText}>{order.packageName}</Text>
              </View>
            )}

            {order.packagePrice && (() => {
              // Extract numeric price from packagePrice string (e.g., "₱12,500" or "250")
              const priceMatch = order.packagePrice.match(/(\d+(?:,\d+)*(?:\.\d+)?)/);
              const numericPrice = priceMatch ? priceMatch[1].replace(/,/g, '') : order.packagePrice;
              return (
                <View style={styles.rowLine}>
                  <Text style={styles.labelText}>Package Price:</Text>
                  <Text style={styles.valueText}>{numericPrice}</Text>
                </View>
              );
            })()}

            <Text style={[styles.subHeader, { marginTop: 12 }]}>
              Selected Dishes
            </Text>

            {isWeb ? (
              <View style={styles.tableWrapper}>
                <View style={[styles.tableRow, styles.tableHeaderRow]}>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.tableHeaderCell,
                      { flex: 2 }
                    ]}
                  >
                    Category
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.tableHeaderCell,
                      { flex: 3 }
                    ]}
                  >
                    Chosen Dish
                  </Text>
                </View>

                {order.selectedDishes.map((dishChoice, idx) => (
                  <View
                    key={
                      idx +
                      dishChoice.sectionLabel +
                      dishChoice.chosenDish
                    }
                    style={[
                      styles.tableRow,
                      idx === order.selectedDishes.length - 1
                        ? styles.tableLastRow
                        : styles.tableBodyRow
                    ]}
                  >
                    <Text style={[styles.tableCell, { flex: 2 }]}>
                      {dishChoice.sectionLabel}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 3 }]}>
                      {dishChoice.chosenDish}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.mobileDishList}>
                {order.selectedDishes.map((dishChoice, idx) => (
                  <View key={idx + dishChoice.sectionLabel + dishChoice.chosenDish} style={styles.mobileDishItem}>
                    <Text style={styles.mobileDishCategory}>{dishChoice.sectionLabel}</Text>
                    <Text style={styles.mobileDishName}>{dishChoice.chosenDish}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Inclusions card (READ-ONLY NOW) */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Inclusions / Add-ons</Text>

            {order.inclusions.length === 0 ? (
              <Text style={styles.mutedText}>
                No special inclusions requested.
              </Text>
            ) : (
              <View style={styles.inclusionList}>
                {order.inclusions.map((item, idx) => (
                  <View key={idx} style={styles.inclusionPill}>
                    <Text style={styles.inclusionPillText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Action buttons row */}
          <View style={styles.actionRow}>
            {currentStatus === "PENDING" && (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.confirmBtn]}
                  onPress={handleAccept}
                  disabled={updating}
                  activeOpacity={0.7}
                >
                  {updating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.actionBtnText}>Accept</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.declineBtn]}
                  onPress={handleDecline}
                  disabled={updating}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionBtnText}>Decline</Text>
                </TouchableOpacity>
              </>
            )}

            {currentStatus === "CONFIRMED" && (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.onTheWayBtn]}
                  onPress={handleOnTheWay}
                  disabled={updating}
                  activeOpacity={0.7}
                >
                  {updating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.actionBtnText}>Mark as On the Way</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.cancelBtn]}
                  onPress={handleCancel}
                  disabled={updating}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionBtnText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}

            {currentStatus === "ON_THE_WAY" && (
              <>
                {/* Show Mark Remaining Paid button if not paid yet */}
                {depositPaid && !remainingPaid && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.markPaidBtn]}
                    onPress={handleMarkRemainingPaid}
                    disabled={updating}
                    activeOpacity={0.7}
                  >
                    {updating ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.actionBtnText}>Mark Remaining Paid (Cash)</Text>
                    )}
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={[
                    styles.actionBtn, 
                    styles.completeBtn,
                    (order.remaining_amount && order.remaining_amount > 0 && !remainingPaid) && styles.disabledBtn
                  ]}
                  onPress={handleComplete}
                  disabled={updating || (order.remaining_amount && order.remaining_amount > 0 && !remainingPaid)}
                  activeOpacity={0.7}
                >
                  {updating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.actionBtnText}>
                      {order.remaining_amount && order.remaining_amount > 0 && !remainingPaid
                        ? 'Complete (Payment Required)'
                        : 'Mark as Completed'}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {(currentStatus === "COMPLETED" || currentStatus === "DECLINED" || currentStatus === "CANCELLED") && (
              <View style={styles.statusMessageBox}>
                <Text style={styles.statusMessageText}>
                  This order is {currentStatus.toLowerCase()}.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
      {!isWeb && <BottomNav />}

      {/* Cancel / Refund Reason Modal */}
      {showReasonModal && (
        <View style={styles.reasonOverlay}>
          <View style={styles.reasonCard}>
            <Text style={styles.reasonTitle}>{modalTitle}</Text>
            <Text style={styles.reasonPrompt}>{modalPrompt}</Text>

            <TextInput
              style={styles.reasonInput}
              placeholder="Type the reason here..."
              placeholderTextColor="#9ca3af"
              multiline
              value={reasonText}
              onChangeText={setReasonText}
            />

            <View style={styles.reasonBtnRow}>
              <Pressable
                style={[styles.reasonBtn, styles.reasonCancel]}
                onPress={closeReasonModal}
              >
                <Text style={styles.reasonCancelText}>Close</Text>
              </Pressable>

              <TouchableOpacity
                style={[styles.reasonBtn, styles.reasonConfirm]}
                onPress={confirmReasonSubmit}
                disabled={updating}
                activeOpacity={0.7}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.reasonConfirmText}>
                    Submit
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Delivery Fee Modal */}
      {showDeliveryFeeModal && (
        <View style={styles.reasonOverlay}>
          <View style={styles.reasonCard}>
            <Text style={styles.reasonTitle}>Delivery Fee</Text>
            
            {calculatingFee ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <ActivityIndicator size="large" color="#FF8000" />
                <Text style={[styles.reasonPrompt, { marginTop: 12, textAlign: 'center' }]}>
                  Calculating delivery fee based on distance and number of guests...
                </Text>
              </View>
            ) : (
              <>
                {calculatedFee !== null ? (
                  <View style={{ marginBottom: 16, padding: 12, backgroundColor: '#f0fdf4', borderRadius: 8 }}>
                    <Text style={[styles.reasonPrompt, { marginBottom: 8, color: '#166534', fontWeight: '600' }]}>
                      ✓ Auto-calculated Delivery Fee
                    </Text>
                    <Text style={[styles.reasonPrompt, { fontSize: 14, color: '#166534' }]}>
                      Based on distance and {order.guests} guest{order.guests !== 1 ? 's' : ''}
                    </Text>
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#166534', marginTop: 8 }}>
                      ₱{calculatedFee.toLocaleString()}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.reasonPrompt}>
                    Enter the delivery fee for this booking. You can set it to 0 if there's no delivery fee.
                  </Text>
                )}
                
                <TextInput
                  style={styles.reasonInput}
                  placeholder="Enter delivery fee (e.g., 500)"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  value={deliveryFee}
                  onChangeText={setDeliveryFee}
                  editable={!calculatingFee}
                />
              </>
            )}

            <View style={styles.reasonBtnRow}>
              <Pressable
                style={[styles.reasonBtn, styles.reasonCancel]}
                onPress={() => setShowDeliveryFeeModal(false)}
              >
                <Text style={styles.reasonCancelText}>Cancel</Text>
              </Pressable>

              <TouchableOpacity
                style={[styles.reasonBtn, styles.reasonConfirm, (updating || calculatingFee) && { opacity: 0.5 }]}
                onPress={confirmAcceptWithDeliveryFee}
                disabled={updating || calculatingFee}
                activeOpacity={0.7}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.reasonConfirmText}>
                    Accept Booking
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

/* STYLES */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    flexDirection: Platform.OS === 'web' ? "row" : "column",
    backgroundColor: "#f9fafb"
  },
  mainArea: {
    flex: 1,
    backgroundColor: "#f9fafb"
  },
  scrollRegion: {
    flex: 1
  },
  scrollContent: {
    padding: Platform.OS === 'web' ? 16 : 12,
    paddingBottom: Platform.OS === 'web' ? 80 : 100
  },

  headerRow: {
    flexDirection: "column",
    alignItems: "flex-start",
    marginBottom: 16
  },

  pageTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827"
  },
  pageSub: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4
  },
  statusBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontWeight: "600",
    fontSize: 12,
    overflow: "hidden"
  },
  statusBadgePending: {
    backgroundColor: "#DBEAFE",
    color: "#1D4ED8"
  },
  statusBadgeConfirmed: {
    backgroundColor: "#D1FAE5",
    color: "#065F46"
  },
  statusBadgeOnTheWay: {
    backgroundColor: "#FEF3C7",
    color: "#92400E"
  },
  statusBadgeCompleted: {
    backgroundColor: "#E5E7EB",
    color: "#374151"
  },
  statusBadgeDeclined: {
    backgroundColor: "#FEE2E2",
    color: "#991B1B"
  },
  statusBadgeCancelled: {
    backgroundColor: "#FEE2E2",
    color: "#991B1B"
  },

  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: Platform.OS === 'web' ? 8 : 12,
    padding: Platform.OS === 'web' ? 16 : 12,
    marginBottom: Platform.OS === 'web' ? 24 : 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: Platform.OS === 'web' ? 10 : 2 },
    shadowOpacity: 0.05,
    shadowRadius: Platform.OS === 'web' ? 20 : 4,
    elevation: 2
  },
  cardTitle: {
    fontSize: Platform.OS === 'web' ? 16 : 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: Platform.OS === 'web' ? 12 : 14
  },

  rowLine: {
    marginBottom: Platform.OS === 'web' ? 10 : 12,
    flexDirection: Platform.OS === 'web' ? "row" : "column",
    alignItems: Platform.OS === 'web' ? "center" : "flex-start"
  },
  labelText: {
    fontSize: Platform.OS === 'web' ? 12 : 13,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: Platform.OS === 'web' ? 2 : 4,
    width: Platform.OS === 'web' ? 'auto' : '100%'
  },
  valueText: {
    fontSize: Platform.OS === 'web' ? 14 : 15,
    color: "#111827",
    fontWeight: "500",
    marginTop: Platform.OS === 'web' ? 0 : 2
  },
  priceText: {
    color: "#10b981",
    fontWeight: "700"
  },

  subHeader: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8
  },

  tableWrapper: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#fff"
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  tableHeaderRow: {
    backgroundColor: "#f9fafb",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb"
  },
  tableHeaderCell: {
    fontSize: 12,
    color: "#4b5563",
    fontWeight: "700"
  },
  tableBodyRow: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb"
  },
  tableLastRow: {
    borderBottomWidth: 0
  },
  tableCell: {
    paddingRight: 8,
    fontSize: 13,
    color: "#111827",
    fontWeight: "500"
  },

  mutedText: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18
  },

  inclusionList: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  inclusionPill: {
    backgroundColor: "#F3E8FF",
    borderColor: "#9333ea",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8
  },
  inclusionPillText: {
    color: "#6B21A8",
    fontWeight: "600",
    fontSize: 12
  },

  actionRow: {
    flexDirection: Platform.OS === 'web' ? "row" : "column",
    flexWrap: Platform.OS === 'web' ? "wrap" : "nowrap",
    gap: Platform.OS === 'web' ? 12 : 10,
    marginBottom: Platform.OS === 'web' ? 40 : 20
  },
  actionBtn: {
    borderRadius: Platform.OS === 'web' ? 8 : 10,
    paddingVertical: Platform.OS === 'web' ? 12 : 14,
    paddingHorizontal: Platform.OS === 'web' ? 14 : 16,
    minWidth: Platform.OS === 'web' ? 150 : undefined,
    width: Platform.OS === 'web' ? 'auto' : '100%',
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: Platform.OS === 'web' ? 8 : 2 },
    shadowOpacity: 0.08,
    shadowRadius: Platform.OS === 'web' ? 12 : 4,
    elevation: 2
  },
  confirmBtn: {
    backgroundColor: "#FF8000"
  },
  completeBtn: {
    backgroundColor: "#10b981"
  },
  disabledBtn: {
    backgroundColor: "#9ca3af",
    opacity: 0.6
  },
  markPaidBtn: {
    backgroundColor: "#22c55e"
  },
  onTheWayBtn: {
    backgroundColor: "#f59e0b"
  },
  declineBtn: {
    backgroundColor: "#ef4444"
  },
  cancelBtn: {
    backgroundColor: "#ef4444"
  },
  statusMessageBox: {
    backgroundColor: "#f3f4f6",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    width: "100%"
  },
  statusMessageText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center"
  },
  actionBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14
  },

  /* cancel / refund modal */
  reasonOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(17,24,39,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16
  },
  reasonCard: {
    width: "100%",
    maxWidth: Platform.OS === 'web' ? 400 : '90%',
    backgroundColor: "#fff",
    borderRadius: Platform.OS === 'web' ? 12 : 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: Platform.OS === 'web' ? 20 : 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: Platform.OS === 'web' ? 20 : 4 },
    shadowOpacity: 0.2,
    shadowRadius: Platform.OS === 'web' ? 30 : 8,
    elevation: 6
  },
  reasonTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827"
  },
  reasonPrompt: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 12
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    minHeight: 100,
    textAlignVertical: "top",
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#111827"
  },
  reasonBtnRow: {
    flexDirection: Platform.OS === 'web' ? "row" : "column",
    justifyContent: Platform.OS === 'web' ? "flex-end" : "flex-start",
    flexWrap: Platform.OS === 'web' ? "wrap" : "nowrap",
    marginTop: Platform.OS === 'web' ? 20 : 16,
    gap: Platform.OS === 'web' ? 0 : 10
  },
  reasonBtn: {
    borderRadius: Platform.OS === 'web' ? 8 : 10,
    paddingVertical: Platform.OS === 'web' ? 10 : 12,
    paddingHorizontal: Platform.OS === 'web' ? 14 : 16,
    minWidth: Platform.OS === 'web' ? 100 : undefined,
    width: Platform.OS === 'web' ? 'auto' : '100%',
    alignItems: "center",
    marginLeft: Platform.OS === 'web' ? 8 : 0
  },
  reasonCancel: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db"
  },
  reasonCancelText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 14
  },
  reasonConfirm: {
    backgroundColor: "#FF8000",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 3
  },
  reasonConfirmText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14
  },
  // Mobile dish list styles
  mobileDishList: {
    gap: 10
  },
  mobileDishItem: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8
  },
  mobileDishCategory: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 4,
    textTransform: "uppercase"
  },
  mobileDishName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827"
  },
  markPaidButton: {
    backgroundColor: "#22c55e",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  markPaidButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600"
  }
});

