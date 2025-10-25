// Color constants for the admin panel
export const COLORS = {
  primary: "#C836F9",
  primaryDark: "#7B1FA2",
  text: "#1e293b",
  textLight: "#64748b",
  bg: "#f8fafc",
  white: "#ffffff",
  border: "#e2e8f0",
  row: "#f9fafb",
  hover: "#f1f5f9",
  success: "#22c55e",
  danger: "#dc2626",
  warn: "#f59e0b",
  info: "#0ea5e9",
  shadow: "#0f172a",
} as const;

export const DARK_COLORS = {
  ...COLORS,
  text: "#e5e7eb",
  textLight: "#94a3b8",
  bg: "#0b1220",
  white: "#0f172a",
  border: "#1f2941",
  row: "#0b162a",
  hover: "#14203d",
  primaryDark: "#a855f7",
} as const;
