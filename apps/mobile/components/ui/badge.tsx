import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewProps,
  ViewStyle,
} from "react-native";

export type BadgeVariant =
  | "default"
  | "secondary"
  | "outline"
  | "destructive"
  | "primary"
  | "success";

export interface BadgeProps extends ViewProps {
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

export function Badge({
  variant = "default",
  style,
  textStyle,
  children,
  ...props
}: BadgeProps) {
  return (
    <View style={[styles.badge, styles[variant], style]} {...props}>
      <Text style={[styles.text, textStyles[variant], textStyle]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  text: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  default: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
  },
  secondary: {
    backgroundColor: "#f1f5f9",
    borderColor: "#e2e8f0",
  },
  outline: {
    backgroundColor: "transparent",
    borderColor: "#e2e8f0",
  },
  destructive: {
    backgroundColor: "rgba(120, 7, 13, 0.08)",
    borderColor: "rgba(185, 28, 28, 0.2)",
  },
  primary: {
    backgroundColor: "rgba(120, 7, 13, 0.08)",
    borderColor: "rgba(120, 7, 13, 0.18)",
  },
  success: {
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0",
  },
});

const textStyles = StyleSheet.create({
  default: {
    color: "#ffffff",
  },
  secondary: {
    color: "#475569",
  },
  outline: {
    color: "#0f172a",
  },
  destructive: {
    color: "#b91c1c",
  },
  primary: {
    color: "#78070D",
  },
  success: {
    color: "#047857",
  },
});
