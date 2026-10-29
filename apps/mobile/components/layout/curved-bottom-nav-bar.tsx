import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import {
  LayoutDashboard,
  MoreHorizontal,
  Receipt,
  ShoppingBag,
  Users,
} from "lucide-react-native";
import {
  BUBBLE_SIZE,
  getTabBarHeight,
} from "../../constants/layout";

export type MobileTabRoute =
  | "index"
  | "orders"
  | "customer"
  | "expense"
  | "more";

export interface CurvedBottomNavBarProps {
  activeRoute: string;
  safeAreaBottom: number;
  onTabSelect: (routeName: MobileTabRoute) => void;
}

export const NAV_TABS: Array<{
  route: MobileTabRoute;
  label: string;
  icon: any;
}> = [
  { route: "index", label: "Dashboard", icon: LayoutDashboard },
  { route: "orders", label: "Orders", icon: ShoppingBag },
  { route: "customer", label: "Customer", icon: Users },
  { route: "expense", label: "Expense", icon: Receipt },
  { route: "more", label: "More", icon: MoreHorizontal },
];

const SLOT_COUNT = 5;
const TAB_ROW_HEIGHT = 40;
const BUBBLE_RADIUS = BUBBLE_SIZE / 2;
const HEADROOM = 13;
const SCOOP_DEPTH = 38;

function getActiveTabIndex(pathname: string): number {
  const clean = (pathname || "").split("?")[0].replace(/\/$/, "");
  if (
    clean === "" ||
    clean === "/" ||
    clean.endsWith("/(tabs)") ||
    clean.endsWith("/index")
  ) {
    return 0; // Dashboard
  }
  if (clean.endsWith("/orders")) return 1;
  if (clean.endsWith("/customer")) return 2;
  if (clean.endsWith("/expense")) return 3;
  if (clean.endsWith("/more") || clean.includes("/more/")) {
    return 4; // More tab and its sub-pages
  }
  return -1;
}

/**
 * Mathematical recreation of curved navigation bar notch:
 * Dips in a smooth rounded "U" slope on both sides of the active tab.
 */
