import React from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";

export type Booking = {
  id: string;
  client: string;
  date: string;
  headcount: number;
  status: "pending" | "accepted" | "declined" | "refunded";
  total: string;
};

type Props = {
  data: Booking[];
};

export default function BookingList({ data }: Props) {
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

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View
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
                onPress={() => {
                  // hook this up later (open booking details)
                }}
              >
                <Text style={styles.detailsText}>Details</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
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
    backgroundColor: "#9333ea",
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
  }
});

