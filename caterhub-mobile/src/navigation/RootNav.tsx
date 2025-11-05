import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthNav from './auth/AuthNav';
import MainTabs from './customer/MainTabs';
import PartnerNav from './caterer/PartnerNav';
import AdminNav from './admin/AdminNav';
import { useAuth } from '../store/auth';
import { isWeb } from '../utils/platform';

const Stack = createNativeStackNavigator();

// Screen to show when customer tries to access on web
function WebCustomerBlockScreen() {
  const { logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Customer App - Mobile Only</Text>
      <Text style={styles.message}>
        The customer app is only available on mobile devices. Please use the mobile app or log in with a partner account.
      </Text>
      <TouchableOpacity
        onPress={logout}
        style={styles.logoutButton}
      >
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function RootNav() {
  const { token, user } = useAuth();
  
  if (!token) {
    return <AuthNav />;
  }
  
  // Web: Route based on user role
  if (isWeb) {
    if (user?.role === 'ADMIN') {
      return <AdminNav />;
    }
    if (user?.role === 'CATER') {
      return <PartnerNav />;
    }
    // Customer trying to access on web - show message
    return <WebCustomerBlockScreen />;
  }
  
  // Mobile: Route based on user role
  if (user?.role === 'CATER') {
    return <PartnerNav />;
  }
  
  // Mobile: Default to customer app
  return <MainTabs />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    color: '#1f2937',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    color: '#6b7280',
    lineHeight: 24,
    marginBottom: 24,
  },
  logoutButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#FF8000',
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
