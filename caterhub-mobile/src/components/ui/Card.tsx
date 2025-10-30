import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '../../constants/colors';

interface CardProps {
  children: React.ReactNode;
  pad?: number;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({ children, pad = 18, style }) => {
  const cardStyle: ViewStyle = {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: pad,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    ...style,
  };

  return <View style={cardStyle}>{children}</View>;
};

