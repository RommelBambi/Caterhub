import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextStyle, ViewStyle } from 'react-native';
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

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
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
    borderRadius: 12,
    paddingVertical: multiline ? 12 : 10,
    paddingHorizontal: 14,
    minHeight: multiline ? 92 : undefined,
    fontSize: 14,
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
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 6,
    fontWeight: '600',
  },
});

