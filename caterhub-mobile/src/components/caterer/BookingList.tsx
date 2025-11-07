import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PartnerStackParamList } from "../../navigation/caterer/PartnerNav";
import { isWeb } from "../../utils/platform";
import { COLORS } from "../../constants/colors";

export type Booking = {
  id: string;
  client: string;
  date: string;
  headcount: number;
  status: "pending" | "accepted" | "declined" | "refunded";
  total: string;
  bookingId?: number; // Database booking ID for navigation
};

type Props = {
  data: Booking[];
  onDetailsPress?: (booking: Booking) => void;
};

export default function BookingList({ data, onDetailsPress }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<PartnerStackParamList>>();

  const handleDetailsPress = (booking: Booking) => {
    if (onDetailsPress) {
      onDetailsPress(booking);
    } else if (booking.bookingId) {
      // Navigate to order details if bookingId is available
      // We'll need to fetch the full order data first
      // For now, just navigate to orders screen
      navigation.navigate("PartnerOrders");
    }
  };

  if (isWeb) {
    // Web: Table layout
    return (
      <View style={styles.tableWrapper}>
        {/* Header row */}
        <View style={[styles.row, styles.headerRow]}>
          <Text style={[styles.cell, styles.headerText, { flex: 2 }]}>
            Booking Ref
          </Text>
          <Text style={[styles.cell, styles.headerText, { flex: 2 }]}>
            Client
          </Text>
          <Text style={[styles.cell, styles.headerText, { flex: 2 }]}>
            Date / Guests
          </Text>
          <Text style={[styles.cell, styles.headerText, { flex: 1 }]}>
            Status
          </Text>
          <Text style={[styles.cell, styles.headerText, { flex: 1 }]}>
            Actions
          </Text>
        </View>

        {data.map((item, index) => (
          <View
            key={item.id}
            style={[
              styles.row,
              index === data.length - 1 ? styles.lastRow : styles.bodyRow
            ]}
          >
            <Text style={[styles.cell, { flex: 2 }]}>
              {item.id}
            </Text>

            <Text style={[styles.cell, { flex: 2 }]}>
              {item.client}
            </Text>

            <Text style={[styles.cell, { flex: 2 }]}>
              {item.date}{"\n"}
              {item.headcount} guests
            </Text>

            <View style={[styles.cell, { flex: 1 }]}>
              <StatusChip status={item.status} />
            </View>

            <View style={[styles.cell, { flex: 1 }]}>
              <Pressable
                style={styles.detailsBtn}
                onPress={() => handleDetailsPress(item)}
              >
                <Text style={styles.detailsText}>Details</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    );
  }

  // Mobile: Card layout
  return (
    <View style={styles.mobileWrapper}>
      {data.map((item, index) => (
        <React.Fragment key={item.id}>
          <View style={styles.mobileCard}>
            <View style={styles.mobileCardHeader}>
              <Text style={styles.mobileBookingId}>{item.id}</Text>
              <StatusChip status={item.status} />
            </View>

            <View style={styles.mobileCardBody}>
              <View style={styles.mobileInfoRow}>
                <Text style={styles.mobileInfoLabel}>Client:</Text>
                <Text style={styles.mobileInfoValue}>{item.client}</Text>
              </View>

              <View style={styles.mobileInfoRow}>
                <Text style={styles.mobileInfoLabel}>Date:</Text>
                <Text style={styles.mobileInfoValue}>{item.date}</Text>
              </View>

              <View style={styles.mobileInfoRow}>
                <Text style={styles.mobileInfoLabel}>Guests:</Text>
                <Text style={styles.mobileInfoValue}>{item.headcount}</Text>
              </View>

              {item.total && item.total !== "₱0" && (
                <View style={styles.mobileInfoRow}>
                  <Text style={styles.mobileInfoLabel}>Total:</Text>
                  <Text style={styles.mobileInfoValue}>{item.total}</Text>
                </View>
              )}
            </View>

            <Pressable
              style={styles.mobileDetailsBtn}
              onPress={() => handleDetailsPress(item)}
            >
              <Text style={styles.mobileDetailsText}>View Details</Text>
            </Pressable>
          </View>
          {index < data.length - 1 && <View style={styles.mobileSeparator} />}
        </React.Fragment>
      ))}
    </View>
  );
}

function StatusChip({ status }: { status: Booking["status"] }) {
  // In screenshot "Pending" is light blue badge
  const stylesMap = {
    pending: {
      bg: "#e0f2fe",
      text: "#0369a1"
    },
    accepted: {
      bg: "#dcfce7",
      text: "#166534"
    },
    declined: {
      bg: "#fee2e2",
      text: "#991b1b"
    },
    refunded: {
      bg: "#ede9fe",
      text: "#4c1d95"
    }
  }[status];

  return (
    <View
      style={[
        badgeStyles.badge,
        { backgroundColor: stylesMap.bg }
      ]}
    >
      <Text
        style={[
          badgeStyles.badgeText,
          { color: stylesMap.text }
        ]}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600"
  }
});

const styles = StyleSheet.create({
  tableWrapper: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#fff"
  },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 12
  },

  headerRow: {
    backgroundColor: "#f9fafb",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb"
  },
  headerText: {
    fontSize: 12,
    color: "#4b5563",
    fontWeight: "700"
  },

  bodyRow: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb"
  },
  lastRow: {
    borderBottomWidth: 0
  },

  cell: {
    paddingRight: 8
  },

  detailsBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2
  },
  detailsText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600"
  },
  // Mobile styles
  mobileWrapper: {
    width: "100%"
  },
  mobileCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  mobileCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6"
  },
  mobileBookingId: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827"
  },
  mobileCardBody: {
    marginBottom: 16
  },
  mobileInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  mobileInfoLabel: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500"
  },
  mobileInfoValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
    flex: 1,
    textAlign: "right"
  },
  mobileDetailsBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  mobileDetailsText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600"
  },
  mobileSeparator: {
    height: 12
  }
});

