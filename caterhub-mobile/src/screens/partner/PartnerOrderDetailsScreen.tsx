import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PartnerStackParamList } from "../../navigation/partner/PartnerNav";

import Sidebar from "../../components/partner/Sidebar";
import TopBar from "../../components/partner/TopBar";

type OrderDetailsRouteParams = {
  order: {
    id: string;
    customerName: string;
    packageName: string;
    packagePrice: string;
    selectedDishes: Array<{
      sectionLabel: string;
      chosenDish: string;
    }>;
    venue: string;
    inclusions: string[]; // read-only display only
    status: string;
    eventDate: string;
    totalPrice: string;
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

  // ----- MODAL STATE (cancel / refund w/ reason) -----
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [modalMode, setModalMode] = useState<"cancel" | "refund" | null>(
    null
  );
  const [reasonText, setReasonText] = useState("");

  function openReasonModal(mode: "cancel" | "refund") {
    setModalMode(mode);
    setReasonText("");
    setShowReasonModal(true);
  }

  function closeReasonModal() {
    setShowReasonModal(false);
    setModalMode(null);
    setReasonText("");
  }

  function confirmReasonSubmit() {
    // TODO: connect this to backend later (order.id, modalMode, reasonText)
    closeReasonModal();
  }

  const modalTitle =
    modalMode === "cancel"
      ? "Cancel Booking"
      : modalMode === "refund"
      ? "Refund Booking"
      : "";
  const modalPrompt =
    modalMode === "cancel"
      ? "Why are you cancelling this booking?"
      : modalMode === "refund"
      ? "Why are you issuing a refund?"
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
                <Text style={styles.statusBadge}>{order.status}</Text>
              </Text>
            </View>
          </View>

          {/* Summary card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Summary</Text>

            <View style={styles.rowLine}>
              <Text style={styles.labelText}>Order ID</Text>
              <Text style={styles.valueText}>{order.id}</Text>
            </View>

            <View style={styles.rowLine}>
              <Text style={styles.labelText}>Event Date</Text>
              <Text style={styles.valueText}>{order.eventDate}</Text>
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
              <Text style={styles.labelText}>Package Name</Text>
              <Text style={styles.valueText}>{order.packageName}</Text>
            </View>

            <View style={styles.rowLine}>
              <Text style={styles.labelText}>Base Price</Text>
              <Text style={[styles.valueText, styles.priceText]}>
                {order.packagePrice}
              </Text>
            </View>

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
            <Pressable style={[styles.actionBtn, styles.confirmBtn]}>
              <Text style={styles.actionBtnText}>Confirm Booking</Text>
            </Pressable>

            <Pressable style={[styles.actionBtn, styles.completeBtn]}>
              <Text style={styles.actionBtnText}>Mark as Done</Text>
            </Pressable>

            <Pressable
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={() => openReasonModal("cancel")}
            >
              <Text style={styles.actionBtnText}>Cancel Booking</Text>
            </Pressable>

            <Pressable
              style={[styles.actionBtn, styles.refundBtn]}
              onPress={() => openReasonModal("refund")}
            >
              <Text style={styles.actionBtnText}>Refund</Text>
            </Pressable>
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

              <Pressable
                style={[styles.reasonBtn, styles.reasonConfirm]}
                onPress={confirmReasonSubmit}
              >
                <Text style={styles.reasonConfirmText}>
                  Submit Reason
                </Text>
              </Pressable>
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
    backgroundColor: "#DBEAFE",
    color: "#1D4ED8",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontWeight: "600",
    fontSize: 12
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
  cancelBtn: {
    backgroundColor: "#ef4444"
  },
  refundBtn: {
    backgroundColor: "#6b7280"
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

