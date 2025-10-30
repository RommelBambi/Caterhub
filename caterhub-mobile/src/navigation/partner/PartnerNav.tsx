import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PartnerHomeScreen from '../../screens/partner/PartnerHomeScreen';
import PartnerDashboardScreen from '../../screens/partner/PartnerDashboardScreen';
import PartnerOrdersScreen from '../../screens/partner/PartnerOrdersScreen';
import PartnerOrderDetailsScreen from '../../screens/partner/PartnerOrderDetailsScreen';
import PartnerManagePackagesScreen from '../../screens/partner/PartnerManagePackagesScreen';
import PartnerSettingsScreen from '../../screens/partner/PartnerSettingsScreen';
import PartnerLoginModal from '../../screens/partner/PartnerLoginModal';
import PartnerSignupModal from '../../screens/partner/PartnerSignupModal';

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

