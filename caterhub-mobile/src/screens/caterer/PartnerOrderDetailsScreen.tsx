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
  ActivityIndicator
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PartnerStackParamList } from "../../navigation/caterer/PartnerNav";
import { supabase } from "../../services/supabase";

import Sidebar from "../../components/caterer/Sidebar";
import TopBar from "../../components/caterer/TopBar";

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
    status: "PENDING" | "CONFIRMED" | "DECLINED" | "COMPLETED" | "CANCELLED";
    eventDate: string;
    guests: number;
    totalPrice: string;
    notes?: string;
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
  
  // ----- MODAL STATE (cancel / decline w/ reason) -----
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [modalMode, setModalMode] = useState<"cancel" | "decline" | null>(
    null
  );
  const [reasonText, setReasonText] = useState("");

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

  const updateBookingStatus = async (newStatus: string, reason?: string) => {
    setUpdating(true);
    try {
      const updateData: any = { status: newStatus };
      
      // Add reason to notes if provided
      if (reason) {
        const { data: booking } = await supabase
          .from('bookings')
          .select('notes')
          .eq('id', order.id)
          .single();
        
        let notesData: any = {};
        try {
          notesData = booking?.notes ? JSON.parse(booking.notes) : {};
        } catch (e) {
          notesData = { extra: booking?.notes || '' };
        }
        
        notesData.statusReason = reason;
        notesData.statusReasonDate = new Date().toISOString();
        updateData.notes = JSON.stringify(notesData);
      }

      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', order.id);

      if (error) throw error;

      setCurrentStatus(newStatus as any);
      closeReasonModal();
      
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
    } catch (error: any) {
      console.error('Error updating booking status:', error);
      Alert.alert('Error', error?.message || 'Failed to update booking status');
    } finally {
      setUpdating(false);
    }
  };

  async function handleAccept() {
    Alert.alert(
      'Confirm Booking',
      'Are you sure you want to accept this booking?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: () => updateBookingStatus('CONFIRMED')
        }
      ]
    );
  }

  async function handleDecline() {
    openReasonModal('decline');
  }

  async function handleComplete() {
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

  async function handleCancel() {
    openReasonModal('cancel');
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
      <Sidebar />

      <View style={styles.mainArea}>
        <TopBar title="Order Details" />

        <ScrollView
          style={styles.scrollRegion}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Back + header */}
          <View style={styles.headerRow}>
            <Pressable
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backBtnText}>← Back</Text>
            </Pressable>

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
                    currentStatus === "COMPLETED" && styles.statusBadgeCompleted,
                    currentStatus === "DECLINED" && styles.statusBadgeDeclined,
                    currentStatus === "CANCELLED" && styles.statusBadgeCancelled
                  ]}
                >
                  {currentStatus}
                </Text>
              </Text>
            </View>
          </View>

          {/* Summary card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Summary</Text>

            <View style={styles.rowLine}>
              <Text style={styles.labelText}>Order ID</Text>
              <Text style={styles.valueText}>{order.bookingId}</Text>
            </View>

            <View style={styles.rowLine}>
              <Text style={styles.labelText}>Customer</Text>
              <Text style={styles.valueText}>{order.customerName}</Text>
              <Text style={[styles.valueText, { fontSize: 12, color: '#6b7280' }]}>
                {order.customerEmail}
              </Text>
            </View>

            <View style={styles.rowLine}>
              <Text style={styles.labelText}>Event Date</Text>
              <Text style={styles.valueText}>{order.eventDate}</Text>
            </View>

            <View style={styles.rowLine}>
              <Text style={styles.labelText}>Number of Guests</Text>
              <Text style={styles.valueText}>{order.guests} guests</Text>
            </View>

            <View style={styles.rowLine}>
              <Text style={styles.labelText}>Venue / Location</Text>
              <Text style={styles.valueText}>{order.venue}</Text>
            </View>

            <View style={styles.rowLine}>
              <Text style={styles.labelText}>Total Price</Text>
              <Text style={[styles.valueText, styles.priceText]}>
                {order.totalPrice}
              </Text>
            </View>
          </View>

          {/* Package card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Package Booked</Text>

            <View style={styles.rowLine}>
              <Text style={styles.labelText}>Service</Text>
              <Text style={styles.valueText}>{order.serviceName}</Text>
            </View>

            {order.packageName && (
              <View style={styles.rowLine}>
                <Text style={styles.labelText}>Package</Text>
                <Text style={styles.valueText}>{order.packageName}</Text>
              </View>
            )}

            <Text style={[styles.subHeader, { marginTop: 12 }]}>
              Selected Dishes
            </Text>

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
                  style={[styles.actionBtn, styles.completeBtn]}
                  onPress={handleComplete}
                  disabled={updating}
                  activeOpacity={0.7}
                >
                  {updating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.actionBtnText}>Mark as Completed</Text>
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
    </View>
  );
}

/* STYLES */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    flexDirection: "row",
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
    padding: 16,
    paddingBottom: 80
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16
  },
  backBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginRight: 12
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151"
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
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12
  },

  rowLine: {
    marginBottom: 10
  },
  labelText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 2
  },
  valueText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500"
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
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 40
  },
  actionBtn: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minWidth: 150,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2
  },
  confirmBtn: {
    backgroundColor: "#9333ea"
  },
  completeBtn: {
    backgroundColor: "#10b981"
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
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
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
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    marginTop: 20
  },
  reasonBtn: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 100,
    alignItems: "center",
    marginLeft: 8
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
    backgroundColor: "#9333ea",
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
  }
});

