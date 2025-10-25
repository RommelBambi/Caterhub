import React, { useState } from "react";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { COLORS } from "../../constants/colors";

interface LoginModalProps {
  onLogin: (username: string, password: string) => void;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLogin, onClose }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: COLORS.white,
          borderRadius: "18px",
          padding: "24px",
          width: "400px",
          maxWidth: "90vw",
          boxShadow: `0 12px 24px ${COLORS.shadow}20`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ 
          margin: "0 0 20px 0", 
          color: COLORS.text, 
          fontSize: "24px",
          fontWeight: "900"
        }}>
          Admin Login
        </h2>
        
        <form onSubmit={handleSubmit}>
          <Field
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
          />
          
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            secureTextEntry
          />
          
          <div style={{ 
            display: "flex", 
            gap: "12px", 
            marginTop: "20px",
            justifyContent: "flex-end"
          }}>
            <Button
              label="Cancel"
              variant="outline"
              onPress={onClose}
            />
            <Button
              label="Login"
              variant="solid"
              onPress={() => onLogin(username, password)}
            />
          </div>
        </form>
      </div>
    </div>
  );
};