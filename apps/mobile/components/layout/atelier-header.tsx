import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft } from "lucide-react-native";
import { useRouter } from "expo-router";
import { StudioLogoIcon } from "../brand/StudioLogo";

export interface AtelierHeaderProps {
  title?: string;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  leftItem?: React.ReactNode;
  rightAction?: React.ReactNode;
  children?: React.ReactNode;
  headerStyle?: StyleProp<ViewStyle>;
  gradientColors?: readonly [string, string, ...string[]];
  align?: "center" | "left";
  userName?: string;
  isOnline?: boolean;
  onPressProfile?: () => void;
  showProfile?: boolean;
  compactBrand?: boolean;
  backgroundColor?: string;
  brandMarkStyle?: StyleProp<ViewStyle>;
  brandTitleStyle?: StyleProp<TextStyle>;
  brandSubtitleStyle?: StyleProp<TextStyle>;
  barStyle?: StyleProp<ViewStyle>;
  brandContainerStyle?: StyleProp<ViewStyle>;
  preserveTitleSize?: boolean;
}

export function AtelierHeader({
  title = "Navarachna Studio",
  subtitle,
  icon,
  showBack = false,
  onBack,
  leftItem,
  rightAction,
  children,
  headerStyle,
  gradientColors,
  align = "center",
  userName = "Master Priya",
  isOnline = true,
  onPressProfile,
  showProfile = false,
  backgroundColor,
  brandMarkStyle,
  brandTitleStyle,
  brandSubtitleStyle,
  barStyle,
  brandContainerStyle,
  preserveTitleSize = false,
}: AtelierHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const initials =
    userName
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "NA";

  const topInset = insets.top > 0 ? insets.top + 6 : 48;
  const isLeftAligned = align === "left" || Boolean(brandContainerStyle);

  // Soft Royal Crimson gradient wash fading down, exactly matching Tailoring App signature gradient
  const defaultColors: readonly [string, string] = [
    "rgba(251, 235, 237, 0.95)",
    "rgba(250, 247, 242, 0)",
  ];
  const colorsToUse = gradientColors || (backgroundColor ? [backgroundColor, backgroundColor] : defaultColors);

  return (
    <>
      <StatusBar style="dark" />
      <LinearGradient
        colors={colorsToUse}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.headerGradient, { paddingTop: topInset }, headerStyle]}
      >
        <View style={[styles.navHeaderRow, barStyle]}>
          {isLeftAligned ? (
            /* Left-Aligned Layout (e.g. for custom action bar or legacy flex) */
            <>
              <View style={[styles.leftBrandContainer, brandContainerStyle]}>
                {leftItem ? (
                  leftItem
                ) : showBack ? (
                  <TouchableOpacity
                    onPress={onBack || (() => (router.canGoBack() ? router.back() : router.replace("/(tabs)")))}
                    style={styles.headerIconBtn}
                    activeOpacity={0.7}
                  >
                    <ArrowLeft size={22} color="#1E293B" />
                  </TouchableOpacity>
                ) : icon ? (
                  <View style={[styles.leftIconWrapper, brandMarkStyle]}>{icon}</View>
                ) : (
                  <View style={[styles.headerBrandBadge, brandMarkStyle]}>
                    <StudioLogoIcon size={34} />
                  </View>
                )}
                <View style={styles.titleColumn}>
                  <Text
                    style={[styles.richScreenTitle, brandTitleStyle]}
                    numberOfLines={1}
                    adjustsFontSizeToFit={!preserveTitleSize}
                    minimumFontScale={0.8}
                  >
                    {title}
                  </Text>
                  {React.isValidElement(subtitle) ? (
                    subtitle
                  ) : subtitle ? (
                    <Text
                      style={[styles.headerSubtitle, brandSubtitleStyle]}
                      numberOfLines={1}
                    >
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.headerActionsWrapper}>
                {rightAction}
                {showProfile && (
                  <TouchableOpacity
                    onPress={onPressProfile || (() => router.navigate("/(tabs)/more"))}
                    activeOpacity={0.75}
                    style={styles.headerAvatarBtn}
                    accessibilityLabel={`Operator profile: ${userName}`}
                  >
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: isOnline ? "#10b981" : "#9B958F" },
                      ]}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </>
          ) : (
            /* Tailoring App Signature Centered Navigation Layout */
            <>
              {/* Left Slot: Back Button or Brand Emblem */}
              {leftItem ? (
                leftItem
              ) : showBack ? (
                <TouchableOpacity
                  onPress={onBack || (() => (router.canGoBack() ? router.back() : router.replace("/(tabs)")))}
                  style={styles.headerIconBtn}
                  activeOpacity={0.7}
                >
                  <ArrowLeft size={22} color="#1E293B" />
                </TouchableOpacity>
              ) : (
                <View style={styles.headerBrandBadge}>
                  <StudioLogoIcon size={34} />
                </View>
              )}

              {/* Center Title Slot: Centered Title with Prefix Icon */}
              <View style={styles.centerTitleWrapper} pointerEvents="none">
                <View style={styles.centerTitleRow}>
                  {icon ? <View style={styles.titlePrefixIcon}>{icon}</View> : null}
                  <Text
                    style={[styles.richScreenTitle, brandTitleStyle]}
                    numberOfLines={1}
                    adjustsFontSizeToFit={!preserveTitleSize}
                    minimumFontScale={0.8}
                  >
                    {title}
                  </Text>
                </View>
                {React.isValidElement(subtitle) ? (
                  subtitle
                ) : subtitle ? (
                  <Text
                    style={[styles.headerSubtitle, brandSubtitleStyle]}
                    numberOfLines={1}
                  >
                    {subtitle}
                  </Text>
                ) : null}
              </View>

              {/* Right Slot: Actions or Avatar */}
              <View style={styles.headerActionsWrapper}>
                {rightAction ? (
                  rightAction
                ) : showProfile ? (
                  <TouchableOpacity
                    onPress={onPressProfile || (() => router.navigate("/(tabs)/more"))}
                    activeOpacity={0.75}
                    style={styles.headerAvatarBtn}
                    accessibilityLabel={`Operator profile: ${userName}`}
                  >
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: isOnline ? "#10b981" : "#9B958F" },
                      ]}
                    />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.headerPlaceholder} />
                )}
              </View>
            </>
          )}
        </View>

        {children}
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  headerGradient: {
    paddingBottom: 14,
    paddingHorizontal: 16,
    width: "100%",
  },
  navHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
    minHeight: 44,
  },
  headerIconBtn: {
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 2,
  },
  headerBrandBadge: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  centerTitleWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 60,
  },
  centerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  titlePrefixIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  richScreenTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#78070D",
    letterSpacing: -0.5,
    lineHeight: 28,
    ...Platform.select({
      android: {
        includeFontPadding: false,
        textAlignVertical: "center",
      },
      web: {
        fontWeight: "800",
      } as any,
    }),
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#6E6862",
    fontWeight: "500",
    marginTop: 2,
  },
  headerActionsWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerAvatarBtn: {
    position: "relative",
    padding: 2,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "rgba(120, 7, 13, 0.22)",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#231E1C",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      default: {
        elevation: 1,
      },
    }),
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#78070D",
  },
  statusDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#10b981",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  headerPlaceholder: {
    width: 36,
    height: 36,
  },
  leftBrandContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
    marginRight: 8,
  },
  leftIconWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  titleColumn: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
});
