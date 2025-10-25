import React from "react";
import { COLORS } from "../../constants/colors";

interface ChipProps {
  text: string;
  active?: boolean;
  onPress?: () => void;
}

export const Chip: React.FC<ChipProps> = ({ text, active, onPress }) => (
  <button
    onClick={onPress}
    style={{
      padding: "7px 12px",
      borderRadius: "999px",
      border: `1px solid ${active ? COLORS.primary : COLORS.border}`,
      backgroundColor: active ? COLORS.primary + "10" : COLORS.white,
      marginRight: "8px",
      marginBottom: "8px",
      cursor: "pointer",
      color: active ? COLORS.primary : COLORS.textLight,
      fontWeight: "700",
      fontSize: "14px",
      transition: "all 0.2s ease",
      outline: "none",
    }}
    onMouseDown={(e) => {
      e.currentTarget.style.transform = "scale(0.98)";
    }}
    onMouseUp={(e) => {
      e.currentTarget.style.transform = "scale(1)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "scale(1)";
    }}
  >
    {text}
  </button>
);