import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PartnerHomeScreen from '../../screens/caterer/PartnerHomeScreen';
import PartnerDashboardScreen from '../../screens/caterer/PartnerDashboardScreen';
import PartnerOrdersScreen from '../../screens/caterer/PartnerOrdersScreen';
import PartnerOrderDetailsScreen from '../../screens/caterer/PartnerOrderDetailsScreen';
import PartnerManagePackagesScreen from '../../screens/caterer/PartnerManagePackagesScreen';
import PartnerSettingsScreen from '../../screens/caterer/PartnerSettingsScreen';
import PartnerLoginModal from '../../screens/caterer/PartnerLoginModal';
import PartnerSignupModal from '../../screens/caterer/PartnerSignupModal';

export type PartnerStackParamList = {
  PartnerHome: undefined;
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
  PartnerManagePackages: undefined;
  PartnerSettings: undefined;
  PartnerLoginModal: undefined;
  PartnerSignupModal: undefined;
};

const Stack = createNativeStackNavigator<PartnerStackParamList>();

export default function PartnerNav() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="PartnerHome"
        component={PartnerHomeScreen}
        options={{ headerShown: false }}
      />
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
      <Stack.Screen
        name="PartnerManagePackages"
        component={PartnerManagePackagesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PartnerSettings"
        component={PartnerSettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PartnerLoginModal"
        component={PartnerLoginModal}
        options={{ presentation: "modal", headerShown: false }}
      />
      <Stack.Screen
        name="PartnerSignupModal"
        component={PartnerSignupModal}
        options={{ presentation: "modal", headerShown: false }}
      />
    </Stack.Navigator>
  );
}

