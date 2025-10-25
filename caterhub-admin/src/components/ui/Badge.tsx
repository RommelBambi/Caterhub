import React from "react";
import { COLORS } from "../../constants/colors";

interface BadgeProps {
  tone: "info" | "success" | "warn" | "danger";
  text: string;
}

export const Badge: React.FC<BadgeProps> = ({ tone, text }) => {
  const colorMap = { 
    info: COLORS.info, 
    success: COLORS.success, 
    warn: COLORS.warn, 
    danger: COLORS.danger 
  } as const;
  
  const color = colorMap[tone];

  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: "999px",
        border: `1px solid ${color}66`,
        backgroundColor: `${color}1A`,
        display: "inline-block",
        color: COLORS.text,
        fontWeight: "700",
        fontSize: "12px",
      }}
    >
      {text}
    </span>
  );
};