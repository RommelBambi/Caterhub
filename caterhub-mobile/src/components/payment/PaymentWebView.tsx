import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  primary: '#FF8000',
  text: '#1e293b',
  bg: '#f8fafc',
  white: '#ffffff',
  border: '#e2e8f0',
};

interface PaymentWebViewProps {
  visible: boolean;
  checkoutUrl: string;
  onClose: () => void;
  onPaymentComplete: () => void;
  onPaymentFailed: () => void;
}

export default function PaymentWebView({
  visible,
  checkoutUrl,
  onClose,
  onPaymentComplete,
  onPaymentFailed,
}: PaymentWebViewProps) {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);

  const handleNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
    setLoading(navState.loading);

    const url = navState.url.toLowerCase();
    console.log('[PaymentWebView] Navigation to:', url);
    
    // Check for caterhub:// deep link redirects
    if (url.includes('caterhub://payment/')) {
      if (url.includes('/success')) {
        console.log('[PaymentWebView] Payment success detected via deep link');
        Alert.alert(
          '🎉 Payment Successful!',
          'Your booking has been confirmed. Check your bookings for details.',
          [{ text: 'OK', onPress: () => {
            onPaymentComplete();
            onClose();
          }}]
        );
        return false; // Prevent navigation
      } else if (url.includes('/failed')) {
        console.log('[PaymentWebView] Payment failed detected via deep link');
        Alert.alert(
          '❌ Payment Failed',
          'Your payment could not be processed. No charges were made. Please try again.',
          [{ text: 'OK', onPress: () => {
            onPaymentFailed();
            onClose();
          }}]
        );
        return false; // Prevent navigation
      }
    }
    
    // Check if payment is complete (success URLs - fallback)
    if (
      url.includes('xendit-redirect') && url.includes('status=success') ||
      url.includes('payment/success') ||
      url.includes('success') && (url.includes('xendit') || url.includes('supabase'))
    ) {
      console.log('[PaymentWebView] Payment success detected via URL');
      Alert.alert(
        '🎉 Payment Successful!',
        'Your booking has been confirmed. Check your bookings for details.',
        [{ text: 'OK', onPress: () => {
          onPaymentComplete();
          onClose();
        }}]
      );
      return;
    }

    // Check if payment failed (fallback)
    if (
      url.includes('xendit-redirect') && url.includes('status=failed') ||
      url.includes('payment/failed') ||
      url.includes('failed') && (url.includes('xendit') || url.includes('supabase'))
    ) {
      console.log('[PaymentWebView] Payment failed detected via URL');
      Alert.alert(
        '❌ Payment Failed',
        'Your payment could not be processed. No charges were made. Please try again.',
        [{ text: 'OK', onPress: () => {
          onPaymentFailed();
          onClose();
        }}]
      );
      return;
    }
  };

  const handleGoBack = () => {
    if (webViewRef.current && canGoBack) {
      webViewRef.current.goBack();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Ionicons 
              name={canGoBack ? "arrow-back" : "close"} 
              size={24} 
              color={COLORS.text} 
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Complete Payment</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* WebView */}
        <View style={styles.webViewContainer}>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading payment page...</Text>
            </View>
          )}
          
          <WebView
            ref={webViewRef}
            source={{ uri: checkoutUrl }}
            style={styles.webView}
            onNavigationStateChange={handleNavigationStateChange}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                console.log('[PaymentWebView] Message received:', data);
                
                if (data.type === 'payment_redirect') {
                  if (data.status === 'success') {
                    Alert.alert(
                      '🎉 Payment Successful!',
                      'Your booking has been confirmed. Check your bookings for details.',
                      [{ text: 'OK', onPress: () => {
                        onPaymentComplete();
                        onClose();
                      }}]
                    );
                  } else {
                    Alert.alert(
                      '❌ Payment Failed',
                      'Your payment could not be processed. No charges were made. Please try again.',
                      [{ text: 'OK', onPress: () => {
                        onPaymentFailed();
                        onClose();
                      }}]
                    );
                  }
                }
              } catch (error) {
                console.log('[PaymentWebView] Error parsing message:', error);
              }
            }}
            // Allow navigation to external apps (for payment providers)
            onShouldStartLoadWithRequest={(request) => {
              const url = request.url.toLowerCase();
              
              // Handle caterhub:// deep links
              if (url.includes('caterhub://payment/')) {
                console.log('[PaymentWebView] Deep link detected:', url);
                if (url.includes('/success')) {
                  Alert.alert(
                    '🎉 Payment Successful!',
                    'Your booking has been confirmed. Check your bookings for details.',
                    [{ text: 'OK', onPress: () => {
                      onPaymentComplete();
                      onClose();
                    }}]
                  );
                } else if (url.includes('/failed')) {
                  Alert.alert(
                    '❌ Payment Failed',
                    'Your payment could not be processed. No charges were made. Please try again.',
                    [{ text: 'OK', onPress: () => {
                      onPaymentFailed();
                      onClose();
                    }}]
                  );
                }
                return false; // Don't navigate to deep link
              }
              
              // Allow Xendit, GCash, PayMaya, and Supabase URLs
              if (
                url.includes('xendit.co') ||
                url.includes('gcash.com') ||
                url.includes('gcash.app') ||
                url.includes('paymaya.com') ||
                url.includes('supabase.co') ||
                url.includes('checkout.xendit.co')
              ) {
                return true;
              }
              
              // Block other external URLs
              return false;
            }}
            // Inject JavaScript to handle redirects
            injectedJavaScript={`
              // Override window.location to catch redirects
              const originalLocation = window.location;
              Object.defineProperty(window, 'location', {
                get: () => originalLocation,
                set: (url) => {
                  console.log('Redirect attempt:', url);
                  if (url.includes('caterhub://payment/')) {
                    const urlObj = new URL(url.replace('caterhub://', 'https://caterhub.com/'));
                    const status = url.includes('/success') ? 'success' : 'failed';
                    const bookingId = urlObj.searchParams.get('bookingId');
                    
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'payment_redirect',
                      status: status,
                      bookingId: bookingId,
                      provider: 'xendit'
                    }));
                  } else {
                    originalLocation.href = url;
                  }
                }
              });
              
              // Also override window.location.href
              Object.defineProperty(window.location, 'href', {
                get: () => originalLocation.href,
                set: (url) => {
                  console.log('Href redirect attempt:', url);
                  if (url.includes('caterhub://payment/')) {
                    const urlObj = new URL(url.replace('caterhub://', 'https://caterhub.com/'));
                    const status = url.includes('/success') ? 'success' : 'failed';
                    const bookingId = urlObj.searchParams.get('bookingId');
                    
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'payment_redirect',
                      status: status,
                      bookingId: bookingId,
                      provider: 'xendit'
                    }));
                  } else {
                    originalLocation.href = url;
                  }
                }
              });
              
              true; // Required for injected JavaScript
            `}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.text,
  },
});

