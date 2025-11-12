import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/store/auth';
import RootNav from './src/navigation/RootNav';
import { Linking } from 'react-native';
import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    // Handle deep links when app is already open
    const handleDeepLink = (url: string) => {
      console.log('Deep link received:', url);
      
      if (url.includes('/payment/')) {
        const urlObj = new URL(url.replace('caterhub://', 'https://caterhub.com/'));
        const status = url.includes('/payment/success') ? 'success' : 'failed';
        const bookingId = urlObj.searchParams.get('bookingId');
        
        console.log('Payment redirect:', { status, bookingId });
        
        // Show native success/failure message
        if (status === 'success') {
          console.log('Payment successful for booking:', bookingId);
          // Show success alert/toast
          alert('🎉 Payment Successful!\n\nYour booking has been confirmed. Check your bookings for details.');
          // TODO: Navigate to booking success screen or refresh bookings list
        } else {
          console.log('Payment failed for booking:', bookingId);
          // Show failure alert/toast
          alert('❌ Payment Failed\n\nYour payment could not be processed. No charges were made. Please try again.');
          // TODO: Navigate back to payment screen or booking details
        }
      }
    };

    // Listen for deep links
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Handle deep link if app was opened from a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => subscription?.remove();
  }, []);

  const linking = {
    prefixes: ['caterhub://', 'exp://127.0.0.1:19000/--/'],
    config: {
      screens: {
        // Define your screen mapping here if needed
        payment: 'payment/:status',
      },
    },
  };

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <AuthProvider>
          <NavigationContainer linking={linking}>
            <RootNav/>
          </NavigationContainer>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
