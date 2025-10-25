import React from "react";
import { View, Text } from "react-native";
import { COLORS } from "../../constants/colors";

interface LogoProps {
  size?: number;
  showText?: boolean;
  color?: string;
  backgroundColor?: string;
}

const Logo = ({ 
  size = 28, 
  showText = true, 
  color = COLORS.primary, 
  backgroundColor = "#fff" 
}: LogoProps) => {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ 
        width: size, 
        height: size, 
        backgroundColor, 
        borderRadius: 6, 
        alignItems: "center", 
        justifyContent: "center" 
      }}>
        <Text style={{ 
          color, 
          fontWeight: "900", 
          fontSize: size * 0.5 
        }}>
          CH
        </Text>
      </View>
      {showText && (
        <Text style={{ 
          color: "#fff", 
          fontWeight: "900", 
          fontSize: 20, 
          letterSpacing: 0.3 
        }}>
          CaterHub
        </Text>
      )}
    </View>
  );
};

export default Logo;
