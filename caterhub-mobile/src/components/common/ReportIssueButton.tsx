import React, { useState } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ReportIssueModal from './ReportIssueModal';

const COLORS = {
  primary: "#FF8000",
  text: "#111827",
  textLight: "#6b7280",
  bg: "#f9fafb",
  white: "#ffffff",
  border: "#e5e7eb",
  hover: "#f3f4f6",
  success: "#22c55e",
  danger: "#ef4444",
  info: "#0ea5e9",
  warning: "#f59e0b",
};

interface ReportIssueButtonProps {
  bookingId?: number;
  style?: any;
  textStyle?: any;
  variant?: 'button' | 'text' | 'icon';
  size?: 'small' | 'medium' | 'large';
  onSuccess?: () => void;
}

export default function ReportIssueButton({ 
  bookingId, 
  style, 
  textStyle,
  variant = 'button',
  size = 'medium',
  onSuccess 
}: ReportIssueButtonProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          padding: 8,
          fontSize: 12,
          iconSize: 16,
        };
      case 'large':
        return {
          padding: 16,
          fontSize: 18,
          iconSize: 24,
        };
      default: // medium
        return {
          padding: 12,
          fontSize: 14,
          iconSize: 20,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  const renderButton = () => {
    switch (variant) {
      case 'text':
        return (
          <Pressable
            style={[styles.textButton, style]}
            onPress={() => setModalVisible(true)}
          >
            <Text style={[styles.textButtonText, { fontSize: sizeStyles.fontSize }, textStyle]}>
              Report an Issue
            </Text>
          </Pressable>
        );
      
      case 'icon':
        return (
          <Pressable
            style={[styles.iconButton, { padding: sizeStyles.padding }, style]}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons 
              name="flag-outline" 
              size={sizeStyles.iconSize} 
              color={COLORS.textLight} 
            />
          </Pressable>
        );
      
      default: // button
        return (
          <Pressable
            style={[styles.button, { padding: sizeStyles.padding }, style]}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons 
              name="flag-outline" 
              size={sizeStyles.iconSize} 
              color={COLORS.textLight} 
            />
            <Text style={[styles.buttonText, { fontSize: sizeStyles.fontSize }, textStyle]}>
              Report an Issue
            </Text>
          </Pressable>
        );
    }
  };

  return (
    <>
      {renderButton()}
      
      <ReportIssueModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        bookingId={bookingId}
        onSuccess={() => {
          setModalVisible(false);
          onSuccess?.();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    justifyContent: 'center',
  },
  buttonText: {
    color: COLORS.textLight,
    fontWeight: '500',
  },
  textButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  textButtonText: {
    color: COLORS.textLight,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  iconButton: {
    borderRadius: 20,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
