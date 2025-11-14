import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, RefreshControl, TextInput, Modal } from 'react-native';
import { supabase } from '../../services/supabase';

interface SupportTicket {
  id: number;
  user_id: string;
  booking_id?: number;
  subject: string;
  description: string;
  type: 'payment' | 'booking' | 'caterer' | 'food_quality' | 'delivery' | 'app_bug' | 'account' | 'other';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  admin_notes?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
  users?: {
    id: string;
    username: string;
    email: string;
  };
  bookings?: {
    id: number;
    event_date: string;
    status: string;
  };
}

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

export default function TicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'All' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const fetchTickets = async () => {
    try {
      // First, fetch tickets without joins to avoid FK issues
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (ticketsError) {
        console.error('Error fetching tickets:', ticketsError);
        console.error('Error details:', JSON.stringify(ticketsError, null, 2));
        
        // Check if it's an RLS policy issue
        if (ticketsError.code === 'PGRST301' || ticketsError.message?.includes('row-level security')) {
          Alert.alert(
            'Permission Error', 
            'Unable to load support tickets. Please ensure RLS policies allow admin access to support_tickets table.'
          );
        } else {
          Alert.alert('Error', ticketsError?.message || 'Failed to load support tickets. Please check your connection and try again.');
        }
        
        setTickets([]);
        return;
      }

      if (!ticketsData || ticketsData.length === 0) {
        console.log('No tickets found');
        setTickets([]);
        return;
      }

      console.log(`✅ Found ${ticketsData.length} support tickets, enriching with user data...`);

      // Fetch user data from public.users table for each unique user_id
      const uniqueUserIds = [...new Set(ticketsData.map(t => t.user_id))];
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, username, email')
        .in('id', uniqueUserIds);

      if (usersError) {
        console.warn('Error fetching users:', usersError);
      }

      // Create a map of user_id to user data
      const usersMap = new Map<string, { id: string; username: string; email: string }>();
      usersData?.forEach((user: any) => {
        usersMap.set(user.id, user);
      });

      // Fetch booking data for tickets that have booking_id
      const bookingIds = ticketsData
        .map(t => t.booking_id)
        .filter((id): id is number => id !== null && id !== undefined);
      
      let bookingsMap = new Map<number, { id: number; event_date: string; status: string }>();
      
      if (bookingIds.length > 0) {
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select('id, event_date, status')
          .in('id', bookingIds);

        if (bookingsError) {
          console.warn('Error fetching bookings:', bookingsError);
        } else {
          bookingsData?.forEach((booking: any) => {
            bookingsMap.set(booking.id, booking);
          });
        }
      }

      // Enrich tickets with user and booking data
      const enrichedTickets: SupportTicket[] = ticketsData.map((ticket: any) => ({
        ...ticket,
        users: usersMap.get(ticket.user_id) || {
          id: ticket.user_id,
          username: 'Unknown User',
          email: 'N/A',
        },
        bookings: ticket.booking_id ? (bookingsMap.get(ticket.booking_id) || undefined) : undefined,
      }));

      console.log(`✅ Loaded ${enrichedTickets.length} support tickets with enriched data`);
      
      if (enrichedTickets.length > 0) {
        console.log('Sample ticket:', JSON.stringify(enrichedTickets[0], null, 2));
      }

      setTickets(enrichedTickets);
    } catch (error: any) {
      console.error('Error fetching tickets:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      Alert.alert('Error', error?.message || 'Failed to load tickets');
      setTickets([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  const updateTicketStatus = async (ticketId: number, newStatus: string) => {
    try {
      // Update ticket status in database
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) {
        throw error;
      }

      // Update local state
      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId 
          ? { ...ticket, status: newStatus as any, updated_at: new Date().toISOString() }
          : ticket
      ));
      
      Alert.alert('Success', `Ticket status updated to ${newStatus}`);
    } catch (error: any) {
      console.error('Error updating ticket:', error);
      Alert.alert('Error', error?.message || 'Failed to update ticket');
    }
  };

  const handleViewTicketDetails = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setDetailModalVisible(true);
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesStatus = filter === 'All' || ticket.status === filter;
    const matchesSearch = !searchQuery.trim()
      ? true
      : ticket.subject.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        ticket.users?.username.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        ticket.users?.email.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RESOLVED': return COLORS.success;
      case 'CLOSED': return COLORS.textLight;
      case 'IN_PROGRESS': return COLORS.info;
      case 'OPEN': return COLORS.warning;
      default: return COLORS.textLight;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'RESOLVED': return COLORS.success + '15';
      case 'CLOSED': return COLORS.textLight + '15';
      case 'IN_PROGRESS': return COLORS.info + '15';
      case 'OPEN': return COLORS.warning + '15';
      default: return COLORS.bg;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return COLORS.danger;
      case 'HIGH': return COLORS.warning;
      case 'MEDIUM': return COLORS.info;
      case 'LOW': return COLORS.textLight;
      default: return COLORS.textLight;
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
        <Text style={styles.loadingText}>Loading tickets...</Text>
      </View>
    );
  }

  const openCount = tickets.filter(t => t.status === 'OPEN').length;
  const inProgressCount = tickets.filter(t => t.status === 'IN_PROGRESS').length;
  const resolvedCount = tickets.filter(t => t.status === 'RESOLVED').length;
  const urgentCount = tickets.filter(t => t.priority === 'URGENT').length;

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>Support Tickets</Text>
      
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Tickets</Text>
          <Text style={[styles.statValue, { color: COLORS.text }]}>{tickets.length}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Open</Text>
          <Text style={[styles.statValue, { color: COLORS.warning }]}>{openCount}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>In Progress</Text>
          <Text style={[styles.statValue, { color: COLORS.info }]}>{inProgressCount}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Resolved</Text>
          <Text style={[styles.statValue, { color: COLORS.success }]}>{resolvedCount}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Urgent</Text>
          <Text style={[styles.statValue, { color: COLORS.danger }]}>{urgentCount}</Text>
        </View>
      </View>

      <View style={styles.toolbar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by subject, customer, or email"
          placeholderTextColor={COLORS.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <View style={styles.filterGroup}>
          {(['All', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map((filterOption) => (
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
            <Text style={[styles.headerCell, styles.colSubject]}>Subject</Text>
            <Text style={[styles.headerCell, styles.colPriority]}>Priority</Text>
            <Text style={[styles.headerCell, styles.colStatus]}>Status</Text>
            <Text style={[styles.headerCell, styles.colDate]}>Created</Text>
            <Text style={[styles.headerCell, styles.colActions]}>Actions</Text>
          </View>

          {filteredTickets.length === 0 ? (
            <View style={styles.emptyStateRow}>
              <Text style={styles.emptyStateText}>
                {searchQuery.trim()
                  ? 'No matches found'
                  : filter === 'All'
                    ? 'No tickets found'
                    : `No ${filter.toLowerCase()} tickets`}
              </Text>
            </View>
          ) : (
            filteredTickets.map((ticket) => (
              <View key={ticket.id} style={styles.tableRow}>
                <Text style={[styles.cellText, styles.colId]}>#{ticket.id}</Text>
                <View style={[styles.cell, styles.colCustomer]}>
                  <Text style={styles.cellTextBold} numberOfLines={1}>
                    {ticket.users?.username || 'Unknown'}
                  </Text>
                  <Text style={styles.cellTextSmall} numberOfLines={1}>
                    {ticket.users?.email || 'N/A'}
                  </Text>
                </View>
                <View style={[styles.cell, styles.colSubject]}>
                  <Text style={styles.cellTextBold} numberOfLines={2}>
                    {ticket.subject}
                  </Text>
                  {ticket.booking_id && (
                    <Text style={styles.cellTextSmall}>
                      Booking #{ticket.booking_id}
                    </Text>
                  )}
                </View>
                <View style={[styles.cell, styles.colPriority]}>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(ticket.priority) + '15' }]}>
                    <Text style={[styles.priorityText, { color: getPriorityColor(ticket.priority) }]}>
                      {ticket.priority}
                    </Text>
                  </View>
                </View>
                <View style={[styles.cell, styles.colStatus]}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusBg(ticket.status) }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(ticket.status) }]}>
                      {ticket.status}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.cellText, styles.colDate]} numberOfLines={2}>
                  {formatDate(ticket.created_at)}
                </Text>
                <View style={[styles.cell, styles.colActions]}>
                  <View style={styles.actionButtons}>
                    <Pressable
                      style={[styles.actionButton, styles.viewButton]}
                      onPress={() => handleViewTicketDetails(ticket)}
                    >
                      <Text style={styles.actionButtonText}>👁</Text>
                    </Pressable>
                    {ticket.status === 'OPEN' && (
                      <Pressable
                        style={[styles.actionButton, styles.progressButton]}
                        onPress={() => updateTicketStatus(ticket.id, 'IN_PROGRESS')}
                      >
                        <Text style={styles.actionButtonText}>▶</Text>
                      </Pressable>
                    )}
                    {(ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS') && (
                      <Pressable
                        style={[styles.actionButton, styles.resolveButton]}
                        onPress={() => updateTicketStatus(ticket.id, 'RESOLVED')}
                      >
                        <Text style={styles.actionButtonText}>✓</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Ticket Details Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ticket Details</Text>
              <Pressable onPress={() => setDetailModalVisible(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>

            {selectedTicket && (
              <ScrollView style={styles.modalScrollContent}>
                {/* Ticket Info */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Ticket Information</Text>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Ticket ID:</Text>
                    <Text style={styles.modalDetailValue}>#{selectedTicket.id}</Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Subject:</Text>
                    <Text style={styles.modalDetailValue}>{selectedTicket.subject}</Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Status:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusBg(selectedTicket.status) }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(selectedTicket.status) }]}>
                        {selectedTicket.status}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Priority:</Text>
                    <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(selectedTicket.priority) + '15' }]}>
                      <Text style={[styles.priorityText, { color: getPriorityColor(selectedTicket.priority) }]}>
                        {selectedTicket.priority}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Customer Info */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Customer Information</Text>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Name:</Text>
                    <Text style={styles.modalDetailValue}>{selectedTicket.users?.username || 'Unknown'}</Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Email:</Text>
                    <Text style={styles.modalDetailValue}>{selectedTicket.users?.email || 'N/A'}</Text>
                  </View>
                </View>

                {/* Booking Info */}
                {selectedTicket.booking_id && selectedTicket.bookings && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Related Booking</Text>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Booking ID:</Text>
                      <Text style={styles.modalDetailValue}>#{selectedTicket.booking_id}</Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Event Date:</Text>
                      <Text style={styles.modalDetailValue}>{formatDate(selectedTicket.bookings.event_date)}</Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Booking Status:</Text>
                      <Text style={styles.modalDetailValue}>{selectedTicket.bookings.status}</Text>
                    </View>
                  </View>
                )}

                {/* Description */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Description</Text>
                  <Text style={styles.modalDescriptionText}>{selectedTicket.description}</Text>
                </View>

                {/* Timestamps */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Timestamps</Text>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Created:</Text>
                    <Text style={styles.modalDetailValue}>{formatDate(selectedTicket.created_at)}</Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Last Updated:</Text>
                    <Text style={styles.modalDetailValue}>{formatDate(selectedTicket.updated_at)}</Text>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
    color: COLORS.text,
    marginBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight,
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
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.text,
  },
  toolbar: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.white,
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
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  table: {
    minWidth: 800,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  headerCell: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  cell: {
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 14,
    color: COLORS.text,
  },
  cellTextBold: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  cellTextSmall: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  colId: { width: 60 },
  colCustomer: { width: 150 },
  colSubject: { width: 200 },
  colPriority: { width: 100 },
  colStatus: { width: 120 },
  colDate: { width: 120 },
  colActions: { width: 120 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  emptyStateRow: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewButton: {
    backgroundColor: COLORS.textLight,
  },
  progressButton: {
    backgroundColor: COLORS.info,
  },
  resolveButton: {
    backgroundColor: COLORS.success,
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 12,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: COLORS.text,
    fontWeight: '600',
  },
  modalScrollContent: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  modalDetailRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  modalDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    width: 120,
  },
  modalDetailValue: {
    fontSize: 14,
    color: COLORS.textLight,
    flex: 1,
  },
  modalDescriptionText: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
    padding: 12,
    backgroundColor: COLORS.bg,
    borderRadius: 8,
  },
});
