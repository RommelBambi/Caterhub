// src/components/navigation/MainTabs.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from '../../screens/customer/HomeScreen';
import ServiceDetails from '../../screens/customer/ServiceDetails';
import CustomizePackage from '../../screens/customer/CustomizePackage';
import BookingForm from '../../screens/customer/BookingForm';
import BookingsList from '../../screens/customer/BookingsList';
import BookingDetails from '../../screens/customer/BookingDetails';
import AccountScreen from '../../screens/customer/AccountScreen';
import FavoritesScreen from '../../screens/customer/FavoritesScreen';
import PaymentScreen from '../../screens/customer/PaymentScreen';
import PaymentPendingScreen from '../../screens/customer/PaymentPendingScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="ServiceDetails" component={ServiceDetails} />
      <Stack.Screen name="CustomizePackage" component={CustomizePackage} />
      <Stack.Screen name="BookingForm" component={BookingForm} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="PaymentPending" component={PaymentPendingScreen} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
    </Stack.Navigator>
  );
}

function FavoritesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FavoritesScreen" component={FavoritesScreen} />
      <Stack.Screen name="ServiceDetails" component={ServiceDetails} />
      <Stack.Screen name="CustomizePackage" component={CustomizePackage} />
      <Stack.Screen name="BookingForm" component={BookingForm} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
    </Stack.Navigator>
  );
}

function BookingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BookingsList" component={BookingsList} />
      <Stack.Screen name="BookingDetails" component={BookingDetails} />
      <Stack.Screen name="ServiceDetails" component={ServiceDetails} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
    </Stack.Navigator>
  );
}

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#FF8000',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { 
          height: 58 + insets.bottom, 
          paddingBottom: insets.bottom + 8, 
          paddingTop: 6 
        },
        tabBarIcon: ({ focused, color, size }) => {
          const iconName =
            route.name === 'Home'
              ? focused
                ? 'home'
                : 'home-outline'
              : route.name === 'Favorites'
              ? focused
                ? 'heart'
                : 'heart-outline'
              : route.name === 'Bookings'
              ? focused
                ? 'calendar'
                : 'calendar-outline'
              : focused
              ? 'person'
              : 'person-outline';
          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Favorites" component={FavoritesStack} />
      <Tab.Screen name="Bookings" component={BookingsStack} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}
