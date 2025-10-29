import React, { useState } from "react";
import { COLORS } from "../constants/colors";
interface LoginPageProps {
  onSubmit: (username: string, password: string) => void;
  error?: string;
}
const BACKDROP_IMAGE =
  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80";
export const LoginPage: React.FC<LoginPageProps> = ({ onSubmit, error }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(username, password);
  };
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.bg,
        position: "relative",
        padding: "48px 24px",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at top, rgba(255,255,255,1) 0%, rgba(248,250,252,0.95) 55%, rgba(248,250,252,1) 100%)",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: "-5%",
          height: "45vh",
          backgroundImage: `url(${BACKDROP_IMAGE})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "grayscale(100%)",
          opacity: 0.35,
          transform: "scale(1.05)",
        }}
      />
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: "420px", width: "100%" }}>
        <div style={{ marginBottom: "32px" }}>
          <div style={{ fontSize: "40px", fontWeight: 800, color: COLORS.text }}>
            <span>cater</span>
            <span style={{ color: COLORS.primary }}>Hub</span>
          </div>
        </div>
        <p
          style={{
            fontSize: "18px",
            color: COLORS.textLight,
            maxWidth: "360px",
            margin: "0 auto 32px auto",
            lineHeight: 1.6,
          }}
        >
          Please sign in using your admin account. Use the username and password assigned to you.
        </p>
        <form
          onSubmit={handleSubmit}
          style={{
            backgroundColor: COLORS.white,
            borderRadius: "18px",
            padding: "32px",
            boxShadow: "0 24px 48px rgba(15, 23, 42, 0.12)",
            border: `1px solid ${COLORS.border}`,
            textAlign: "left",
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <label
              htmlFor="admin-username"
              style={{ display: "block", fontWeight: 700, fontSize: "15px", color: COLORS.text, marginBottom: "8px" }}
            >
              Username
            </label>
            <input
              id="admin-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: "12px",
                border: `1px solid ${COLORS.border}`,
                backgroundColor: "#fff",
                fontSize: "16px",
                color: COLORS.text,
                boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.04)",
                outline: "none",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = COLORS.primary;
                e.currentTarget.style.boxShadow = `0 0 0 4px ${COLORS.primary}25`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = COLORS.border;
                e.currentTarget.style.boxShadow = "inset 0 1px 2px rgba(15, 23, 42, 0.04)";
              }}
            />
          </div>
          <div style={{ marginBottom: "8px" }}>
            <label
              htmlFor="admin-password"
              style={{ display: "block", fontWeight: 700, fontSize: "15px", color: COLORS.text, marginBottom: "8px" }}
            >
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: "12px",
                border: `1px solid ${COLORS.border}`,
                backgroundColor: "#fff",
                fontSize: "16px",
                color: COLORS.text,
                boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.04)",
                outline: "none",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = COLORS.primary;
                e.currentTarget.style.boxShadow = `0 0 0 4px ${COLORS.primary}25`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = COLORS.border;
                e.currentTarget.style.boxShadow = "inset 0 1px 2px rgba(15, 23, 42, 0.04)";
              }}
            />
          </div>
          {error && (
            <div style={{ color: COLORS.danger, fontSize: "14px", fontWeight: 600, margin: "8px 0 16px 0" }}>{error}</div>
          )}
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: "999px",
              border: "none",
              background: "linear-gradient(135deg, #f72585 0%, #cc1792 100%)",
              color: "#fff",
              fontWeight: 800,
              fontSize: "15px",
              letterSpacing: "0.4px",
              cursor: "pointer",
              marginTop: "12px",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
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
            SIGN IN
          </button>
          <div
            style={{
              marginTop: "24px",
              textAlign: "center",
              fontSize: "14px",
              color: COLORS.textLight,
            }}
          >
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              style={{ color: COLORS.textLight, textDecoration: "none", fontWeight: 600 }}
            >
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};
