import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { supabase } from '../../services/supabase';

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

interface AnalyticsData {
  totalUsers: number;
  totalBookings: number;
  totalRevenue: number;
  avgBookingValue: number;
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

      // Fetch bookings with related data
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          services:service_id (
            id,
            name,
            price_per_head
          ),
          packages:package_id (
            id,
            name,
            price
          )
        `);

      if (usersError || bookingsError) {
        throw usersError || bookingsError;
      }

      // Calculate analytics
      const totalUsers = users?.length || 0;
      const totalBookings = bookings?.length || 0;

      // Calculate revenue
      let totalRevenue = 0;
      const serviceRevenue: { [key: string]: { count: number; revenue: number } } = {};
      const monthlyRevenue: { [key: string]: number } = {};
      const bookingsByStatus: { [key: string]: number } = {};

      bookings?.forEach((booking: any) => {
        let amount = 0;
        if (booking.packages?.price) {
          const priceMatch = booking.packages.price.match(/(\d+(?:,\d+)*(?:\.\d+)?)/);
          if (priceMatch) {
            amount = parseFloat(priceMatch[1].replace(/,/g, ''));
          }
        } else {
          const pricePerHead = booking.services?.price_per_head || 0;
          amount = pricePerHead * booking.guests;
        }

        if (booking.status === 'COMPLETED') {
          totalRevenue += amount;

          // Track by service
          const serviceName = booking.services?.name || 'Unknown';
          if (!serviceRevenue[serviceName]) {
            serviceRevenue[serviceName] = { count: 0, revenue: 0 };
          }
          serviceRevenue[serviceName].count++;
          serviceRevenue[serviceName].revenue += amount;

          // Track by month
          const month = new Date(booking.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
          monthlyRevenue[month] = (monthlyRevenue[month] || 0) + amount;
        }

        // Track by status
        bookingsByStatus[booking.status] = (bookingsByStatus[booking.status] || 0) + 1;
      });

      const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

      // Top services
      const topServices = Object.entries(serviceRevenue)
        .map(([name, data]) => ({ name, count: data.count, revenue: data.revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Revenue by month
      const revenueByMonth = Object.entries(monthlyRevenue)
        .map(([month, revenue]) => ({ month, revenue }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
        .slice(-6); // Last 6 months

      // User growth by month
      const usersByMonth: { [key: string]: number } = {};
      users?.forEach((user: any) => {
        const month = new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        usersByMonth[month] = (usersByMonth[month] || 0) + 1;
      });

      const userGrowth = Object.entries(usersByMonth)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
        .slice(-6);

      setAnalytics({
        totalUsers,
        totalBookings,
        totalRevenue,
        avgBookingValue,
        topServices,
        revenueByMonth,
        bookingsByStatus,
        userGrowth,
      });
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      Alert.alert('Error', 'Failed to load analytics');
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
            <Text style={styles.statLabel}>Total Revenue</Text>
            <Text style={[styles.statValue, { color: COLORS.success }]}>
              ₱{analytics.totalRevenue.toLocaleString()}
            </Text>
            <Text style={styles.statSubtext}>From completed bookings</Text>
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
        </View>
      </View>

      {/* Revenue by Month */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Revenue Trend (Last 6 Months)</Text>
        <View style={styles.chartCard}>
          {analytics.revenueByMonth.length === 0 ? (
            <Text style={styles.emptyText}>No revenue data available</Text>
          ) : (
            analytics.revenueByMonth.map((item, index) => {
              const maxRevenue = Math.max(...analytics.revenueByMonth.map(r => r.revenue));
              const barWidth = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
              return (
                <View key={index} style={styles.barRow}>
                  <Text style={styles.barLabel}>{item.month}</Text>
                  <View style={styles.barContainer}>
                    <View style={[styles.bar, { width: `${barWidth}%` }]} />
                  </View>
                  <Text style={styles.barValue}>₱{item.revenue.toLocaleString()}</Text>
                </View>
              );
            })
          )}
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
                  {((count / analytics.totalBookings) * 100).toFixed(1)}% of total
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* User Growth */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Growth (Last 6 Months)</Text>
        <View style={styles.chartCard}>
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
