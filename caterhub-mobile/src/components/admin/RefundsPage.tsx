import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, RefreshControl, TextInput } from 'react-native';
import { supabase } from '../../services/supabase';

interface Refund {
  id: number;
  booking_id: number;
  amount: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED';
  requested_at: string;
  processed_at: string | null;
  booking?: {
    id: number;
    users?: {
      username: string;
      email: string;
    };
    services?: {
      name: string;
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

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'All' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRefunds = async () => {
    try {
      // Since we don't have a refunds table yet, we'll simulate with cancelled bookings
      // Services table no longer exists - fetch bookings with packages and users only
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
        .in('status', ['CANCELLED', 'DECLINED'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching refunds:', error);
        Alert.alert('Error', 'Failed to load refunds');
        return;
      }

        // Transform cancelled bookings into refund records
      const transformedRefunds: Refund[] = (bookings || []).map((booking: any) => {
        let amount = 0;
        if (booking.packages?.price) {
          const priceMatch = booking.packages.price.match(/(\d+(?:,\d+)*(?:\.\d+)?)/);
          if (priceMatch) {
            amount = parseFloat(priceMatch[1].replace(/,/g, ''));
          }
        } else {
          // Fallback: use deposit_amount + remaining_amount if available
          amount = (booking.deposit_amount || 0) + (booking.remaining_amount || 0);
        }

        // Simulate refund status based on booking status
        let refundStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED' = 'PENDING';
        if (booking.status === 'CANCELLED') {
          // Random status for demo
          const statuses: Array<'PENDING' | 'APPROVED' | 'PROCESSED'> = ['PENDING', 'APPROVED', 'PROCESSED'];
          refundStatus = statuses[Math.floor(Math.random() * statuses.length)];
        } else if (booking.status === 'DECLINED') {
          refundStatus = 'REJECTED';
        }

        return {
          id: booking.id,
          booking_id: booking.id,
          amount,
          reason: booking.notes || 'Customer requested cancellation',
          status: refundStatus,
          requested_at: booking.updated_at,
          processed_at: refundStatus === 'PROCESSED' ? booking.updated_at : null,
          booking: {
            id: booking.id,
            users: booking.users,
            services: undefined, // Services table no longer exists
          },
        };
      });

      setRefunds(transformedRefunds);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to load refunds');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRefunds();
  };

  const updateRefundStatus = async (refundId: number, newStatus: 'APPROVED' | 'REJECTED' | 'PROCESSED') => {
    try {
      // In a real app, you'd update the refunds table
      // For now, we'll just show a success message
      Alert.alert('Success', `Refund ${newStatus.toLowerCase()} successfully`);
      fetchRefunds();
    } catch (error: any) {
      console.error('Error updating refund:', error);
      Alert.alert('Error', error?.message || 'Failed to update refund');
    }
  };

  const filteredRefunds = refunds.filter((refund) => {
    const matchesStatus = filter === 'All' || refund.status === filter;
    const matchesSearch = !searchQuery.trim()
      ? true
      : refund.booking?.users?.username.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        refund.booking?.users?.email.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PROCESSED': return COLORS.success;
      case 'APPROVED': return COLORS.info;
      case 'REJECTED': return COLORS.danger;
      case 'PENDING': return COLORS.warning;
      default: return COLORS.textLight;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'PROCESSED': return COLORS.success + '15';
      case 'APPROVED': return COLORS.info + '15';
      case 'REJECTED': return COLORS.danger + '15';
      case 'PENDING': return COLORS.warning + '15';
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
        <Text style={styles.loadingText}>Loading refunds...</Text>
      </View>
    );
  }

  const pendingRefunds = refunds.filter(r => r.status === 'PENDING');
  const approvedRefunds = refunds.filter(r => r.status === 'APPROVED');
  const processedRefunds = refunds.filter(r => r.status === 'PROCESSED');
  const rejectedRefunds = refunds.filter(r => r.status === 'REJECTED');
  const totalRefundAmount = processedRefunds.reduce((sum, r) => sum + r.amount, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>Refunds Management</Text>
      
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Pending Refunds</Text>
          <Text style={[styles.statValue, { color: COLORS.warning }]}>{pendingRefunds.length}</Text>
          <Text style={styles.statSubtext}>Awaiting review</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Approved</Text>
          <Text style={[styles.statValue, { color: COLORS.info }]}>{approvedRefunds.length}</Text>
          <Text style={styles.statSubtext}>Ready to process</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Processed</Text>
          <Text style={[styles.statValue, { color: COLORS.success }]}>{processedRefunds.length}</Text>
          <Text style={styles.statSubtext}>₱{totalRefundAmount.toLocaleString()} refunded</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Rejected</Text>
          <Text style={[styles.statValue, { color: COLORS.danger }]}>{rejectedRefunds.length}</Text>
          <Text style={styles.statSubtext}>Declined requests</Text>
        </View>
      </View>

      <View style={styles.toolbar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by customer or service"
          placeholderTextColor={COLORS.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <View style={styles.filterGroup}>
          {(['All', 'PENDING', 'APPROVED', 'PROCESSED', 'REJECTED'] as const).map((filterOption) => (
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
            <Text style={[styles.headerCell, styles.colCustomer]}>Customer</Text>
            <Text style={[styles.headerCell, styles.colService]}>Service</Text>
            <Text style={[styles.headerCell, styles.colAmount]}>Amount</Text>
            <Text style={[styles.headerCell, styles.colReason]}>Reason</Text>
            <Text style={[styles.headerCell, styles.colStatus]}>Status</Text>
            <Text style={[styles.headerCell, styles.colDate]}>Requested</Text>
            <Text style={[styles.headerCell, styles.colActions]}>Actions</Text>
          </View>

          {filteredRefunds.length === 0 ? (
            <View style={styles.emptyStateRow}>
              <Text style={styles.emptyStateText}>
                {searchQuery.trim()
                  ? 'No matches found'
                  : filter === 'All'
                    ? 'No refund requests found'
                    : `No ${filter.toLowerCase()} refunds`}
              </Text>
            </View>
          ) : (
            filteredRefunds.map((refund) => (
              <View key={refund.id} style={styles.tableRow}>
                <Text style={[styles.cellText, styles.colId]}>#{refund.id}</Text>
                <View style={[styles.cell, styles.colCustomer]}>
                  <Text style={styles.cellTextBold} numberOfLines={1}>
                    {refund.booking?.users?.username || 'Unknown'}
                  </Text>
                  <Text style={styles.cellTextSmall} numberOfLines={1}>
                    {refund.booking?.users?.email || 'N/A'}
                  </Text>
                </View>
                <Text style={[styles.cellText, styles.colService]} numberOfLines={1}>
                  {refund.booking?.packages?.name || 'N/A'}
                </Text>
                <Text style={[styles.cellText, styles.colAmount, styles.amountText]}>
                  ₱{refund.amount.toLocaleString()}
                </Text>
                <Text style={[styles.cellText, styles.colReason]} numberOfLines={2}>
                  {refund.reason}
                </Text>
                <View style={[styles.cell, styles.colStatus]}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusBg(refund.status) }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(refund.status) }]}>
                      {refund.status}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.cellText, styles.colDate]} numberOfLines={2}>
                  {formatDate(refund.requested_at)}
                </Text>
                <View style={[styles.cell, styles.colActions]}>
                  {refund.status === 'PENDING' && (
                    <View style={styles.actionButtons}>
                      <Pressable
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={() => updateRefundStatus(refund.id, 'APPROVED')}
                      >
                        <Text style={styles.actionButtonText}>✓</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => updateRefundStatus(refund.id, 'REJECTED')}
                      >
                        <Text style={styles.actionButtonText}>✕</Text>
                      </Pressable>
                    </View>
                  )}
                  {refund.status === 'APPROVED' && (
                    <Pressable
                      style={[styles.actionButton, styles.processButton]}
                      onPress={() => updateRefundStatus(refund.id, 'PROCESSED')}
                    >
                      <Text style={styles.actionButtonText}>Process</Text>
                    </Pressable>
                  )}
                </View>
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
    minWidth: 150,
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
    color: COLORS.danger,
  },
  colId: { width: 70 },
  colCustomer: { flex: 1.5, minWidth: 130 },
  colService: { flex: 1.2, minWidth: 120 },
  colAmount: { width: 100, textAlign: 'right' },
  colReason: { flex: 1.5, minWidth: 150 },
  colStatus: { width: 110 },
  colDate: { flex: 1, minWidth: 120 },
  colActions: { width: 120 },
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
  actionButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
  },
  approveButton: {
    backgroundColor: COLORS.success,
  },
  rejectButton: {
    backgroundColor: COLORS.danger,
  },
  processButton: {
    backgroundColor: COLORS.info,
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 12,
  },
});
