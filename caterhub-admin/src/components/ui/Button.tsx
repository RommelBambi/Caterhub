import React from "react";
import { COLORS } from "../../constants/colors";

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: "solid" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  full?: boolean;
  danger?: boolean;
  disabled?: boolean;
  invert?: boolean;
  shape?: "pill" | "square" | "rounded";
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = "solid",
  size = "md",
  full,
  danger,
  disabled,
  invert,
  shape = "pill",
}) => {
  const pv = size === "sm" ? 8 : size === "lg" ? 14 : 10;
  const ph = size === "sm" ? 14 : size === "lg" ? 20 : 16;
  const solidBg = danger ? COLORS.danger : COLORS.primary;
  const textC = variant === "solid" ? (invert ? COLORS.primary : COLORS.white) : invert ? COLORS.white : danger ? COLORS.danger : COLORS.text;
  const borderC = variant === "outline" ? (invert ? "#ffffff66" : danger ? COLORS.danger : COLORS.border) : "transparent";
  const radius = shape === "square" ? 8 : shape === "rounded" ? 14 : 999;

  return (
    <button
      onClick={disabled ? undefined : onPress}
      disabled={disabled}
      style={{
        opacity: disabled ? 0.5 : 1,
        padding: `${pv}px ${ph}px`,
        borderRadius: `${radius}px`,
        backgroundColor: variant === "solid" ? solidBg : "transparent",
        border: variant === "outline" ? `1px solid ${borderC}` : "none",
        color: textC,
        width: full ? "100%" : "auto",
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: "800",
        letterSpacing: "0.2px",
        fontSize: "14px",
        transition: "all 0.2s ease",
      }}
      onMouseDown={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = "scale(0.98)";
        }
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {label}
    </button>
  );
};