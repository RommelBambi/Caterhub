import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { COLORS } from '../../constants/colors';

interface CardProps {
  children: React.ReactNode;
  pad?: number;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({ children, pad, style }) => {
  // Default padding: 18 for web, 16 for mobile
  const defaultPad = pad !== undefined ? pad : (Platform.OS === 'web' ? 18 : 16);
  
  const cardStyle: ViewStyle = {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: Platform.OS === 'web' ? 18 : 16,
    padding: defaultPad,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    ...style,
  };

  return <View style={cardStyle}>{children}</View>;
};

