import React from "react";
import { Card } from "./Card";
import { COLORS } from "../../constants/colors";

interface StepperProps {
  current: number;
}

export const Stepper: React.FC<StepperProps> = ({ current }) => {
  const items = ["Business", "Owner", "Menu", "Compliance", "Review"];

  return (
    <Card pad={16}>
      <div style={{ width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {items.map((title, index) => {
            const stepNumber = index + 1;
            const isDone = current > stepNumber;
            const isActive = current === stepNumber;

            return (
              <React.Fragment key={title}>
                <div style={{ 
                  flex: 1, 
                  display: "flex", 
                  flexDirection: "column",
                  alignItems: "center", 
                  padding: "0 4px" 
                }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "16px",
                      backgroundColor: isDone || isActive ? COLORS.primary : COLORS.white,
                      border: `1px solid ${isDone || isActive ? COLORS.primary : COLORS.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "6px",
                    }}
                  >
                    <span style={{ 
                      color: isDone || isActive ? "#fff" : COLORS.textLight, 
                      fontWeight: "900",
                      fontSize: "14px"
                    }}>
                      {stepNumber}
                    </span>
                  </div>
                  <span
                    style={{
                      color: isActive ? COLORS.primary : isDone ? COLORS.text : COLORS.textLight,
                      fontWeight: isActive ? "900" : "600",
                      textAlign: "center",
                      fontSize: "12px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "100%",
                    }}
                  >
                    {title}
                  </span>
                </div>
                {index < items.length - 1 && (
                  <div
                    style={{
                      flex: 1.1,
                      height: "2px",
                      backgroundColor: isDone ? COLORS.primary : COLORS.border,
                      borderRadius: "2px",
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </Card>
  );
};