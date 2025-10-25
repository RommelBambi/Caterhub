import React, { useState } from "react";
import { COLORS } from "../../constants/colors";

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "email" | "tel" | "url";
  multiline?: boolean;
  secureTextEntry?: boolean;
}

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label style={{ 
    fontSize: "12px", 
    color: COLORS.textLight, 
    marginBottom: "6px",
    display: "block",
    fontWeight: "600"
  }}>
    {children}
  </label>
);

export const Field: React.FC<FieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  multiline,
  secureTextEntry,
}) => {
  const [focused, setFocused] = useState(false);

  const inputStyle: React.CSSProperties = {
    border: `1.5px solid ${focused ? COLORS.primary : COLORS.border}`,
    backgroundColor: COLORS.white,
    color: COLORS.text,
    borderRadius: "12px",
    padding: multiline ? "12px 14px" : "10px 14px",
    minHeight: multiline ? "92px" : "auto",
    boxShadow: focused ? `0 3px 8px ${COLORS.shadow}06` : "none",
    width: "100%",
    fontSize: "14px",
    fontFamily: "inherit",
    outline: "none",
    transition: "all 0.2s ease",
    resize: multiline ? "vertical" : "none",
  };

  return (
    <div style={{ marginBottom: "12px" }}>
      <Label>{label}</Label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={inputStyle}
          placeholderTextColor={COLORS.textLight}
        />
      ) : (
        <input
          type={secureTextEntry ? "password" : keyboardType === "email" ? "email" : keyboardType === "tel" ? "tel" : keyboardType === "url" ? "url" : "text"}
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={inputStyle}
          placeholderTextColor={COLORS.textLight}
        />
      )}
    </div>
  );
};