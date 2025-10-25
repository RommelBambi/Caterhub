import React from "react";

interface ContainerProps {
  children: React.ReactNode;
}

export const Container: React.FC<ContainerProps> = ({ children }) => (
  <div style={{ width: "100%", maxWidth: 980, margin: "0 auto" }}>
    {children}
  </div>
);