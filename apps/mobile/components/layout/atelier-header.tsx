import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Layers } from "lucide-react-native";
import { HEADER_BAR_HEIGHT } from "../../constants/layout";

export interface AtelierHeaderProps {
  title?: string;
  userName?: string;
  isOnline?: boolean;
  onPressProfile?: () => void;
  onPressScan?: () => void;
  onPressAction?: () => void;
}

export function AtelierHeader({
  title = "Navarachna Atelier",
  userName = "Atelier Staff",
  isOnline = true,
  onPressProfile,
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
      <LinearGradient
        colors={[
          "rgba(251, 198, 210, 0.95)",
          "rgba(252, 210, 220, 0.82)",
          "rgba(253, 226, 233, 0.55)",
          "rgba(254, 242, 245, 0.25)",
          "#f8fafc",
        ]}
        locations={[0, 0.40, 0.68, 0.88, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[
          styles.headerGradient,
          { paddingTop: insets.top > 0 ? insets.top + 4 : 14 },
        ]}
      >
        <View style={styles.bar}>
          {/* Left: Brand Crest & Studio Title */}
          <View style={styles.brandContainer}>
            <View style={styles.logoTile}>
              <Layers size={19} color="#ffffff" strokeWidth={2.3} />
            </View>
            <Text style={styles.brandTitle} numberOfLines={1}>
              {title}
            </Text>
          </View>

          {/* Right: Clean Profile Avatar with integrated Live Status indicator */}
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
        </View>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  headerGradient: {
    width: "100%",
    paddingBottom: 12,
    backgroundColor: "#f8fafc",
  },
  bar: {
    height: HEADER_BAR_HEIGHT,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoTile: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#e11d48", // Brand Rose crest
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#e11d48",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      default: {
        boxShadow: "0 3px 8px rgba(225, 29, 72, 0.22)",
      },
    }),
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  avatarTouchable: {
    position: "relative",
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
    color: "#e11d48",
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



