import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthNav from './auth/AuthNav';
import MainTabs from './customer/MainTabs';
import { useAuth } from '../store/auth';
const Stack = createNativeStackNavigator();

export default function RootNav() {
  const { token } = useAuth();
  return token ? <MainTabs/> : <AuthNav/>;
}
