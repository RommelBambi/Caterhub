import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PartnerDashboardScreen from '../../screens/caterer/PartnerDashboardScreen';
import PartnerOrdersScreen from '../../screens/caterer/PartnerOrdersScreen';
import PartnerOrderDetailsScreen from '../../screens/caterer/PartnerOrderDetailsScreen';
import { useAuth } from '../../store/auth';

export type PartnerStackParamList = {
  PartnerDashboard: undefined;
  PartnerOrders: undefined;
  PartnerOrderDetails: {
    order: {
      id: string;
      customerName: string;
      packageName: string;
      packagePrice: string;
      selectedDishes: { sectionLabel: string; chosenDish: string }[];
      venue: string;
      inclusions: string[];
      status: string;
      eventDate: string;
      totalPrice: string;
    };
  };
};

const Stack = createNativeStackNavigator<PartnerStackParamList>();

export default function PartnerNav() {
  const { token, user } = useAuth();
  
  // Caterer mobile: focus only on Revenue (Dashboard) and Incoming Orders
  const initialRouteName = 'PartnerDashboard';

  return (
    <Stack.Navigator initialRouteName={initialRouteName}>
      <Stack.Screen
        name="PartnerDashboard"
        component={PartnerDashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PartnerOrders"
        component={PartnerOrdersScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PartnerOrderDetails"
        component={PartnerOrderDetailsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

