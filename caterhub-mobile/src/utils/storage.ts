import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const isWeb = Platform.OS === 'web';

/**
 * Platform-aware storage utilities
 * Automatically uses localStorage on web, SecureStore on mobile
 */
export const storage = {
  /**
   * Store a value with the given key
   */
  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },

  /**
   * Get a value by key
   */
  async getItem(key: string): Promise<string | null> {
    if (isWeb) {
      return localStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  },

  /**
   * Remove a value by key
   */
  async removeItem(key: string): Promise<void> {
    if (isWeb) {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

