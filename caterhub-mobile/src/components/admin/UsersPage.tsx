import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, RefreshControl, TextInput, TouchableOpacity, Platform } from 'react-native';
import { supabase } from '../../services/supabase';
import UserEditModal from './UserEditModal';
import DeleteConfirmModal from './DeleteConfirmModal';

interface User {
  id: string;
  email: string;
  username: string;
  role: 'CUSTOMER' | 'CATER' | 'ADMIN' | 'CUSTOM';
  location?: string | null;
  created_at: string;
  updated_at: string;
}

const COLORS_ADMIN = {
  primary: "#C836F9",
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
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchUsers();
    }
  }, [refreshTrigger]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const filteredUsers = users.filter(user => {
    // Filter by role
    const roleMatch = filter === 'All' || user.role === filter;
    
    // Filter by search query (search in username, email)
    const searchMatch = !searchQuery || 
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    return roleMatch && searchMatch;
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

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username or email..."
          placeholderTextColor={COLORS_ADMIN.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filters */}
      <View style={styles.filters}>
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
              {filterOption === 'All' ? 'All' : formatRole(filterOption)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Users List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredUsers.length === 0 ? (
          <View style={styles.emptyState}>
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
            <View key={user.id} style={styles.userCard}>
              <View style={styles.userHeader}>
                <View style={styles.userInfo}>
                  <Text style={styles.username}>{user.username}</Text>
                  <Text style={styles.email}>{user.email}</Text>
                </View>
                <View style={[styles.roleBadge, { backgroundColor: getRoleBg(user.role) }]}>
                  <Text style={[styles.roleText, { color: getRoleColor(user.role) }]}>
                    {formatRole(user.role)}
                  </Text>
                </View>
              </View>

              <View style={styles.userDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>User ID:</Text>
                  <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="middle">
                    {user.id}
                  </Text>
                </View>
                {user.location && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Location:</Text>
                    <Text style={styles.detailValue}>{user.location}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Joined:</Text>
                  <Text style={styles.detailValue}>{formatDate(user.created_at)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Last Updated:</Text>
                  <Text style={styles.detailValue}>{formatDate(user.updated_at)}</Text>
                </View>
              </View>

              <View style={styles.userActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => handleEdit(user)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteClick(user.id, user.username)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
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
  searchContainer: {
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: COLORS_ADMIN.white,
    borderWidth: 1,
    borderColor: COLORS_ADMIN.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS_ADMIN.text,
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
  listContent: {
    paddingBottom: 20,
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    color: COLORS_ADMIN.textLight,
    fontSize: 16,
  },
  userCard: {
    backgroundColor: COLORS_ADMIN.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS_ADMIN.border,
    padding: 20,
    marginBottom: 16,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userInfo: {
    flex: 1,
    marginRight: 12,
  },
  username: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS_ADMIN.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: COLORS_ADMIN.textLight,
  },
  roleBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  userDetails: {
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
    width: 120,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS_ADMIN.textLight,
    flex: 1,
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS_ADMIN.border,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    cursor: 'pointer',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  editButton: {
    backgroundColor: COLORS_ADMIN.primary,
  },
  editButtonText: {
    color: COLORS_ADMIN.white,
    fontWeight: '600',
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: COLORS_ADMIN.danger,
  },
  deleteButtonText: {
    color: COLORS_ADMIN.white,
    fontWeight: '600',
    fontSize: 14,
  },
});