function getFlutterNavPath(
  pos: number,
  itemsLength: number,
  width: number,
  height: number,
  scoopDepth: number = SCOOP_DEPTH
): string {
  const span = 1.0 / itemsLength;
  const s = 0.2;
  const loc = pos + (span - s) / 2;

  const startX = (loc - 0.1) * width;
  const cp1X = (loc + s * 0.2) * width;
  const cp1Y = scoopDepth * 0.08;
  const cp2X = loc * width;
  const cp2Y = scoopDepth;
  const midX = (loc + s * 0.5) * width;
  const midY = scoopDepth;

  const cp3X = (loc + s) * width;
  const cp3Y = scoopDepth;
  const cp4X = (loc + s - s * 0.2) * width;
  const cp4Y = scoopDepth * 0.08;
  const endX = (loc + s + 0.1) * width;

  return [
    "M 0 0",
    `L ${Math.max(0, startX).toFixed(2)} 0`,
    `C ${cp1X.toFixed(2)} ${cp1Y.toFixed(2)}, ${cp2X.toFixed(2)} ${cp2Y.toFixed(2)}, ${midX.toFixed(2)} ${midY.toFixed(2)}`,
    `C ${cp3X.toFixed(2)} ${cp3Y.toFixed(2)}, ${cp4X.toFixed(2)} ${cp4Y.toFixed(2)}, ${Math.min(width, endX).toFixed(2)} 0`,
    `L ${width.toFixed(2)} 0`,
    `L ${width.toFixed(2)} ${height.toFixed(2)}`,
    `L 0 ${height.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function getFlutterNavScoopPath(
  pos: number,
  itemsLength: number,
  width: number,
  scoopDepth: number = SCOOP_DEPTH
): string {
  const span = 1.0 / itemsLength;
  const s = 0.2;
  const loc = pos + (span - s) / 2;
  const startX = (loc - 0.1) * width;
  const cp1X = (loc + s * 0.2) * width;
  const cp1Y = scoopDepth * 0.08;
  const cp2X = loc * width;
  const cp2Y = scoopDepth;
  const midX = (loc + s * 0.5) * width;
  const midY = scoopDepth;
  const cp3X = (loc + s) * width;
  const cp4X = (loc + s - s * 0.2) * width;
  const cp4Y = scoopDepth * 0.08;
  const endX = (loc + s + 0.1) * width;

  return [
    `M ${startX.toFixed(2)} 0`,
    `C ${cp1X.toFixed(2)} ${cp1Y.toFixed(2)}, ${cp2X.toFixed(2)} ${cp2Y.toFixed(2)}, ${midX.toFixed(2)} ${midY.toFixed(2)}`,
    `C ${cp3X.toFixed(2)} ${scoopDepth.toFixed(2)}, ${cp4X.toFixed(2)} ${cp4Y.toFixed(2)}, ${endX.toFixed(2)} 0`,
    "Z",
  ].join(" ");
}

export function CurvedBottomNavBar({
  activeRoute,
  safeAreaBottom,
  onTabSelect,
}: CurvedBottomNavBarProps) {
  const { width: windowWidth } = useWindowDimensions();
  const barHeight = getTabBarHeight(safeAreaBottom);
  const tabRowTop = HEADROOM + Math.max(0, safeAreaBottom - 12);
  const barWidth = Math.min(windowWidth, 440);
  const slotWidth = barWidth / SLOT_COUNT;

  const activeIndex = getActiveTabIndex(activeRoute);
  const isRaised = activeIndex >= 0;

  const initialPos = isRaised ? activeIndex / SLOT_COUNT : 0;
  const [posValue, setPosValue] = useState(initialPos);
  const [depthValue, setDepthValue] = useState(isRaised ? SCOOP_DEPTH : 0);

  const posAnim = useRef(new Animated.Value(initialPos)).current;
  const depthAnim = useRef(
    new Animated.Value(isRaised ? SCOOP_DEPTH : 0)
  ).current;
  const bubbleScale = useRef(new Animated.Value(isRaised ? 1 : 0)).current;

  // Frame listener driving the SVG notch path smoothly across tabs
  useEffect(() => {
    const l1 = posAnim.addListener(({ value }) => setPosValue(value));
    const l2 = depthAnim.addListener(({ value }) => setDepthValue(value));
    return () => {
      posAnim.removeListener(l1);
      depthAnim.removeListener(l2);
    };
  }, [posAnim, depthAnim]);

  useEffect(() => {
    if (isRaised) {
      Animated.parallel([
        Animated.timing(posAnim, {
          toValue: activeIndex / SLOT_COUNT,
          duration: 260,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(depthAnim, {
          toValue: SCOOP_DEPTH,
          duration: 220,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(bubbleScale, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      // If More menu root is open (not raised), smoothly flatten the notch and hide bubble
      Animated.parallel([
        Animated.timing(depthAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(bubbleScale, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.ease),
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [activeIndex, isRaised]);

  const barPath = getFlutterNavPath(
    posValue,
    SLOT_COUNT,
    barWidth,
    barHeight,
    depthValue
  );
  const scoopPath = getFlutterNavScoopPath(
    posValue,
    SLOT_COUNT,
    barWidth,
    depthValue
  );

  // Center of active bubble cradle
  const bubbleLeft =
    posValue * barWidth + slotWidth / 2 - BUBBLE_RADIUS;
  const ActiveIcon = isRaised ? NAV_TABS[activeIndex]?.icon : null;
  const activeLabel = isRaised ? NAV_TABS[activeIndex]?.label : "";

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { height: barHeight + HEADROOM }]}
    >
      <View
        pointerEvents="box-none"
        style={[
          styles.barWrapper,
          { width: barWidth, height: barHeight + HEADROOM },
        ]}
      >
        {/* Curved Notch SVG Bar */}
        <Svg
          width={barWidth}
          height={barHeight}
          viewBox={`0 0 ${barWidth} ${barHeight}`}
          style={styles.svgBar}
          pointerEvents="none"
        >
          <Path d={scoopPath} fill="#F7F7FB" />
          <Path d={barPath} fill="#e11d48" />
        </Svg>

        {/* Floating Raised Circular Action Button */}
        {ActiveIcon && (
          <Animated.View
            style={[
              styles.bubbleContainer,
              {
                left: bubbleLeft,
                transform: [{ scale: bubbleScale }],
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onTabSelect(NAV_TABS[activeIndex].route)}
              accessibilityRole="button"
              accessibilityLabel={activeLabel}
              aria-current="page"
              style={styles.bubbleCircle}
            >
              <ActiveIcon size={22} color="#ffffff" strokeWidth={2.4} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Tab Items Row */}
        <View
          style={[
            styles.tabsRow,
            { top: tabRowTop, height: TAB_ROW_HEIGHT, width: barWidth },
          ]}
        >
          {NAV_TABS.map((tab, idx) => {
            const Icon = tab.icon;
            const isTabActive = activeIndex === idx;
            return (
              <TouchableOpacity
                key={tab.route}
                onPress={() => onTabSelect(tab.route)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: isTabActive }}
                accessibilityLabel={tab.label}
                aria-current={isTabActive ? "page" : undefined}
                style={[
                  styles.tabItem,
                  { left: slotWidth * idx, width: slotWidth, height: TAB_ROW_HEIGHT },
                ]}
              >
                <View style={styles.tabContent}>
                  {/* Inactive tab shows icon normally; active tab hides icon (shown in raised circle) */}
                  <View
                    style={[
                      styles.iconWrap,
                      isTabActive && { opacity: 0 },
                    ]}
                  >
                    <Icon
                      size={20}
                      color="#ffffff"
                      strokeWidth={2.15}
                    />
                  </View>

                  {/* Active tab label is visually hidden (kept in DOM for screen readers) */}
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.tabLabel,
                      isTabActive && styles.visuallyHiddenLabel,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  barWrapper: {
    position: "relative",
    justifyContent: "flex-end",
  },
  svgBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: { elevation: 8 },
      default: { filter: "drop-shadow(0px -3px 6px rgba(0, 0, 0, 0.12))" },
    }),
  },
  tabsRow: {
    position: "absolute",
    left: 0,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 46,
  },
  tabItem: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 48,
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    width: "100%",
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    height: 22,
    marginBottom: 0,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.92)",
    letterSpacing: 0.1,
    textAlign: "center",
  },
  visuallyHiddenLabel: {
    position: "absolute",
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: "hidden",
    opacity: 0,
  },
  bubbleContainer: {
    position: "absolute",
    top: 2,
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    zIndex: 50,
  },
  bubbleCircle: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_RADIUS,
    backgroundColor: "#e11d48",
    borderWidth: 2.5,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: { elevation: 10 },
      default: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 6,
      },
    }),
  },
});
