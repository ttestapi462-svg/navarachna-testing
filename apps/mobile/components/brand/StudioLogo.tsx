import * as React from "react";
import { View, Image, StyleSheet, StyleProp, ViewStyle } from "react-native";

interface StudioLogoIconProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Authentic Navarachna Designer Studio Monogram Emblem:
 * Authentic 3D embossed antique gold needle & thread monogram.
 */
export function StudioLogoIcon({ size = 36, style }: StudioLogoIconProps) {
  return (
    <View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}>
      <Image
        source={require("../../assets/navarachna-monogram-gold.png")}
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
 * Authentic logo centered on a pristine warm linen ivory background with subtle border and elevation.
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
        source={withText ? require("../../assets/navarachna-full-crest-gold.png") : require("../../assets/navarachna-monogram-gold.png")}
        style={{ width: size * 0.85, height: size * 0.85 }}
        resizeMode="contain"
      />
    </View>
  );
}

interface StudioBrandMarkProps {
  variant?: "horizontal" | "stacked" | "full" | "textOnly";
  height?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Authentic Brand Logo Mark for Mobile:
 * Renders the original official 3D embossed antique gold artwork:
 * - 3D Brushed Antique Gold (#C59B4E / #E0B159)
 * - Authentic needle & thread cursive monogram
 * - Authentic 3D "Navarachna Designer Studio" wordmark with florets and hairline rules
 */
export function StudioBrandMark({
  variant = "horizontal",
  height = 36,
  gap,
  style,
}: StudioBrandMarkProps) {
  // 1. Full Stacked Crest (For Login screen & Splash) - aspect ratio ~ 1.51 : 1
  if (variant === "stacked" || variant === "full") {
    const width = Math.round(height * 1.51);
    return (
      <View style={[{ alignItems: "center", justifyContent: "center" }, style]}>
        <Image
          source={require("../../assets/navarachna-full-crest-gold.png")}
          style={{ width, height }}
          resizeMode="contain"
        />
      </View>
    );
  }

  // 2. Text Only - aspect ratio ~ 3.92 : 1
  if (variant === "textOnly") {
    const width = Math.round(height * 3.92);
    return (
      <View style={[{ alignItems: "center", justifyContent: "center" }, style]}>
        <Image
          source={require("../../assets/navarachna-wordmark-gold.png")}
          style={{ width, height }}
          resizeMode="contain"
        />
      </View>
    );
  }

  // 3. Horizontal Lockup (Default) - aspect ratio ~ 4.43 : 1
  const width = Math.round(height * 4.43);
  return (
    <View style={[{ alignItems: "center", justifyContent: "center" }, style]}>
      <Image
        source={require("../../assets/navarachna-horizontal-lockup.png")}
        style={{ width, height }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  appIconContainer: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#E8E2D8",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#231E1C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    overflow: "hidden",
  },
});
