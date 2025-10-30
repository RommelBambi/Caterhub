import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { COLORS } from '../../constants/colors';

interface ChipProps {
  text: string;
  active?: boolean;
  onPress?: () => void;
}

export const Chip: React.FC<ChipProps> = ({ text, active, onPress }) => {
  const chipStyle: ViewStyle = {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: active ? COLORS.primary : COLORS.border,
    backgroundColor: active ? `${COLORS.primary}10` : COLORS.white,
    marginRight: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
  };

  const textStyle: TextStyle = {
    color: active ? COLORS.primary : COLORS.textLight,
    fontWeight: '700',
    fontSize: 14,
  };

  return (
    <TouchableOpacity onPress={onPress} style={chipStyle} activeOpacity={0.8}>
      <Text style={textStyle}>{text}</Text>
    </TouchableOpacity>
  );
};

