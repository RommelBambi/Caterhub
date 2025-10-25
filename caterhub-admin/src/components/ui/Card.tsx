import React from "react";
import { COLORS } from "../../constants/colors";

interface CardProps {
  children: React.ReactNode;
  pad?: number;
}

export const Card: React.FC<CardProps> = ({ children, pad = 18 }) => (
  <div
    style={{
      backgroundColor: COLORS.white,
      border: `1px solid ${COLORS.border}`,
      borderRadius: "18px",
      padding: `${pad}px`,
      boxShadow: `0 6px 12px ${COLORS.shadow}06`,
    }}
  >
    {children}
  </div>
);