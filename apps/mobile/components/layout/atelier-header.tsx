import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Layers } from "lucide-react-native";
import { HEADER_BAR_HEIGHT } from "../../constants/layout";
import { mobileTheme } from "../../constants/theme";

export interface AtelierHeaderProps {
  title?: string;
  userName?: string;
  isOnline?: boolean;
  onPressProfile?: () => void;
  onPressScan?: () => void;
  onPressAction?: () => void;
  rightAction?: React.ReactNode;
  showProfile?: boolean;
  icon?: React.ReactNode;
  compactBrand?: boolean;
  backgroundColor?: string;
}

export function AtelierHeader({
  title = "Navarachna Atelier",
  userName = "Atelier Staff",
  isOnline = true,
  onPressProfile,
  rightAction,
  showProfile = true,
  icon,
  compactBrand = false,
  backgroundColor,
}: AtelierHeaderProps) {
  const insets = useSafeAreaInsets();

  // Compute initials (e.g. "Master Priya" -> "MP")
  const initials =
    userName
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "NA";

  return (
    <>
      <StatusBar style="dark" />
      <View
        style={[styles.headerGradient, { paddingTop: insets.top > 0 ? insets.top + 2 : 12 }]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[backgroundColor || "#F9D2DC", "#FCE7EC", "#F7F7FB"]}
          locations={[0, 0.48, 1]}
          style={styles.ambientWash}
        />
        <View style={styles.bar}>
          {/* Left: Brand Crest / Feature Icon & Studio Title */}
          <View style={styles.brandContainer}>
            <View style={[styles.logoTile, compactBrand && styles.compactLogoTile]}>
              {icon || <Layers size={19} color="#ffffff" strokeWidth={2.3} />}
            </View>
            <Text style={[styles.brandTitle, compactBrand && styles.compactBrandTitle]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {title}
            </Text>
          </View>

          {/* Right: Actions & Clean Profile Avatar with integrated Live Status indicator */}
          <View style={styles.rightContainer}>
            {rightAction}
            {showProfile && (
              <TouchableOpacity
                onPress={onPressProfile}
                activeOpacity={0.8}
                style={styles.avatarTouchable}
                accessibilityLabel={`Operator profile: ${userName}`}
              >
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isOnline ? "#10b981" : "#cbd5e1" },
                  ]}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  ambientWash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 156,
  },
  headerGradient: {
    width: "100%",
    paddingBottom: 10,
    backgroundColor: "transparent",
  },
  bar: {
    minHeight: HEADER_BAR_HEIGHT + 2,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandContainer: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
  },
  logoTile: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: mobileTheme.color.primary,
    borderWidth: 1,
    borderColor: mobileTheme.color.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: mobileTheme.color.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.16,
        shadowRadius: 4,
      },
      default: {
        boxShadow: "0 2px 5px rgba(225, 29, 72, 0.14)",
      },
    }),
  },
  compactLogoTile: {
    width: 36,
    height: 36,
    borderRadius: 11,
  },
  brandTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: mobileTheme.color.ink,
    letterSpacing: -0.45,
    flexShrink: 1,
  },
  compactBrandTitle: {
    fontSize: 17,
  },
  avatarTouchable: {
    position: "relative",
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "rgba(225, 29, 72, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      default: {
        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.06)",
      },
    }),
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#cf0046",
  },
  statusDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
});
