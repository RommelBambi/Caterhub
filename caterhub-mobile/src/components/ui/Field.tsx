import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextStyle, ViewStyle, Platform } from 'react-native';
import { COLORS } from '../../constants/colors';

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad' | 'url';
  multiline?: boolean;
  secureTextEntry?: boolean;
}

export const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={styles.label}>{children}</Text>
);

export const Field: React.FC<FieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline,
  secureTextEntry,
}) => {
  const [focused, setFocused] = useState(false);

  const inputStyle: TextStyle = {
    borderWidth: 1.5,
    borderColor: focused ? COLORS.primary : COLORS.border,
    backgroundColor: COLORS.white,
    color: COLORS.text,
    borderRadius: Platform.OS === 'web' ? 12 : 10,
    paddingVertical: multiline ? (Platform.OS === 'web' ? 12 : 10) : (Platform.OS === 'web' ? 10 : 8),
    paddingHorizontal: Platform.OS === 'web' ? 14 : 12,
    minHeight: multiline ? (Platform.OS === 'web' ? 92 : 80) : undefined,
    fontSize: Platform.OS === 'web' ? 14 : 15,
    width: '100%',
  };

  return (
    <View style={styles.container}>
      <Label>{label}</Label>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textLight}
        keyboardType={keyboardType}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={inputStyle}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Platform.OS === 'web' ? 12 : 10,
  },
  label: {
    fontSize: Platform.OS === 'web' ? 12 : 13,
    color: COLORS.textLight,
    marginBottom: Platform.OS === 'web' ? 6 : 5,
    fontWeight: '600',
  },
});

