import { Platform } from 'react-native';

/**
 * Platform detection utilities
 * Centralized platform checks for web vs mobile
 */

export const isWeb = Platform.OS === 'web';
export const isMobile = !isWeb;
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

/**
 * Platform-aware component wrapper helper
 * Use this to conditionally render components based on platform
 */
export const PlatformSelect = {
  web: <T,>(webComponent: T): T | null => (isWeb ? webComponent : null),
  mobile: <T,>(mobileComponent: T): T | null => (isMobile ? mobileComponent : null),
};

