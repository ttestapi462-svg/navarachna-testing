import * as React from "react";
import { View, Image, StyleSheet, StyleProp, ViewStyle, Platform, ImageStyle } from "react-native";

interface StudioLogoIconProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

/**
 * Authentic Navarachna Designer Studio Monogram Emblem:
 * Authentic 3D embossed antique gold needle & thread monogram.
 * Rendered crystal-clear with luxury Atelier drop shadow matching the web application.
 */
export function StudioLogoIcon({ size = 36, style, imageStyle }: StudioLogoIconProps) {
  return (
    <View
      style={[
        styles.logoIconContainer,
        { width: size, height: size },
        style,
      ]}
    >
      <Image
        source={require("../../assets/navarachna-monogram-gold.png")}
        style={[
          styles.logoImage,
          { width: size, height: size },
          imageStyle,
        ]}
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
      <View style={[styles.brandMarkContainer, style]}>
        <Image
          source={require("../../assets/navarachna-full-crest-gold.png")}
          style={[styles.brandMarkImage, { width, height }]}
          resizeMode="contain"
        />
      </View>
    );
  }

  // 2. Text Only - aspect ratio ~ 3.92 : 1
  if (variant === "textOnly") {
    const width = Math.round(height * 3.92);
    return (
      <View style={[styles.brandMarkContainer, style]}>
        <Image
          source={require("../../assets/navarachna-wordmark-gold.png")}
          style={[styles.brandMarkImage, { width, height }]}
          resizeMode="contain"
        />
      </View>
    );
  }

  // 3. Horizontal Lockup (Default) - aspect ratio ~ 4.43 : 1
  const width = Math.round(height * 4.43);
  return (
    <View style={[styles.brandMarkContainer, style]}>
      <Image
        source={require("../../assets/navarachna-horizontal-lockup.png")}
        style={[styles.brandMarkImage, { width, height }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  logoIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  logoImage: {
    backgroundColor: "transparent",
    ...Platform.select({
      web: {
        imageRendering: "-webkit-optimize-contrast",
      } as any,
      default: {},
    }),
  },
  brandMarkContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    ...Platform.select({
      ios: {
        shadowColor: "#4A0D1B",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        filter: "drop-shadow(0px 4px 16px rgba(74, 13, 27, 0.18))",
      },
      default: {
        shadowColor: "#4A0D1B",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
      },
    }),
  },
  brandMarkImage: {
    backgroundColor: "transparent",
  },
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
