import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { supabase } from '../../services/supabase';

const COLORS = {
  primary: "#FF8000",
  text: "#111827",
  textLight: "#6b7280",
  bg: "#f9fafb",
  white: "#ffffff",
  border: "#e5e7eb",
  hover: "#f3f4f6",
  success: "#22c55e",
  danger: "#ef4444",
  info: "#0ea5e9",
  warning: "#f59e0b",
};

interface AnalyticsData {
  totalUsers: number;
  totalBookings: number;
  totalRevenue: number;
  platformFeeRevenue: number;
  subscriptionRevenue: number;
  avgBookingValue: number;
  totalCaterers: number;
  pendingApplications: number;
  completionRate: number;
  topServices: Array<{ name: string; count: number; revenue: number }>;
  revenueByMonth: Array<{ month: string; revenue: number }>;
  bookingsByStatus: { [key: string]: number };
  userGrowth: Array<{ month: string; count: number }>;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async () => {
    try {
      // Fetch users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, created_at');

      // Fetch bookings with related data (no services table - use packages and partner_applications)
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          packages:package_id (
            id,
            name,
            price,
            caterer_id
          )
        `)
        .order('created_at', { ascending: false });

      // Fetch partner applications (these are the "services")
      const { data: applications, error: applicationsError } = await supabase
        .from('partner_applications')
        .select('id, status, business_name, user_id');

      // Fetch subscription revenue from active subscriptions
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('caterer_subscriptions')
        .select('amount')
        .eq('status', 'active');

      if (usersError || bookingsError || applicationsError) {
        throw usersError || bookingsError || applicationsError;
      }

      if (subscriptionsError) {
        console.warn('Subscriptions fetch error:', subscriptionsError);
      }

      // Calculate analytics
      const totalUsers = users?.length || 0;
      const totalBookings = bookings?.length || 0;

      // Calculate revenue
      let totalRevenue = 0;
      let platformFeeRevenue = 0;
      const serviceRevenue: { [key: string]: { count: number; revenue: number } } = {};
      const monthlyRevenue: { [key: string]: { revenue: number; label: string } } = {};
      const bookingsByStatus: { [key: string]: number } = {};

      // Create a map of caterer_id to business_name for quick lookup
      const catererNameMap = new Map<string, string>();
      applications?.forEach((app: any) => {
        if (app.user_id && app.business_name) {
          catererNameMap.set(app.user_id, app.business_name);
        }
      });

      bookings?.forEach((booking: any) => {
        // Calculate amount - prioritize actual payment amounts over package price
        let amount = 0;
        const depositAmount = booking.deposit_amount || 0;
        const remainingAmount = booking.remaining_amount || 0;
        const deliveryFee = booking.delivery_fee || 0;
        
        // Use actual payment amounts if available (most accurate)
        if (depositAmount > 0 || remainingAmount > 0) {
          amount = depositAmount + remainingAmount + deliveryFee;
        } else if (booking.packages?.price) {
          // Fallback: Extract price from package (format: "₱250/head" or "250")
          const priceMatch = booking.packages.price.match(/(\d+(?:,\d+)*(?:\.\d+)?)/);
          if (priceMatch) {
            const pricePerHead = parseFloat(priceMatch[1].replace(/,/g, ''));
            amount = pricePerHead * booking.guests + deliveryFee;
          }
        } else if (deliveryFee > 0) {
          // Last resort: use delivery fee if available
          amount = deliveryFee;
        }

        // Track by status (for all bookings)
        const status = booking.status || 'PENDING';
        bookingsByStatus[status] = (bookingsByStatus[status] || 0) + 1;

        // Count revenue and platform fees from completed bookings
        // Also include CONFIRMED bookings that might have platform fees calculated
        if (booking.status === 'COMPLETED' || booking.status === 'CONFIRMED') {
          // Only add to total revenue if completed
        if (booking.status === 'COMPLETED') {
          totalRevenue += amount;
          }

          // Calculate platform fee revenue using current tier percentage (3% for BASE)
          // Recalculate for consistency with current tier system
          const currentFeePercentage = 3.00; // Current tier fee (BASE = 3%)
          let platformFee = 0;
          
          if (amount > 0) {
            // Recalculate using current tier percentage instead of historical fees
            platformFee = amount * (currentFeePercentage / 100);
          }
          
          // Only count platform fees from bookings with actual amounts
          if (platformFee > 0) {
            platformFeeRevenue += platformFee;
          }

          // Track by service (get business name from caterer_id) - only for completed
          if (booking.status === 'COMPLETED') {
          const catererId = booking.packages?.caterer_id;
          const serviceName = catererId ? (catererNameMap.get(catererId) || 'Unknown Service') : 'Unknown Service';
          if (!serviceRevenue[serviceName]) {
            serviceRevenue[serviceName] = { count: 0, revenue: 0 };
          }
          serviceRevenue[serviceName].count++;
          serviceRevenue[serviceName].revenue += amount;

            // Track by month (use updated_at for completed bookings to get completion month)
            const completionDate = booking.updated_at || booking.created_at;
            const date = new Date(completionDate);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
            if (!monthlyRevenue[monthKey]) {
              monthlyRevenue[monthKey] = { revenue: 0, label: monthLabel };
            }
            monthlyRevenue[monthKey].revenue += amount;
        }
        }
      });

      // Calculate average booking value from completed bookings only
      const completedBookingsCount = bookings?.filter(b => b.status === 'COMPLETED').length || 0;
      const avgBookingValue = completedBookingsCount > 0 ? totalRevenue / completedBookingsCount : 0;

      // Top services
      const topServices = Object.entries(serviceRevenue)
        .map(([name, data]) => ({ name, count: data.count, revenue: data.revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Revenue by month - sort properly
      const revenueByMonth = Object.entries(monthlyRevenue)
        .map(([monthKey, data]) => ({
          month: data.label,
          revenue: data.revenue,
          sortKey: monthKey
        }))
        .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
        .map(({ month, revenue }) => ({ month, revenue })) // Remove sortKey
        .slice(-6); // Last 6 months

      // User growth by month - use proper date sorting
      const usersByMonth: { [key: string]: { count: number; label: string } } = {};
      users?.forEach((user: any) => {
        const date = new Date(user.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        if (!usersByMonth[monthKey]) {
          usersByMonth[monthKey] = { count: 0, label: monthLabel };
        }
        usersByMonth[monthKey].count++;
      });

      const userGrowth = Object.entries(usersByMonth)
        .map(([monthKey, data]) => ({ month: data.label, count: data.count, sortKey: monthKey }))
        .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
        .map(({ month, count }) => ({ month, count })) // Remove sortKey
        .slice(-6);

      // Calculate caterer and application metrics
      const totalCaterers = applications?.filter(app => app.status === 'Approved').length || 0;
      const pendingApplications = applications?.filter(app => app.status === 'Pending').length || 0;
      
      // Calculate completion rate
      const completedBookings = bookings?.filter(b => b.status === 'COMPLETED').length || 0;
      const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;

      // Calculate subscription revenue
      const subscriptionRevenue = subscriptionsData?.reduce((sum, sub) => sum + (sub.amount || 0), 0) || 0;

      console.log('[AnalyticsPage] Calculated analytics:', {
        totalUsers,
        totalBookings,
        totalRevenue,
        platformFeeRevenue,
        completedBookingsCount,
        topServicesCount: topServices.length,
        revenueByMonthCount: revenueByMonth.length,
        topServices: topServices.map(s => ({ name: s.name, revenue: s.revenue })),
      });

      setAnalytics({
        totalUsers,
        totalBookings,
        totalRevenue,
        platformFeeRevenue,
        subscriptionRevenue,
        avgBookingValue,
        totalCaterers,
        pendingApplications,
        completionRate,
        topServices,
        revenueByMonth,
        bookingsByStatus,
        userGrowth,
      });
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // Set default analytics data even on error to prevent showing error state
      setAnalytics({
        totalUsers: 0,
        totalBookings: 0,
        totalRevenue: 0,
        platformFeeRevenue: 0,
        subscriptionRevenue: 0,
        avgBookingValue: 0,
        totalCaterers: 0,
        pendingApplications: 0,
        completionRate: 0,
        topServices: [],
        revenueByMonth: [],
        bookingsByStatus: {},
        userGrowth: [],
      });
      
      Alert.alert('Error', `Failed to load analytics: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Failed to load analytics</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.pageTitle}>Analytics & Insights</Text>

      {/* Key Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Booking Revenue</Text>
            <Text style={[styles.statValue, { color: COLORS.success }]}>
              ₱{analytics.totalRevenue.toLocaleString()}
            </Text>
            <Text style={styles.statSubtext}>Total from completed bookings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Bookings</Text>
            <Text style={[styles.statValue, { color: COLORS.info }]}>
              {analytics.totalBookings}
            </Text>
            <Text style={styles.statSubtext}>All time</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Avg Booking Value</Text>
            <Text style={[styles.statValue, { color: COLORS.primary }]}>
              ₱{analytics.avgBookingValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </Text>
            <Text style={styles.statSubtext}>Per booking</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Users</Text>
            <Text style={[styles.statValue, { color: COLORS.text }]}>
              {analytics.totalUsers}
            </Text>
            <Text style={styles.statSubtext}>Registered</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Active Caterers</Text>
            <Text style={[styles.statValue, { color: COLORS.primary }]}>
              {analytics.totalCaterers}
            </Text>
            <Text style={styles.statSubtext}>Approved partners</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Completion Rate</Text>
            <Text style={[styles.statValue, { color: COLORS.success }]}>
              {analytics.completionRate.toFixed(1)}%
            </Text>
            <Text style={styles.statSubtext}>Bookings completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Subscription Revenue</Text>
            <Text style={[styles.statValue, { color: COLORS.warning }]}>
              ₱{analytics.subscriptionRevenue.toLocaleString()}
            </Text>
            <Text style={styles.statSubtext}>From premium subscriptions</Text>
          </View>
        </View>
      </View>

      {/* Additional Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Platform Health</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Pending Applications</Text>
            <Text style={[styles.statValue, { color: analytics.pendingApplications > 0 ? COLORS.warning : COLORS.success }]}>
              {analytics.pendingApplications}
            </Text>
            <Text style={styles.statSubtext}>Awaiting review</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Platform Fee Revenue</Text>
            <Text style={[styles.statValue, { color: COLORS.info }]}>
              ₱{analytics.platformFeeRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text style={styles.statSubtext}>Tiered platform fee (3% base, 2% at 300k+, 1% at 500k+)</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Active Bookings</Text>
            <Text style={[styles.statValue, { color: COLORS.info }]}>
              {(analytics.bookingsByStatus['CONFIRMED'] || 0) + (analytics.bookingsByStatus['ON_THE_WAY'] || 0)}
            </Text>
            <Text style={styles.statSubtext}>Confirmed + On the way</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Combined Revenue</Text>
            <Text style={[styles.statValue, { color: COLORS.success }]}>
              ₱{(analytics.platformFeeRevenue + analytics.subscriptionRevenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text style={styles.statSubtext}>Platform fees + Subscriptions</Text>
          </View>
        </View>
      </View>

      {/* Revenue by Month & User Growth - Side by Side */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trends (Last 6 Months)</Text>
        <View style={styles.chartsRow}>
          {/* Revenue Trend */}
          <View style={styles.chartCardHalf}>
            <Text style={styles.chartTitle}>Revenue Trend</Text>
            {analytics.revenueByMonth.length === 0 ? (
              <Text style={styles.emptyText}>No revenue data available</Text>
            ) : (
              analytics.revenueByMonth.map((item, index) => {
                const maxRevenue = Math.max(...analytics.revenueByMonth.map(r => r.revenue || 0), 1);
                const barWidth = maxRevenue > 0 ? ((item.revenue || 0) / maxRevenue) * 100 : 0;
                return (
                  <View key={`${item.month}-${index}`} style={styles.barRow}>
                    <Text style={styles.barLabel}>{item.month}</Text>
                    <View style={styles.barContainer}>
                      <View style={[styles.bar, { width: `${barWidth}%` }]} />
                    </View>
                    <Text style={styles.barValue}>₱{(item.revenue || 0).toLocaleString()}</Text>
                  </View>
                );
              })
            )}
          </View>

          {/* User Growth */}
          <View style={styles.chartCardHalf}>
            <Text style={styles.chartTitle}>User Growth</Text>
            {analytics.userGrowth.length === 0 ? (
              <Text style={styles.emptyText}>No user growth data available</Text>
            ) : (
              analytics.userGrowth.map((item, index) => {
                const maxCount = Math.max(...analytics.userGrowth.map(u => u.count));
                const barWidth = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                return (
                  <View key={index} style={styles.barRow}>
                    <Text style={styles.barLabel}>{item.month}</Text>
                    <View style={styles.barContainer}>
                      <View style={[styles.bar, { width: `${barWidth}%`, backgroundColor: COLORS.info }]} />
                    </View>
                    <Text style={styles.barValue}>{item.count} users</Text>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </View>

      {/* Top Services */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Services by Revenue</Text>
        <View style={styles.tableCard}>
          {analytics.topServices.length === 0 ? (
            <Text style={styles.emptyText}>No service data available</Text>
          ) : (
            <>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 2 }]}>Service</Text>
                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Bookings</Text>
                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Revenue</Text>
              </View>
              {analytics.topServices.map((service, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>
                    {service.name}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>
                    {service.count}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: '700', color: COLORS.success }]}>
                    ₱{service.revenue.toLocaleString()}
                  </Text>
                </View>
              ))}
            </>
          )}
        </View>
      </View>

      {/* Bookings by Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bookings by Status</Text>
        <View style={styles.statsGrid}>
          {Object.entries(analytics.bookingsByStatus).map(([status, count]) => {
            let color = COLORS.textLight;
            if (status === 'COMPLETED') color = COLORS.success;
            else if (status === 'CONFIRMED') color = COLORS.info;
            else if (status === 'PENDING') color = COLORS.warning;
            else if (status === 'CANCELLED' || status === 'DECLINED') color = COLORS.danger;

            return (
              <View key={status} style={styles.statCard}>
                <Text style={styles.statLabel}>{status}</Text>
                <Text style={[styles.statValue, { color }]}>{count}</Text>
                <Text style={styles.statSubtext}>
                  {analytics.totalBookings > 0 ? ((count / analytics.totalBookings) * 100).toFixed(1) : 0}% of total
                </Text>
              </View>
            );
          })}
        </View>
      </View>

    </ScrollView>
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
  errorText: {
    color: COLORS.danger,
    fontSize: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: COLORS.text,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  chartCard: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartsRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  chartCardHalf: {
    flex: 1,
    minWidth: 400,
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  barLabel: {
    width: 80,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  barContainer: {
    flex: 1,
    height: 24,
    backgroundColor: COLORS.bg,
    borderRadius: 6,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 6,
  },
  barValue: {
    width: 100,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
    textAlign: 'right',
  },
  tableCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.hover,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tableCell: {
    fontSize: 13,
    color: COLORS.text,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textLight,
    fontSize: 14,
    paddingVertical: 20,
  },
});
