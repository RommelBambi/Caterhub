import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { COLORS } from '../../constants/colors';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'solid' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  full?: boolean;
  danger?: boolean;
  disabled?: boolean;
  invert?: boolean;
  shape?: 'pill' | 'square' | 'rounded';
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'solid',
  size = 'md',
  full,
  danger,
  disabled,
  invert,
  shape = 'pill',
}) => {
  const solidBg = danger ? COLORS.danger : COLORS.primary;
  const textC =
    variant === 'solid'
      ? invert
        ? COLORS.primary
        : COLORS.white
      : invert
        ? COLORS.white
        : danger
          ? COLORS.danger
          : COLORS.text;
  const borderC =
    variant === 'outline'
      ? invert
        ? '#ffffff66'
        : danger
          ? COLORS.danger
          : COLORS.border
      : 'transparent';

  const getBorderRadius = () => {
    if (shape === 'square') return 8;
    if (shape === 'rounded') return 14;
    return 999; // pill
  };

  const containerStyle: ViewStyle = {
    opacity: disabled ? 0.5 : 1,
    paddingVertical: size === 'sm' ? 8 : size === 'lg' ? 14 : 10,
    paddingHorizontal: size === 'sm' ? 14 : size === 'lg' ? 20 : 16,
    borderRadius: getBorderRadius(),
    backgroundColor: variant === 'solid' ? solidBg : 'transparent',
    borderWidth: variant === 'outline' ? 1 : 0,
    borderColor: borderC,
    width: full ? '100%' : 'auto',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const textStyle: TextStyle = {
    color: textC,
    fontWeight: '800',
    letterSpacing: 0.2,
    fontSize: 14,
  };

  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={containerStyle}
      activeOpacity={0.8}
    >
      <Text style={textStyle}>{label}</Text>
    </TouchableOpacity>
  );
};

