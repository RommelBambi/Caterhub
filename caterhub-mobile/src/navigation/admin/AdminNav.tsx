import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminDashboardScreen from '../../screens/admin/AdminDashboardScreen';
import { useAuth } from '../../store/auth';

export type AdminStackParamList = {
  AdminDashboard: undefined;
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

export default function AdminNav() {
  const { user } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
      />
    </Stack.Navigator>
  );
}

