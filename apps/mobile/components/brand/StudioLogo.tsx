import * as React from "react";
import { View, Image, StyleSheet, StyleProp, ViewStyle } from "react-native";

interface StudioLogoIconProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Authentic Navarachna Designer Studio Monogram Emblem:
 * Needle tilted diagonally, threaded with a continuous crimson-to-navy ribbon
 * weaving the initials "N", "D", and "S".
 */
export function StudioLogoIcon({ size = 36, style }: StudioLogoIconProps) {
  return (
    <View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}>
      <Image
        source={require("../../assets/emblem-transparent.png")}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

interface StudioAppIconProps {
  size?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  withText?: boolean;
}

/**
 * Studio App Icon:
 * Authentic logo centered on a pristine white background with subtle border and elevation.
 */
export function StudioAppIcon({ size = 48, borderRadius, style, withText = true }: StudioAppIconProps) {
  const radius = borderRadius ?? Math.round(size * 0.24);

  return (
    <View
      style={[
        styles.appIconContainer,
        {
          width: size,
          height: size,
          borderRadius: radius,
        },
        style,
      ]}
    >
      <Image
        source={withText ? require("../../assets/icon.png") : require("../../assets/emblem-transparent.png")}
        style={{ width: size * 0.85, height: size * 0.85 }}
        resizeMode="contain"
      />
    </View>
  );
}

interface StudioBrandMarkProps {
  variant?: "horizontal" | "stacked" | "textOnly";
  height?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Authentic Brand Logo Mark for Mobile:
 * Renders the original official artwork with 100% pixel fidelity:
 * exact stencil cuts on every letter, exact font weight, exact proportions,
 * and exact crimson-to-navy continuous gradient.
 */
export function StudioBrandMark({
  variant = "horizontal",
  height = 36,
  gap,
  style,
}: StudioBrandMarkProps) {
  if (variant === "stacked") {
    // Stacked aspect ratio ~ 1760 : 735 (2.39:1)
    const width = Math.round(height * 2.39);
    return (
      <View style={[{ alignItems: "center", justifyContent: "center" }, style]}>
        <Image
          source={require("../../assets/logo-transparent.png")}
          style={{ width, height }}
          resizeMode="contain"
        />
      </View>
    );
  }

  if (variant === "textOnly") {
    // Text aspect ratio ~ 1760 : 302 (5.83:1)
    const width = Math.round(height * 5.83);
    return (
      <View style={[{ alignItems: "center", justifyContent: "center" }, style]}>
        <Image
          source={require("../../assets/logo-text-transparent.png")}
          style={{ width, height }}
          resizeMode="contain"
        />
      </View>
    );
  }

  // Horizontal lockup: Emblem on left + generous breathing gap + balanced 2-line Text on right
  const emblemHeight = height;
  const emblemWidth = Math.round(emblemHeight * 0.987);
  const textHeight = Math.round(height * 0.70);
  const textWidth = Math.round(textHeight * 5.844);
  const effectiveGap = gap ?? Math.max(14, Math.round(height * 0.45));

  return (
    <View style={[{ flexDirection: "row", alignItems: "center" }, style]}>
      <Image
        source={require("../../assets/emblem-transparent.png")}
        style={{ width: emblemWidth, height: emblemHeight }}
        resizeMode="contain"
      />
      <View style={{ width: effectiveGap }} />
      <Image
        source={require("../../assets/logo-text-transparent.png")}
        style={{ width: textWidth, height: textHeight }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  appIconContainer: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#fecdd6",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
});
