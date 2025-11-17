import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Sidebar from "../../components/caterer/Sidebar";
import TopBar from "../../components/caterer/TopBar";
import BottomNav from "../../components/caterer/BottomNav";
import WithdrawalMethodModal from "../../components/caterer/WithdrawalMethodModal";
import WithdrawalDetailsModal from "../../components/caterer/WithdrawalDetailsModal";
import { PartnerStackParamList } from "../../navigation/caterer/PartnerNav";
import { useAuth } from "../../store/auth";
import { isWeb } from "../../utils/platform";
import { COLORS } from "../../constants/colors";
import { supabase } from "../../services/supabase";

interface EarningsData {
  caterer_id: string | null;
  caterer_name: string | null;
  total_bookings: number | null;
  completed_bookings: number | null;
  total_deposits_received: number | null;
  total_remaining_received: number | null;
  total_earnings: number | null;
  total_platform_fees_paid: number | null;
  avg_fee_percentage: number | null;
  current_tier: string | null;
}

interface Transaction {
  id: number;
  booking_id: number | null;
  event_date: string;
  deposit_amount: number | null;
  remaining_amount: number | null;
  delivery_fee: number | null;
  platform_fee_amount: number | null;
  caterer_payout_amount: number | null;
  status: string;
  created_at: string;
  customer_name?: string;
}

interface WithdrawalRequest {
  id: number;
  amount: number;
  payment_method: string;
  payment_details: any;
  status: string;
  created_at: string;
  processed_at: string | null;
  xendit_payout_id?: string | null;
  xendit_external_id?: string | null;
  error_message?: string | null;
}

