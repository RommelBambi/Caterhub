import React from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { COLORS } from '../../constants/colors';

interface LogoProps {
  size?: number;
  showText?: boolean;
  color?: string;
  backgroundColor?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 28,
  showText = true,
  color = COLORS.primary,
  backgroundColor = '#fff',
}) => {
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.icon,
          {
            width: size,
            height: size,
            backgroundColor,
            borderRadius: 6,
          },
        ]}
      >
        <Text
          style={[
            styles.iconText,
            {
              color,
              fontSize: size * 0.5,
            },
          ]}
        >
          CH
        </Text>
      </View>
      {showText && (
        <Text style={styles.text}>CaterHub</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontWeight: '900',
  },
  text: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 20,
    letterSpacing: 0.3,
  },
});

