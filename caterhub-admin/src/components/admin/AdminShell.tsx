import React, { useState, useEffect } from "react";
import { Button } from "../ui/Button";
import { COLORS } from "../../constants/colors";
import { AuthUser } from "../../types";

interface AdminShellProps {
  user: AuthUser;
  onLogout: () => void;
}

export const AdminShell: React.FC<AdminShellProps> = ({ user, onLogout }) => {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [notifications, setNotifications] = useState<any[]>([]);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "recruitment", label: "Recruitment", icon: "👥" },
    { id: "bookings", label: "Bookings", icon: "📅" },
    { id: "users", label: "Users", icon: "👤" },
    { id: "payments", label: "Payments", icon: "💳" },
    { id: "analytics", label: "Analytics", icon: "📈" },
    { id: "settings", label: "Settings", icon: "⚙️" },
    { id: "refunds", label: "Refunds", icon: "🔄" },
  ];

  const renderPageContent = () => {
    switch (currentPage) {
      case "dashboard":
        return (
          <div>
            <h1 style={{ fontSize: "32px", fontWeight: "900", marginBottom: "24px", color: COLORS.text }}>
              Dashboard
            </h1>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
              <div style={{ backgroundColor: COLORS.white, padding: "24px", borderRadius: "18px", border: `1px solid ${COLORS.border}` }}>
                <h3 style={{ margin: "0 0 12px 0", color: COLORS.text }}>Total Users</h3>
                <p style={{ fontSize: "32px", fontWeight: "900", margin: 0, color: COLORS.primary }}>1,234</p>
              </div>
              <div style={{ backgroundColor: COLORS.white, padding: "24px", borderRadius: "18px", border: `1px solid ${COLORS.border}` }}>
                <h3 style={{ margin: "0 0 12px 0", color: COLORS.text }}>Active Bookings</h3>
                <p style={{ fontSize: "32px", fontWeight: "900", margin: 0, color: COLORS.success }}>89</p>
              </div>
              <div style={{ backgroundColor: COLORS.white, padding: "24px", borderRadius: "18px", border: `1px solid ${COLORS.border}` }}>
                <h3 style={{ margin: "0 0 12px 0", color: COLORS.text }}>Revenue</h3>
                <p style={{ fontSize: "32px", fontWeight: "900", margin: 0, color: COLORS.info }}>₱45,678</p>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div>
            <h1 style={{ fontSize: "32px", fontWeight: "900", marginBottom: "24px", color: COLORS.text }}>
              {menuItems.find(item => item.id === currentPage)?.label || "Page"}
            </h1>
            <p style={{ color: COLORS.textLight }}>This page is under development.</p>
          </div>
        );
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: COLORS.bg }}>
      {/* Sidebar */}
      <div style={{
        width: "280px",
        backgroundColor: COLORS.white,
        borderRight: `1px solid ${COLORS.border}`,
        padding: "24px 0",
        display: "flex",
        flexDirection: "column"
      }}>
        <div style={{ padding: "0 24px", marginBottom: "32px" }}>
          <h2 style={{ margin: 0, color: COLORS.primary, fontSize: "24px", fontWeight: "900" }}>
            CaterHub Admin
          </h2>
          <p style={{ margin: "4px 0 0 0", color: COLORS.textLight, fontSize: "14px" }}>
            Welcome, {user.username}
          </p>
        </div>

        <nav style={{ flex: 1 }}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              style={{
                width: "100%",
                padding: "16px 24px",
                border: "none",
                backgroundColor: currentPage === item.id ? COLORS.primary + "10" : "transparent",
                color: currentPage === item.id ? COLORS.primary : COLORS.text,
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                fontSize: "16px",
                fontWeight: currentPage === item.id ? "700" : "500",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                if (currentPage !== item.id) {
                  e.currentTarget.style.backgroundColor = COLORS.hover;
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== item.id) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              <span style={{ fontSize: "20px" }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: "0 24px" }}>
          <Button
            label="Logout"
            variant="outline"
            danger
            onPress={onLogout}
            full
          />
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: "24px" }}>
        {renderPageContent()}
      </div>
    </div>
  );
};