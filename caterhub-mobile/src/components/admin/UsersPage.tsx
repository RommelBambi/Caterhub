import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, RefreshControl, TextInput, Modal } from 'react-native';
import { supabase } from '../../services/supabase';
import UserEditModal from './UserEditModal';
import DeleteConfirmModal from './DeleteConfirmModal';

interface User {
  id: string;
  email: string;
  username: string;
  role: 'CUSTOMER' | 'CATER' | 'ADMIN' | 'CUSTOM';
  location?: string | null;
  suspended?: boolean;
  suspension_reason?: string | null;
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

interface UsersPageProps {
  refreshTrigger?: number;
}

export default function UsersPage({ refreshTrigger }: UsersPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'All' | 'CUSTOMER' | 'CATER' | 'ADMIN'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; username: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [suspensionModalVisible, setSuspensionModalVisible] = useState(false);
  const [userToSuspend, setUserToSuspend] = useState<User | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [suspending, setSuspending] = useState(false);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        Alert.alert('Error', 'Failed to load users');
        return;
      }

      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', error?.message || 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [refreshTrigger]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const filteredUsers = users.filter((user) => {
    const matchesRole = filter === 'All' || user.role === filter;
    const matchesSearch = !searchQuery.trim()
      ? true
      : user.username.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchesRole && matchesSearch;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return COLORS_ADMIN.danger;
      case 'CATER': return COLORS_ADMIN.primary;
      case 'CUSTOMER': return COLORS_ADMIN.info;
      default: return COLORS_ADMIN.textLight;
    }
  };

  const getRoleBg = (role: string) => {
    switch (role) {
      case 'ADMIN': return COLORS_ADMIN.danger + '15';
      case 'CATER': return COLORS_ADMIN.primary + '15';
      case 'CUSTOMER': return COLORS_ADMIN.info + '15';
      default: return COLORS_ADMIN.bg;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatRole = (role: string) => {
    switch (role) {
      case 'CUSTOMER': return 'Customer';
      case 'CATER': return 'Caterer';
      case 'ADMIN': return 'Admin';
      default: return role;
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditModalVisible(true);
  };

  const handleDeleteClick = (userId: string, username: string) => {
    setUserToDelete({ id: userId, username });
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userToDelete.id);

      if (error) {
        throw error;
      }

      Alert.alert('Success', 'User deleted successfully');
      setDeleteModalVisible(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      Alert.alert('Error', error?.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalVisible(false);
    setUserToDelete(null);
  };

  const handleSuspendClick = (user: User) => {
    setUserToSuspend(user);
    setSuspensionReason('');
    setSuspensionModalVisible(true);
  };

  const handleUnsuspendClick = async (user: User) => {
    Alert.alert(
      'Unsuspend User',
      `Are you sure you want to unsuspend "${user.username}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unsuspend',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('users')
                .update({
                  suspended: false,
                  suspension_reason: null,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

              if (error) throw error;

              Alert.alert('Success', 'User unsuspended successfully');
              fetchUsers();
            } catch (error: any) {
              console.error('Error unsuspending user:', error);
              Alert.alert('Error', error?.message || 'Failed to unsuspend user');
            }
          }
        }
      ]
    );
  };

  const handleConfirmSuspension = async () => {
    if (!userToSuspend || !suspensionReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for suspension');
      return;
    }

    setSuspending(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          suspended: true,
          suspension_reason: suspensionReason.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userToSuspend.id);

      if (error) throw error;

      Alert.alert('Success', 'User suspended successfully');
      setSuspensionModalVisible(false);
      setUserToSuspend(null);
      setSuspensionReason('');
      fetchUsers();
    } catch (error: any) {
      console.error('Error suspending user:', error);
      Alert.alert('Error', error?.message || 'Failed to suspend user');
    } finally {
      setSuspending(false);
    }
  };

  const handleCancelSuspension = () => {
    setSuspensionModalVisible(false);
    setUserToSuspend(null);
    setSuspensionReason('');
  };

  const handleSaveUser = async (
    userId: string,
    updates: { username?: string; email?: string; role?: string; location?: string | null }
  ) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      // Refresh the users list
      await fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS_ADMIN.primary} />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  const customerCount = users.filter(u => u.role === 'CUSTOMER').length;
  const caterCount = users.filter(u => u.role === 'CATER').length;
  const adminCount = users.filter(u => u.role === 'ADMIN').length;

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>User Management</Text>
      
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Users</Text>
          <Text style={[styles.statValue, { color: COLORS_ADMIN.text }]}>{users.length}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Customers</Text>
          <Text style={[styles.statValue, { color: COLORS_ADMIN.info }]}>{customerCount}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Caterers</Text>
          <Text style={[styles.statValue, { color: COLORS_ADMIN.primary }]}>{caterCount}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Admins</Text>
          <Text style={[styles.statValue, { color: COLORS_ADMIN.danger }]}>{adminCount}</Text>
        </View>
      </View>

      <View style={styles.toolbar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users"
          placeholderTextColor={COLORS_ADMIN.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <View style={styles.filterGroup}>
          {(['All', 'CUSTOMER', 'CATER', 'ADMIN'] as const).map((filterOption) => (
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
                {filterOption === 'All' ? 'All Users' : formatRole(filterOption)}
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
            <Text style={[styles.headerCell, styles.colName]}>Name</Text>
            <Text style={[styles.headerCell, styles.colEmail]}>Email</Text>
            <Text style={[styles.headerCell, styles.colRole]}>Role</Text>
            <Text style={[styles.headerCell, styles.colStatus]}>Status</Text>
            <Text style={[styles.headerCell, styles.colJoined]}>Joined</Text>
            <Text style={[styles.headerCell, styles.colActions]}>Actions</Text>
          </View>

          {filteredUsers.length === 0 ? (
            <View style={styles.emptyStateRow}>
              <Text style={styles.emptyStateText}>
                {searchQuery
                  ? `No users found matching "${searchQuery}"`
                  : filter === 'All'
                    ? 'No users found'
                    : `No ${formatRole(filter).toLowerCase()}s found`}
              </Text>
            </View>
          ) : (
            filteredUsers.map((user) => (
              <View key={user.id} style={[styles.tableRow, user.suspended && styles.suspendedRow]}>
                <Text style={[styles.cellText, styles.colName]} numberOfLines={1}>{user.username}</Text>
                <Text style={[styles.cellText, styles.colEmail]} numberOfLines={1}>{user.email}</Text>
                <View style={[styles.cell, styles.colRole]}>
                  <View style={[styles.roleBadge, { backgroundColor: getRoleBg(user.role) }]}>
                    <Text style={[styles.roleBadgeText, { color: getRoleColor(user.role) }]}>
                      {formatRole(user.role)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.cell, styles.colStatus]}>
                  <View style={[styles.statusBadge, { backgroundColor: user.suspended ? COLORS_ADMIN.danger + '15' : COLORS_ADMIN.success + '15' }]}>
                    <Text style={[styles.statusBadgeText, { color: user.suspended ? COLORS_ADMIN.danger : COLORS_ADMIN.success }]}>
                      {user.suspended ? 'Suspended' : 'Active'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.cellText, styles.colJoined]}>{formatDate(user.created_at)}</Text>
                <View style={[styles.cell, styles.colActions]}>
                  <View style={styles.actionsGroup}>
                    <Pressable
                      style={[styles.tableActionButton, styles.editAction]}
                      onPress={() => handleEdit(user)}
                      disabled={user.role === 'ADMIN'}
                    >
                      <Text style={[styles.tableActionText, user.role === 'ADMIN' && styles.disabledText]}>Edit</Text>
                    </Pressable>
                    {user.suspended ? (
                      <Pressable
                        style={[styles.tableActionButton, styles.unsuspendAction]}
                        onPress={() => handleUnsuspendClick(user)}
                      >
                        <Text style={styles.tableActionText}>Unsuspend</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        style={[styles.tableActionButton, styles.suspendAction]}
                        onPress={() => handleSuspendClick(user)}
                        disabled={user.role === 'ADMIN'}
                      >
                        <Text style={[styles.tableActionText, user.role === 'ADMIN' && styles.disabledText]}>Suspend</Text>
                      </Pressable>
                    )}
                    <Pressable
                      style={[styles.tableActionButton, styles.deleteAction]}
                      onPress={() => handleDeleteClick(user.id, user.username)}
                      disabled={user.role === 'ADMIN'}
                    >
                      <Text style={[styles.tableActionText, user.role === 'ADMIN' && styles.disabledText]}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <UserEditModal
        user={selectedUser}
        visible={editModalVisible}
        onClose={() => {
          setEditModalVisible(false);
          setSelectedUser(null);
        }}
        onSave={handleSaveUser}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        visible={deleteModalVisible}
        title="Delete User"
        message={`Are you sure you want to delete user "${userToDelete?.username}"? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        confirmText="Delete"
        cancelText="Cancel"
        loading={deleting}
      />

      {/* Suspension Modal */}
      <Modal
        visible={suspensionModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancelSuspension}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Suspend User</Text>
              <Pressable onPress={handleCancelSuspension} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalText}>
                You are about to suspend user "{userToSuspend?.username}". 
                Please provide a reason for this suspension:
              </Text>
              
              <TextInput
                style={styles.reasonInput}
                placeholder="Enter suspension reason (required)"
                placeholderTextColor={COLORS_ADMIN.textLight}
                value={suspensionReason}
                onChangeText={setSuspensionReason}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              
              <Text style={styles.warningText}>
                ⚠️ This will prevent the user from accessing their account until unsuspended.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCancelSuspension}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.suspendButton]}
                onPress={handleConfirmSuspension}
                disabled={suspending || !suspensionReason.trim()}
              >
                {suspending ? (
                  <ActivityIndicator color={COLORS_ADMIN.white} size="small" />
                ) : (
                  <Text style={styles.suspendButtonText}>Suspend User</Text>
                )}
              </Pressable>
            </View>
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
  pageTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS_ADMIN.text,
    marginBottom: 24,
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
  },
  searchInput: {
    flexGrow: 1,
    height: 40,
    borderWidth: 1,
    borderColor: COLORS_ADMIN.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: COLORS_ADMIN.text,
    backgroundColor: COLORS_ADMIN.white,
  },
  filterGroup: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
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
  tableWrapper: {
    flex: 1,
  },
  table: {
    borderWidth: 1,
    borderColor: COLORS_ADMIN.border,
    borderRadius: 12,
    backgroundColor: COLORS_ADMIN.white,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS_ADMIN.hover,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS_ADMIN.border,
  },
  headerCell: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS_ADMIN.text,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS_ADMIN.border,
    alignItems: 'center',
  },
  suspendedRow: {
    backgroundColor: COLORS_ADMIN.danger + '05',
  },
  cell: {
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 14,
    color: COLORS_ADMIN.text,
  },
  colName: { flex: 2 },
  colEmail: { flex: 3 },
  colRole: { flex: 1 },
  colStatus: { flex: 1 },
  colJoined: { flex: 1 },
  colActions: { flex: 2 },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusBadgeText: {
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
    color: COLORS_ADMIN.textLight,
    fontStyle: 'italic',
  },
  actionsGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  tableActionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableActionText: {
    color: COLORS_ADMIN.white,
    fontWeight: '600',
    fontSize: 13,
  },
  disabledText: {
    color: COLORS_ADMIN.textLight,
  },
  editAction: {
    backgroundColor: COLORS_ADMIN.primary,
  },
  suspendAction: {
    backgroundColor: COLORS_ADMIN.warning,
  },
  unsuspendAction: {
    backgroundColor: COLORS_ADMIN.success,
  },
  deleteAction: {
    backgroundColor: COLORS_ADMIN.danger,
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
    backgroundColor: COLORS_ADMIN.white,
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
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
    borderBottomColor: COLORS_ADMIN.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS_ADMIN.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS_ADMIN.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: COLORS_ADMIN.text,
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
  modalText: {
    fontSize: 16,
    color: COLORS_ADMIN.text,
    marginBottom: 16,
    lineHeight: 22,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: COLORS_ADMIN.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS_ADMIN.text,
    backgroundColor: COLORS_ADMIN.white,
    minHeight: 80,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 14,
    color: COLORS_ADMIN.warning,
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS_ADMIN.border,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS_ADMIN.bg,
    borderWidth: 1,
    borderColor: COLORS_ADMIN.border,
  },
  cancelButtonText: {
    color: COLORS_ADMIN.text,
    fontWeight: '600',
  },
  suspendButton: {
    backgroundColor: COLORS_ADMIN.danger,
  },
  suspendButtonText: {
    color: COLORS_ADMIN.white,
    fontWeight: '600',
  },
});
