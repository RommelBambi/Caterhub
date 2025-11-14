import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, RefreshControl, TextInput } from 'react-native';
import { supabase } from '../../services/supabase';

interface Payment {
  id: number;
  booking_id: number;
  amount: number;
  payment_method: string;
  payment_status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  transaction_id: string | null;
  created_at: string;
  booking?: {
    id: number;
    users?: {
      username: string;
      email: string;
    };
    packages?: {
      name: string;
      price: string;
    };
  };
}

const COLORS = {
  primary: "#FF8000",
  text: "#1e293b",
  textLight: "#64748b",
  bg: "#f8fafc",
  white: "#ffffff",
  border: "#e2e8f0",
  hover: "#f1f5f9",
  success: "#22c55e",
  danger: "#dc2626",
  info: "#0ea5e9",
  warning: "#f59e0b",
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'All' | 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPayments = async () => {
    try {
      // Fetch bookings with payment data from Xendit integration
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          *,
          users:user_id (
            id,
            username,
            email
          ),
          packages:package_id (
            id,
            name,
            price
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching payments:', error);
        Alert.alert('Error', error?.message || 'Failed to load payments. Please check your connection and try again.');
        setPayments([]);
        return;
      }

      console.log(`Found ${bookings?.length || 0} bookings to process for payments`);

      // Transform bookings into payment records with real Xendit data
      const transformedPayments: Payment[] = (bookings || []).map((booking: any) => {
        let amount = 0;
        if (booking.packages?.price) {
          const priceMatch = booking.packages.price.match(/(\d+(?:,\d+)*(?:\.\d+)?)/);
          if (priceMatch) {
            amount = parseFloat(priceMatch[1].replace(/,/g, ''));
          }
        } else {
          // If no package, calculate based on a default rate or use 0
          // You may want to add a default price logic here
          amount = 0;
        }

        // Use actual payment_status from database (set by Xendit integration)
        let paymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' = 
          booking.payment_status || 'PENDING';

        // Get payment method from database (gcash, grab_pay, cash, etc.)
        const paymentMethod = booking.payment_method 
          ? booking.payment_method.toUpperCase() 
          : 'Cash';

        // Use actual transaction_id or payment_intent_id
        const transactionId = booking.transaction_id 
          || booking.payment_intent_id 
          || `TXN-${booking.id}`;

        return {
          id: booking.id,
          booking_id: booking.id,
          amount,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          transaction_id: transactionId,
          created_at: booking.paid_at || booking.created_at,
          booking: {
            id: booking.id,
            users: booking.users,
            packages: booking.packages,
          },
        };
      });

      setPayments(transformedPayments);
      console.log(`Processed ${transformedPayments.length} payment records`);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to load payments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayments();
  };

  const filteredPayments = payments.filter((payment) => {
    const matchesStatus = filter === 'All' || payment.payment_status === filter;
    const matchesSearch = !searchQuery.trim()
      ? true
      : payment.booking?.users?.username.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        payment.transaction_id?.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return COLORS.success;
      case 'FAILED': return COLORS.danger;
      case 'REFUNDED': return COLORS.warning;
      case 'PENDING': return COLORS.info;
      default: return COLORS.textLight;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'COMPLETED': return COLORS.success + '15';
      case 'FAILED': return COLORS.danger + '15';
      case 'REFUNDED': return COLORS.warning + '15';
      case 'PENDING': return COLORS.info + '15';
      default: return COLORS.bg;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading payments...</Text>
      </View>
    );
  }

  const completedPayments = payments.filter(p => p.payment_status === 'COMPLETED');
  const pendingPayments = payments.filter(p => p.payment_status === 'PENDING');
  const failedPayments = payments.filter(p => p.payment_status === 'FAILED');
  const totalRevenue = completedPayments.reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>Payments & Transactions</Text>
      
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Revenue</Text>
          <Text style={[styles.statValue, { color: COLORS.success }]}>₱{totalRevenue.toLocaleString()}</Text>
          <Text style={styles.statSubtext}>{completedPayments.length} completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Pending</Text>
          <Text style={[styles.statValue, { color: COLORS.info }]}>₱{pendingAmount.toLocaleString()}</Text>
          <Text style={styles.statSubtext}>{pendingPayments.length} transactions</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Failed</Text>
          <Text style={[styles.statValue, { color: COLORS.danger }]}>{failedPayments.length}</Text>
          <Text style={styles.statSubtext}>transactions</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Transactions</Text>
          <Text style={[styles.statValue, { color: COLORS.text }]}>{payments.length}</Text>
        </View>
      </View>

      <View style={styles.toolbar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by customer or transaction ID"
          placeholderTextColor={COLORS.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <View style={styles.filterGroup}>
          {(['All', 'PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'] as const).map((filterOption) => (
            <Pressable
              key={filterOption}
              style={[
                styles.filterButton,
                filter === filterOption && styles.filterButtonActive,
              ]}
              onPress={() => setFilter(filterOption)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filter === filterOption && styles.filterButtonTextActive,
                ]}
              >
                {filterOption}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.tableWrapper}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.colId]}>ID</Text>
            <Text style={[styles.headerCell, styles.colTxn]}>Transaction ID</Text>
            <Text style={[styles.headerCell, styles.colCustomer]}>Customer</Text>
            <Text style={[styles.headerCell, styles.colService]}>Service</Text>
            <Text style={[styles.headerCell, styles.colAmount]}>Amount</Text>
            <Text style={[styles.headerCell, styles.colMethod]}>Method</Text>
            <Text style={[styles.headerCell, styles.colStatus]}>Status</Text>
            <Text style={[styles.headerCell, styles.colDate]}>Date</Text>
          </View>

          {filteredPayments.length === 0 ? (
            <View style={styles.emptyStateRow}>
              <Text style={styles.emptyStateText}>
                {searchQuery.trim()
                  ? 'No matches found'
                  : filter === 'All'
                    ? 'No payments found'
                    : `No ${filter.toLowerCase()} payments`}
              </Text>
            </View>
          ) : (
            filteredPayments.map((payment) => (
              <View key={payment.id} style={styles.tableRow}>
                <Text style={[styles.cellText, styles.colId]}>#{payment.id}</Text>
                <Text style={[styles.cellText, styles.colTxn]} numberOfLines={1}>
                  {payment.transaction_id || 'N/A'}
                </Text>
                <View style={[styles.cell, styles.colCustomer]}>
                  <Text style={styles.cellTextBold} numberOfLines={1}>
                    {payment.booking?.users?.username || 'Unknown'}
                  </Text>
                  <Text style={styles.cellTextSmall} numberOfLines={1}>
                    {payment.booking?.users?.email || 'N/A'}
                  </Text>
                </View>
                <Text style={[styles.cellText, styles.colService]} numberOfLines={1}>
                  {payment.booking?.packages?.name || 'N/A'}
                </Text>
                <Text style={[styles.cellText, styles.colAmount, styles.amountText]}>
                  ₱{payment.amount.toLocaleString()}
                </Text>
                <Text style={[styles.cellText, styles.colMethod]}>{payment.payment_method}</Text>
                <View style={[styles.cell, styles.colStatus]}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusBg(payment.payment_status) }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(payment.payment_status) }]}>
                      {payment.payment_status}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.cellText, styles.colDate]} numberOfLines={2}>
                  {formatDate(payment.created_at)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 24,
    color: COLORS.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.textLight,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  searchInput: {
    flexGrow: 1,
    minWidth: 200,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  filterGroup: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
  },
  filterButtonTextActive: {
    color: COLORS.white,
  },
  tableWrapper: {
    flex: 1,
  },
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.hover,
  },
  headerCell: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontWeight: '700',
    fontSize: 12,
    color: COLORS.text,
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  cell: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  cellText: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    color: COLORS.text,
    fontSize: 13,
  },
  cellTextBold: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  cellTextSmall: {
    color: COLORS.textLight,
    fontSize: 11,
    marginTop: 2,
  },
  amountText: {
    fontWeight: '700',
    color: COLORS.success,
  },
  colId: { width: 70 },
  colTxn: { flex: 1.5, minWidth: 140 },
  colCustomer: { flex: 1.5, minWidth: 140 },
  colService: { flex: 1.2, minWidth: 120 },
  colAmount: { width: 110, textAlign: 'right' },
  colMethod: { width: 90 },
  colStatus: { width: 110 },
  colDate: { flex: 1, minWidth: 120 },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  emptyStateRow: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    color: COLORS.textLight,
    fontSize: 16,
  },
});
