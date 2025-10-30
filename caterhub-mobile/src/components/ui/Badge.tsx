import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';

interface BadgeProps {
  tone: 'info' | 'success' | 'warn' | 'danger';
  text: string;
}

export const Badge: React.FC<BadgeProps> = ({ tone, text }) => {
  const colorMap = {
    info: COLORS.info,
    success: COLORS.success,
    warn: COLORS.warn,
    danger: COLORS.danger,
  } as const;

  const color = colorMap[tone];

  return (
    <View
      style={[
        styles.badge,
        {
          borderColor: `${color}66`,
          backgroundColor: `${color}1A`,
        },
      ]}
    >
      <Text style={styles.text}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 12,
  },
});

