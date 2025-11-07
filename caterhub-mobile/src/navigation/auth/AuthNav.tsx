import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../../screens/auth/LoginScreen';
import RegisterScreen from '../../screens/auth/RegisterScreen';
import LandingScreen from '../../screens/home/LandingScreen';
import PartnerApplicationScreen from '../../screens/auth/PartnerApplicationScreen';
import { isWeb } from '../../utils/platform';

const Stack = createNativeStackNavigator();

export default function AuthNav(){
  // On web, start with landing page. On mobile, start with login.
  const initialRouteName = isWeb ? 'Landing' : 'Login';

  return (
    <Stack.Navigator initialRouteName={initialRouteName}>
      {isWeb && (
        <Stack.Screen 
          name="Landing" 
          component={LandingScreen} 
          options={{ headerShown: false }}
        />
      )}
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }}/>
      <Stack.Screen name="Register" component={RegisterScreen} options={{headerShown: false}}/>
      <Stack.Screen 
        name="PartnerApplication" 
        component={PartnerApplicationScreen} 
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