export default function PartnerWalletScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PartnerStackParamList>>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Withdrawal modal states
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'gcash' | 'paymaya' | null>(null);

  const fetchWalletData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get packages for this caterer first
      const { data: packages, error: packagesError } = await supabase
        .from('packages')
        .select('id')
        .eq('caterer_id', user.id)
        .eq('is_active', true);

      if (packagesError) {
        console.error('Error fetching packages:', packagesError);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const packageIds = packages?.map(p => p.id) || [];

      if (packageIds.length === 0) {
        console.log('No packages found for caterer');
        setEarnings(null);
        setTransactions([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Fetch all bookings for this caterer to calculate earnings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          package_id,
          event_date,
          deposit_amount,
          remaining_amount,
          delivery_fee,
          platform_fee_amount,
          caterer_payout_amount,
          platform_fee_percentage,
          status,
          created_at,
          customer:user_id (
            username
          )
        `)
        .in('package_id', packageIds)
        .order('created_at', { ascending: false });

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Calculate earnings from bookings data
      const allBookings = bookingsData || [];
      const completedBookings = allBookings.filter((b: any) => b.status === 'COMPLETED');
      const confirmedBookings = allBookings.filter((b: any) => b.status === 'CONFIRMED');
      
      // Get bookings that have payout amounts (for earnings calculation)
      // Include COMPLETED bookings and any bookings with caterer_payout_amount > 0
      const bookingsWithEarnings = allBookings.filter((b: any) => {
        const payout = b.caterer_payout_amount || 0;
        return b.status === 'COMPLETED' || payout > 0;
      });
      
      let totalDeposits = 0;
      let totalRemaining = 0;
      let totalPlatformFees = 0;
      let totalEarnings = 0;
      const feePercentages: number[] = [];

      // Calculate earnings from completed bookings and bookings with payouts
      bookingsWithEarnings.forEach((booking: any) => {
        const deposit = booking.deposit_amount || 0;
        const remaining = booking.remaining_amount || 0;
        const deliveryFee = booking.delivery_fee || 0;
        const platformFee = booking.platform_fee_amount || 0;
        const payout = booking.caterer_payout_amount || (deposit + remaining + deliveryFee - platformFee);

        // Only count earnings if there's an actual payout amount
        if (payout > 0) {
          totalDeposits += deposit;
          totalRemaining += remaining;
          totalPlatformFees += platformFee;
          totalEarnings += payout;

          if (booking.platform_fee_percentage) {
            feePercentages.push(booking.platform_fee_percentage);
          }
        }
      });

      // Also count confirmed bookings for deposits (if not already counted)
      confirmedBookings.forEach((booking: any) => {
        const deposit = booking.deposit_amount || 0;
        // Only add if not already counted in bookingsWithEarnings
        if (!bookingsWithEarnings.find((b: any) => b.id === booking.id)) {
          totalDeposits += deposit;
          if (booking.platform_fee_amount) {
            totalPlatformFees += booking.platform_fee_amount;
          }
        }
      });

      const avgFeePercentage = feePercentages.length > 0
        ? feePercentages.reduce((a, b) => a + b, 0) / feePercentages.length
        : null;

      // Get current tier from monthly GMV or default to BASE
      const currentMonth = new Date();
      currentMonth.setDate(1);
      const { data: gmvData } = await supabase
        .from('caterer_monthly_gmv')
        .select('next_month_fee_tier')
        .eq('caterer_id', user.id)
        .eq('month', currentMonth.toISOString().split('T')[0])
        .maybeSingle();

      const currentTier = gmvData?.next_month_fee_tier || 'BASE';

      // Fetch withdrawal requests to calculate available balance
      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('caterer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      // Calculate available balance (total earnings minus pending/processing withdrawals)
      const pendingWithdrawals = withdrawalsData?.filter(
        (w: any) => w.status === 'PENDING' || w.status === 'PROCESSING'
      ) || [];
      const totalPendingWithdrawals = pendingWithdrawals.reduce(
        (sum: number, w: any) => sum + (w.amount || 0),
        0
      );
      
      // Calculate available balance (earnings after platform fees, minus pending withdrawals)
      const availableBalance = Math.max(0, totalEarnings - totalPendingWithdrawals);

      // Debug logging
      console.log('[PartnerWalletScreen] Earnings calculation:', {
        totalBookings: allBookings.length,
        completedBookings: completedBookings.length,
        bookingsWithEarnings: bookingsWithEarnings.length,
        totalEarnings,
        totalPendingWithdrawals,
        availableBalance,
        sampleBooking: bookingsWithEarnings[0] ? {
          id: bookingsWithEarnings[0].id,
          status: bookingsWithEarnings[0].status,
          payout: bookingsWithEarnings[0].caterer_payout_amount,
        } : null,
      });

      // Set calculated earnings (total_earnings shows available balance)
      setEarnings({
        caterer_id: user.id,
        caterer_name: null,
        total_bookings: allBookings.length,
        completed_bookings: completedBookings.length,
        total_deposits_received: totalDeposits,
        total_remaining_received: totalRemaining,
        total_earnings: availableBalance, // This is now the available balance
        total_platform_fees_paid: totalPlatformFees,
        avg_fee_percentage: avgFeePercentage,
        current_tier: currentTier,
      });

      // Set withdrawals for history display
      if (!withdrawalsError && withdrawalsData) {
        setWithdrawals(withdrawalsData as WithdrawalRequest[]);
      }

      // Set transactions (all confirmed and completed bookings)
      const transactions: Transaction[] = [...completedBookings, ...confirmedBookings]
        .slice(0, 50)
        .map((booking: any) => {
          const deposit = booking.deposit_amount || 0;
          const remaining = booking.remaining_amount || 0;
          const deliveryFee = booking.delivery_fee || 0;
          const platformFee = booking.platform_fee_amount || 0;
          const payout = booking.caterer_payout_amount || (deposit + remaining + deliveryFee - platformFee);

          return {
            id: booking.id,
            booking_id: booking.package_id,
            event_date: booking.event_date,
            deposit_amount: deposit,
            remaining_amount: remaining,
            delivery_fee: deliveryFee,
            platform_fee_amount: platformFee,
            caterer_payout_amount: payout,
            status: booking.status,
            created_at: booking.created_at,
            customer_name: booking.customer?.username || 'Unknown',
          };
        });

      setTransactions(transactions);
    } catch (error: any) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, [user]);

  // Refresh wallet data when screen comes into focus (e.g., after completing a booking)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('[PartnerWalletScreen] Screen focused, refreshing wallet data');
      fetchWalletData();
    });

    return unsubscribe;
  }, [navigation, user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWalletData();
  };

  const handleWithdrawalSubmit = async (data: {
    amount: number;
    name: string;
    accountNumber: string;
  }) => {
    if (!user || !selectedPaymentMethod) return;

    try {
      // Prepare payment details JSON
      const paymentDetails = {
        accountName: data.name,
        mobileNumber: data.accountNumber,
      };

      // Create withdrawal request first
      const { data: withdrawalRequest, error: insertError } = await supabase
        .from('withdrawal_requests')
        .insert({
          caterer_id: user.id,
          amount: data.amount,
          payment_method: selectedPaymentMethod,
          payment_details: paymentDetails,
          status: 'PENDING',
        })
        .select()
        .single();

      if (insertError || !withdrawalRequest) {
        console.error('Error creating withdrawal request:', insertError);
        throw new Error('Failed to create withdrawal request. Please try again.');
      }

      // Import withdrawal edge function service
      const { createWithdrawalViaEdgeFunction } = await import('../../services/withdrawalEdgeFunction');

      // Create Xendit payout via Edge Function
      const payoutResponse = await createWithdrawalViaEdgeFunction({
        withdrawalRequestId: withdrawalRequest.id,
        amount: data.amount,
        paymentMethod: selectedPaymentMethod,
        accountName: data.name,
        accountNumber: data.accountNumber,
      });

      if (!payoutResponse.success) {
        // Update withdrawal request to FAILED
        await supabase
          .from('withdrawal_requests')
          .update({
            status: 'FAILED',
            error_message: payoutResponse.error || 'Failed to process payout',
            updated_at: new Date().toISOString(),
          })
          .eq('id', withdrawalRequest.id);

        throw new Error(payoutResponse.error || 'Failed to process withdrawal payout');
      }

      // Refresh wallet data to show new withdrawal
      await fetchWalletData();

      Alert.alert(
        'Withdrawal Request Submitted',
        `Your withdrawal request of ${formatCurrency(data.amount)} to ${selectedPaymentMethod === 'gcash' ? 'GCash' : 'PayMaya'} has been submitted successfully. The payout is being processed and will be completed within 1-3 business days.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error submitting withdrawal:', error);
      throw error;
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '₱0.00';
    return `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getTierColor = (tier: string | null) => {
    if (!tier) return COLORS.textLight;
    switch (tier.toUpperCase()) {
      case 'BASE': return '#6b7280';
      case 'GROWTH': return '#3b82f6';
      case 'PRO': return '#10b981';
      default: return COLORS.textLight;
    }
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        {isWeb && <Sidebar />}
        <View style={styles.mainArea}>
          <TopBar title="Wallet" />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading wallet data...</Text>
          </View>
        </View>
        {!isWeb && <BottomNav />}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {isWeb && <Sidebar />}

      <View style={styles.mainArea}>
        <TopBar title="Wallet" />

        <ScrollView
          style={styles.scrollRegion}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Header */}
          <View style={styles.pageHeaderRow}>
            <View style={styles.pageHeaderLeft}>
              <Text style={styles.pageTitle}>Wallet</Text>
              <Text style={styles.pageSubTitle}>
                View your earnings and transaction history
              </Text>
            </View>
          </View>

          {/* Earnings Summary Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Earnings Summary</Text>
            </View>
            
            {earnings ? (
              <>
              
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total Earnings</Text>
                  <Text style={[styles.summaryValue, { color: COLORS.primary }]}>
                    {formatCurrency(earnings.total_earnings)}
                  </Text>
                </View>

                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Platform Fees</Text>
                  <Text style={[styles.summaryValue, { color: COLORS.danger }]}>
                    {formatCurrency(earnings.total_platform_fees_paid)}
                  </Text>
                </View>

                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Completed Bookings</Text>
                  <Text style={styles.summaryValue}>
                    {earnings.completed_bookings || 0}
                  </Text>
                </View>

                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Current Tier</Text>
                  <View style={[styles.tierBadge, { backgroundColor: getTierColor(earnings.current_tier) + '15' }]}>
                    <Text style={[styles.tierText, { color: getTierColor(earnings.current_tier) }]}>
                      {earnings.current_tier || 'BASE'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Breakdown */}
              <View style={styles.breakdownSection}>
                <Text style={styles.breakdownTitle}>Payment Breakdown</Text>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Deposits Received:</Text>
                  <Text style={styles.breakdownValue}>
                    {formatCurrency(earnings.total_deposits_received)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Remaining Payments:</Text>
                  <Text style={styles.breakdownValue}>
                    {formatCurrency(earnings.total_remaining_received)}
                  </Text>
                </View>
                {earnings.avg_fee_percentage && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Avg. Platform Fee:</Text>
                    <Text style={styles.breakdownValue}>
                      {earnings.avg_fee_percentage.toFixed(2)}%
                    </Text>
                  </View>
                )}
              </View>
            </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="wallet-outline" size={48} color={COLORS.textLight} />
                <Text style={styles.emptyStateText}>No earnings data yet</Text>
                <Text style={styles.emptyStateSubText}>
                  Earnings will appear here once you have completed bookings
                </Text>
              </View>
            )}
          </View>

          {/* Prominent Withdrawal Section */}
          {earnings && earnings.total_earnings && earnings.total_earnings > 0 && (
            <View style={styles.withdrawalCard}>
              <View style={styles.withdrawalCardContent}>
                <View style={styles.withdrawalCardLeft}>
                  <Ionicons name="cash-outline" size={Platform.OS === 'web' ? 32 : 28} color={COLORS.primary} />
                  <View style={styles.withdrawalCardText}>
                    <Text style={styles.withdrawalCardTitle}>Ready to Withdraw</Text>
                    <Text style={styles.withdrawalCardSubtitle}>
                      Available balance: {formatCurrency(earnings.total_earnings)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.withdrawButtonLarge}
                  onPress={() => {
                    console.log('[PartnerWalletScreen] Withdraw Now button clicked');
                    setShowMethodModal(true);
                  }}
                  activeOpacity={0.8}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="arrow-down-circle" size={22} color={COLORS.white} />
                  <Text style={styles.withdrawButtonLargeText}>Withdraw Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Transactions and Withdrawals Side by Side */}
          <View style={styles.historyContainer}>
            {/* Transaction History */}
            <View style={styles.historyCard}>
              <Text style={styles.cardTitle}>Recent Transactions</Text>
              
              {transactions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="receipt-outline" size={48} color={COLORS.textLight} />
                  <Text style={styles.emptyStateText}>No transactions yet</Text>
                  <Text style={styles.emptyStateSubText}>
                    Completed bookings will appear here
                  </Text>
                </View>
              ) : (
                <View style={styles.transactionsList}>
                  {transactions.slice(0, 10).map((transaction) => {
                    const totalAmount = (transaction.deposit_amount || 0) + 
                                      (transaction.remaining_amount || 0) + 
                                      (transaction.delivery_fee || 0);
                    const payout = transaction.caterer_payout_amount || 
                                  (totalAmount - (transaction.platform_fee_amount || 0));

                    return (
                      <View key={transaction.id} style={styles.transactionItem}>
                        <View style={styles.transactionHeader}>
                          <View style={styles.transactionLeft}>
                            <Ionicons 
                              name={transaction.status === 'COMPLETED' ? 'checkmark-circle' : 'time'} 
                              size={20} 
                              color={transaction.status === 'COMPLETED' ? COLORS.success : COLORS.warn} 
                            />
                            <View style={styles.transactionInfo}>
                              <Text style={styles.transactionTitle}>
                                Booking #{transaction.id}
                              </Text>
                              <Text style={styles.transactionSubtitle}>
                                {transaction.customer_name} • {formatDate(transaction.event_date)}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.transactionAmount, { color: COLORS.primary }]}>
                            {formatCurrency(payout)}
                          </Text>
                        </View>
                        
                        {transaction.platform_fee_amount && (
                          <View style={styles.transactionDetails}>
                            <Text style={styles.transactionDetailText}>
                              Total: {formatCurrency(totalAmount)} • 
                              Fee: {formatCurrency(transaction.platform_fee_amount)} • 
                              Payout: {formatCurrency(payout)}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Withdrawal History */}
            <View style={styles.historyCard}>
              <Text style={styles.cardTitle}>Withdrawal History</Text>
              
              {withdrawals.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="cash-outline" size={48} color={COLORS.textLight} />
                  <Text style={styles.emptyStateText}>No withdrawals yet</Text>
                  <Text style={styles.emptyStateSubText}>
                    Withdrawal requests will appear here
                  </Text>
                </View>
              ) : (
                <View style={styles.withdrawalsList}>
                  {withdrawals.slice(0, 10).map((withdrawal) => {
                    const getStatusColor = (status: string) => {
                      switch (status) {
                        case 'COMPLETED': return COLORS.success;
                        case 'PROCESSING': return COLORS.warn;
                        case 'FAILED': return COLORS.danger;
                        case 'CANCELLED': return COLORS.textLight;
                        default: return COLORS.warn;
                      }
                    };

                    return (
                      <View key={withdrawal.id} style={styles.withdrawalItem}>
                        <View style={styles.withdrawalHeader}>
                          <View style={styles.withdrawalLeft}>
                            <Ionicons
                              name={
                                withdrawal.status === 'COMPLETED'
                                  ? 'checkmark-circle'
                                  : withdrawal.status === 'FAILED'
                                  ? 'close-circle'
                                  : 'time'
                              }
                              size={20}
                              color={getStatusColor(withdrawal.status)}
                            />
                            <View style={styles.withdrawalInfo}>
                              <Text style={styles.withdrawalTitle}>
                                {withdrawal.payment_method === 'gcash'
                                  ? 'GCash'
                                  : withdrawal.payment_method === 'paymaya'
                                  ? 'PayMaya'
                                  : 'Bank Transfer'}
                              </Text>
                              <Text style={styles.withdrawalSubtitle}>
                                {formatDate(withdrawal.created_at)} • {withdrawal.status}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.withdrawalAmount, { color: COLORS.primary }]}>
                            {formatCurrency(withdrawal.amount)}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>

        </ScrollView>
      </View>
      {!isWeb && <BottomNav />}

      {/* Withdrawal Modals */}
      <WithdrawalMethodModal
        visible={showMethodModal}
        onClose={() => {
          console.log('[PartnerWalletScreen] Closing method modal');
          setShowMethodModal(false);
        }}
        onSelectMethod={(method) => {
          console.log('[PartnerWalletScreen] Method selected:', method);
          setSelectedPaymentMethod(method);
          setShowMethodModal(false);
          setShowDetailsModal(true);
        }}
      />

      <WithdrawalDetailsModal
        visible={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedPaymentMethod(null);
        }}
        paymentMethod={selectedPaymentMethod}
        availableBalance={earnings?.total_earnings || 0}
        onSubmit={handleWithdrawalSubmit}
      />
    </View>
  );
}

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
    paddingBottom: Platform.OS === 'web' ? 16 : 100
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.textLight
  },
  pageHeaderRow: {
    flexDirection: Platform.OS === 'web' ? "row" : "column",
    justifyContent: Platform.OS === 'web' ? "space-between" : "flex-start",
    alignItems: Platform.OS === 'web' ? "flex-start" : "flex-start",
    marginBottom: 24,
    gap: Platform.OS === 'web' ? 0 : 12
  },
  pageHeaderLeft: {
    flex: 1
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8
  },
  pageSubTitle: {
    color: "#6b7280",
    fontSize: Platform.OS === 'web' ? 14 : 15,
    marginTop: 4
  },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: Platform.OS === 'web' ? 12 : 16,
    padding: Platform.OS === 'web' ? 24 : 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: Platform.OS === 'web' ? 2 : 4 },
    shadowOpacity: 0.05,
    shadowRadius: Platform.OS === 'web' ? 8 : 12,
    elevation: 2
  },
  cardTitle: {
    fontSize: Platform.OS === 'web' ? 18 : 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 20
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 24
  },
  summaryItem: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? 150 : '45%',
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb"
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8,
    fontWeight: "500"
  },
  summaryValue: {
    fontSize: Platform.OS === 'web' ? 20 : 22,
    fontWeight: "700",
    color: "#111827"
  },
  tierBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 4
  },
  tierText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  breakdownSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb"
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  breakdownLabel: {
    fontSize: 14,
    color: "#6b7280"
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827"
  },
  transactionsList: {
    gap: 12
  },
  transactionItem: {
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb"
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8
  },
  transactionLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    gap: 12
  },
  transactionInfo: {
    flex: 1
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4
  },
  transactionSubtitle: {
    fontSize: 12,
    color: "#6b7280"
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "700"
  },
  transactionDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb"
  },
  transactionDetailText: {
    fontSize: 12,
    color: "#6b7280"
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8
  },
  emptyStateSubText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center"
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  },
  withdrawButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
    paddingVertical: Platform.OS === 'web' ? 12 : 8,
    borderRadius: 8,
    gap: 6,
    shadowColor: Platform.OS === 'web' ? COLORS.shadow : 'transparent',
    shadowOffset: Platform.OS === 'web' ? { width: 0, height: 2 } : { width: 0, height: 0 },
    shadowOpacity: Platform.OS === 'web' ? 0.1 : 0,
    shadowRadius: Platform.OS === 'web' ? 4 : 0,
    elevation: Platform.OS === 'web' ? 2 : 0,
    zIndex: Platform.OS === 'web' ? 10 : 0,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      pointerEvents: 'auto',
    }),
  } as any,
  withdrawButtonDisabled: {
    backgroundColor: Platform.OS === 'web' ? '#e5e7eb' : COLORS.textLight,
    opacity: Platform.OS === 'web' ? 1 : 0.6,
  } as any,
  withdrawButtonText: {
    color: COLORS.white,
    fontSize: Platform.OS === 'web' ? 15 : 14,
    fontWeight: "600"
  },
  withdrawButtonTextDisabled: {
    color: Platform.OS === 'web' ? '#9ca3af' : COLORS.textLight
  },
  withdrawalsList: {
    gap: 12
  },
  withdrawalItem: {
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb"
  },
  withdrawalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  withdrawalLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    gap: 12
  },
  withdrawalInfo: {
    flex: 1
  },
  withdrawalTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4
  },
  withdrawalSubtitle: {
    fontSize: 12,
    color: "#6b7280"
  },
  withdrawalAmount: {
    fontSize: 16,
    fontWeight: "700"
  },
  withdrawalCard: {
    backgroundColor: COLORS.white,
    borderRadius: Platform.OS === 'web' ? 12 : 16,
    padding: Platform.OS === 'web' ? 24 : 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: Platform.OS === 'web' ? 4 : 6 },
    shadowOpacity: Platform.OS === 'web' ? 0.15 : 0.2,
    shadowRadius: Platform.OS === 'web' ? 12 : 16,
    elevation: Platform.OS === 'web' ? 4 : 8,
  },
  withdrawalCardContent: {
    flexDirection: Platform.OS === 'web' ? "row" : "column",
    justifyContent: "space-between",
    alignItems: Platform.OS === 'web' ? "center" : "flex-start",
    gap: Platform.OS === 'web' ? 0 : 16,
  },
  withdrawalCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  withdrawalCardText: {
    flex: 1,
  },
  withdrawalCardTitle: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  withdrawalCardSubtitle: {
    fontSize: Platform.OS === 'web' ? 15 : 14,
    color: COLORS.textLight,
    fontWeight: "500",
  },
  withdrawButtonLarge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: Platform.OS === 'web' ? 24 : 20,
    paddingVertical: Platform.OS === 'web' ? 14 : 12,
    borderRadius: 8,
    gap: 8,
    shadowColor: Platform.OS === 'web' ? COLORS.shadow : 'transparent',
    shadowOffset: Platform.OS === 'web' ? { width: 0, height: 2 } : { width: 0, height: 0 },
    shadowOpacity: Platform.OS === 'web' ? 0.2 : 0,
    shadowRadius: Platform.OS === 'web' ? 4 : 0,
    elevation: Platform.OS === 'web' ? 3 : 0,
    zIndex: Platform.OS === 'web' ? 10 : 0,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      pointerEvents: 'auto',
    }),
  } as any,
  withdrawButtonLargeText: {
    color: COLORS.white,
    fontSize: Platform.OS === 'web' ? 16 : 15,
    fontWeight: "700",
  },
  historyContainer: {
    flexDirection: Platform.OS === 'web' ? "row" : "column",
    gap: 16,
    marginBottom: 24,
  },
  historyCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: Platform.OS === 'web' ? 12 : 16,
    padding: Platform.OS === 'web' ? 24 : 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: Platform.OS === 'web' ? 2 : 4 },
    shadowOpacity: 0.05,
    shadowRadius: Platform.OS === 'web' ? 8 : 12,
    elevation: 2,
    minHeight: Platform.OS === 'web' ? 400 : 300,
  },
});
