import React from "react";
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from "react-native";

export interface SeparatorProps extends ViewProps {
  orientation?: "horizontal" | "vertical";
  style?: StyleProp<ViewStyle>;
}

export function Separator({
  orientation = "horizontal",
  style,
  ...props
}: SeparatorProps) {
  return (
    <View
      style={[
        orientation === "horizontal"
          ? styles.horizontal
          : styles.vertical,
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  horizontal: {
    height: 1,
    width: "100%",
    backgroundColor: "#f1f5f9",
  },
  vertical: {
    width: 1,
    height: "100%",
    backgroundColor: "#f1f5f9",
  },
});
