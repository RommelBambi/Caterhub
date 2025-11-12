import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
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
    
    // Check if payment is complete (success URLs)
    if (
      url.includes('xendit-redirect') && url.includes('status=success') ||
      url.includes('payment/success') ||
      url.includes('success') && (url.includes('xendit') || url.includes('supabase'))
    ) {
      console.log('[PaymentWebView] Payment success detected');
      onPaymentComplete();
      return;
    }

    // Check if payment failed
    if (
      url.includes('xendit-redirect') && url.includes('status=failed') ||
      url.includes('payment/failed') ||
      url.includes('failed') && (url.includes('xendit') || url.includes('supabase'))
    ) {
      console.log('[PaymentWebView] Payment failed detected');
      onPaymentFailed();
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
            // Allow navigation to external apps (for payment providers)
            onShouldStartLoadWithRequest={(request) => {
              const url = request.url.toLowerCase();
              
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

