import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

interface ContainerProps {
  children: React.ReactNode;
}

export const Container: React.FC<ContainerProps> = ({ children }) => {
  return <View style={styles.container}>{children}</View>;
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 980,
    marginHorizontal: 'auto',
    alignSelf: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 24 : 16,
  },
});

