import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, RefreshControl, TextInput } from 'react-native';
import { supabase } from '../../services/supabase';

interface PartnerApplication {
  id: string;
  user_id: string | null;
  business_name: string;
  locations: any;
  website: string | null;
  owner_name: string;
  owner_phone: string;
  owner_email: string;
  telephone_number: string | null;
  contact_number: string | null;
  permits_ready: boolean;
  food_safety: boolean;
  agree_terms: boolean;
  notes: string | null;
  uploaded_documents: string[];
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
  updated_at: string;
}

const COLORS_ADMIN = {
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

interface RecruitmentPageProps {
  onViewDetails: (app: PartnerApplication) => void;
  refreshTrigger?: number; // Key to trigger refresh when changed
}

export default function RecruitmentPage({ onViewDetails, refreshTrigger }: RecruitmentPageProps) {
  const [applications, setApplications] = useState<PartnerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('partner_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching applications:', error);
        Alert.alert('Error', 'Failed to load applications');
        return;
      }

      setApplications(data || []);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to load applications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  // Refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchApplications();
    }
  }, [refreshTrigger]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchApplications();
  };

  const filteredApplications = applications.filter((app) => {
    const matchesStatus = filter === 'All' || app.status === filter;
    const matchesSearch = !searchQuery.trim()
      ? true
      : app.business_name.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchesStatus && matchesSearch;
  });
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return COLORS_ADMIN.success;
      case 'Rejected': return COLORS_ADMIN.danger;
      case 'Pending': return COLORS_ADMIN.warning;
      default: return COLORS_ADMIN.textLight;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'Approved': return COLORS_ADMIN.success + '15';
      case 'Rejected': return COLORS_ADMIN.danger + '15';
      case 'Pending': return COLORS_ADMIN.warning + '15';
      default: return COLORS_ADMIN.bg;
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

  const formatLocations = (locations: any) => {
    if (!locations || !Array.isArray(locations) || locations.length === 0) {
      return 'N/A';
    }
    return locations.map((loc: any) => `${loc.city || ''}, ${loc.province || ''}`).filter(Boolean).join('; ') || 'N/A';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS_ADMIN.primary} />
        <Text style={styles.loadingText}>Loading applications...</Text>
      </View>
    );
  }

  const pendingCount = applications.filter(app => app.status === 'Pending').length;
  const approvedCount = applications.filter(app => app.status === 'Approved').length;
  const rejectedCount = applications.filter(app => app.status === 'Rejected').length;

  return (
    <View style={styles.container}>
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total</Text>
          <Text style={[styles.statValue, { color: COLORS_ADMIN.text }]}>{applications.length}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Pending</Text>
          <Text style={[styles.statValue, { color: COLORS_ADMIN.warning }]}>{pendingCount}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Approved</Text>
          <Text style={[styles.statValue, { color: COLORS_ADMIN.success }]}>{approvedCount}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Rejected</Text>
          <Text style={[styles.statValue, { color: COLORS_ADMIN.danger }]}>{rejectedCount}</Text>
        </View>
      </View>

      <View style={styles.toolbar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search catering name"
          placeholderTextColor={COLORS_ADMIN.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <View style={styles.filterGroup}>
          {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((filterOption) => (
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
            <Text style={[styles.headerCell, styles.colBusiness]}>Business</Text>
            <Text style={[styles.headerCell, styles.colOwner]}>Owner</Text>
            <Text style={[styles.headerCell, styles.colLocation]}>Location</Text>
            <Text style={[styles.headerCell, styles.colStatus]}>Status</Text>
            <Text style={[styles.headerCell, styles.colActions]}>Actions</Text>
          </View>

          {filteredApplications.length === 0 ? (
            <View style={styles.emptyStateRow}>
              <Text style={styles.emptyStateText}>
                {searchQuery.trim()
                  ? 'No matches found'
                  : filter === 'All'
                    ? 'No applications found'
                    : `No ${filter.toLowerCase()} applications`}
              </Text>
            </View>
          ) : (
            filteredApplications.map((app) => (
              <View key={app.id} style={styles.tableRow}>
                <Text style={[styles.cellText, styles.colBusiness]} numberOfLines={1}>{app.business_name}</Text>
                <Text style={[styles.cellText, styles.colOwner]} numberOfLines={1}>{app.owner_name}</Text>
                <Text style={[styles.cellText, styles.colLocation]} numberOfLines={2}>{formatLocations(app.locations)}</Text>
                <View style={[styles.cell, styles.colStatus]}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusBg(app.status) }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(app.status) }]}>
                      {app.status}
                    </Text>
                  </View>
                </View>
                <View style={[styles.cell, styles.colActions]}>
                  <Pressable
                    style={styles.tableActionButton}
                    onPress={() => onViewDetails(app)}
                  >
                    <Text style={styles.tableActionText}>Details</Text>
                  </Pressable>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    color: COLORS_ADMIN.textLight,
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
    minWidth: 120,
    backgroundColor: COLORS_ADMIN.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS_ADMIN.border,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS_ADMIN.textLight,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
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
    backgroundColor: COLORS_ADMIN.white,
    borderWidth: 1,
    borderColor: COLORS_ADMIN.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS_ADMIN.text,
  },
  filterGroup: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  tableWrapper: {
    flex: 1,
  },
  table: {
    borderWidth: 1,
    borderColor: COLORS_ADMIN.border,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS_ADMIN.white,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS_ADMIN.hover,
  },
  headerCell: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontWeight: '700',
    fontSize: 13,
    color: COLORS_ADMIN.text,
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS_ADMIN.border,
  },
  cell: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  cellText: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: COLORS_ADMIN.text,
    fontSize: 13,
    flexShrink: 1,
  },
  colBusiness: {
    flex: 2,
  },
  colOwner: {
    flex: 1.4,
  },
  colLocation: {
    flex: 2,
  },
  colStatus: {
    flex: 1,
    justifyContent: 'center',
  },
  colActions: {
    width: 120,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  tableActionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: COLORS_ADMIN.primary,
  },
  tableActionText: {
    color: COLORS_ADMIN.white,
    fontWeight: '600',
    fontSize: 13,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS_ADMIN.border,
    backgroundColor: COLORS_ADMIN.white,
  },
  filterButtonActive: {
    backgroundColor: COLORS_ADMIN.primary,
    borderColor: COLORS_ADMIN.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS_ADMIN.text,
  },
  filterButtonTextActive: {
    color: COLORS_ADMIN.white,
  },
  list: {
    flex: 1,
  },
  emptyStateRow: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    color: COLORS_ADMIN.textLight,
    fontSize: 16,
  },
  applicationCard: {
    backgroundColor: COLORS_ADMIN.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS_ADMIN.border,
    padding: 20,
    marginBottom: 16,
  },
  applicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  applicationInfo: {
    flex: 1,
    marginRight: 12,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS_ADMIN.text,
    marginBottom: 4,
  },
  ownerName: {
    fontSize: 14,
    color: COLORS_ADMIN.textLight,
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  applicationDetails: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS_ADMIN.border,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS_ADMIN.text,
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS_ADMIN.textLight,
    flex: 1,
  },
  applicationActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS_ADMIN.border,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  viewButton: {
    backgroundColor: COLORS_ADMIN.bg,
    borderWidth: 1,
    borderColor: COLORS_ADMIN.border,
  },
  viewButtonText: {
    color: COLORS_ADMIN.text,
    fontWeight: '600',
    fontSize: 14,
  },
  approveButton: {
    backgroundColor: COLORS_ADMIN.success,
  },
  approveButtonText: {
    color: COLORS_ADMIN.white,
    fontWeight: '600',
    fontSize: 14,
  },
  rejectButton: {
    backgroundColor: COLORS_ADMIN.danger,
  },
  rejectButtonText: {
    color: COLORS_ADMIN.white,
    fontWeight: '600',
    fontSize: 14,
  },
});

