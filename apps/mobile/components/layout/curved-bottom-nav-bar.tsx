import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Animated,
  Platform,
  Easing,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LayoutDashboard, ShoppingBag, Users, Receipt, MoreHorizontal } from "lucide-react-native";
import {
  getTabBarHeight,
  BAR_BASE_HEIGHT,
  BUBBLE_SIZE,
} from "../../constants/layout";
import { QuickActionDrawer } from "./quick-action-drawer";

export interface CurvedBottomNavBarProps {
  activeTab: number; // 0: Dashboard, 1: Orders, 2: Customer, 3: Expense, 4: More
  onTabSelect: (tabIndex: number) => void;
  onActionSelect?: (actionId: string) => void;
  onPressFab?: () => void;
  isFabOpen?: boolean;
}

const TABS = [
  { id: 0, label: "Dashboard", icon: LayoutDashboard },
  { id: 1, label: "Orders", icon: ShoppingBag },
  { id: 2, label: "Customer", icon: Users },
  { id: 3, label: "Expense", icon: Receipt },
  { id: 4, label: "More", icon: MoreHorizontal },
];

const BUBBLE_RADIUS = BUBBLE_SIZE / 2; // 24
const ANIM_DURATION = 400; // ms
const HEADROOM = 13; // Low-profile top elevation zone for decreased panel height
const SCOOP_DEPTH = 42; // Proportional 42px scoop valley depth for 48px ball

/**
 * Exact mathematical recreation of Flutter's NavCustomPainter:
 * https://github.com/rafalbednarczuk/curved_navigation_bar/blob/master/lib/src/nav_custom_painter.dart
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
    `M 0 0`,
    `L ${Math.max(0, startX).toFixed(2)} 0`,
    `C ${cp1X.toFixed(2)} ${cp1Y.toFixed(2)}, ${cp2X.toFixed(2)} ${cp2Y.toFixed(2)}, ${midX.toFixed(2)} ${midY.toFixed(2)}`,
    `C ${cp3X.toFixed(2)} ${cp3Y.toFixed(2)}, ${cp4X.toFixed(2)} ${cp4Y.toFixed(2)}, ${Math.min(width, endX).toFixed(2)} 0`,
    `L ${width.toFixed(2)} 0`,
    `L ${width.toFixed(2)} ${height.toFixed(2)}`,
    `L 0 ${height.toFixed(2)}`,
    `Z`,
  ].join(" ");
}

export function CurvedBottomNavBar({
  activeTab,
  onTabSelect,
  onActionSelect,
  onPressFab,
  isFabOpen: externalIsFabOpen,
}: CurvedBottomNavBarProps) {
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const barHeight = getTabBarHeight(insets.bottom);

  // Full-width bar, centered on wide viewports (matching Flutter maxWidth)
  const barWidth = Math.min(windowWidth, 440);
  const itemsLength = TABS.length;
  const slotWidth = barWidth / itemsLength;

  const [internalDrawerOpen, setInternalDrawerOpen] = useState(false);
  const isDrawerOpen =
    externalIsFabOpen !== undefined ? externalIsFabOpen : internalDrawerOpen;
  const toggleDrawer = onPressFab || (() => setInternalDrawerOpen((prev) => !prev));

  // Normalized position: ranges from 0.0 to (itemsLength - 1) / itemsLength
  // exactly matching Flutter's _pos variable in curved_navigation_bar.dart
  const initialPos = activeTab / itemsLength;
  const [posValue, setPosValue] = useState(initialPos);
  const posAnim = useRef(new Animated.Value(initialPos)).current;

  // Vertical submarine dive & surface physics (matching Flutter's _buttonHide formula)
  const bubbleDiveAnim = useRef(new Animated.Value(0)).current;

  // Icon morph scale bounce
  const bubbleIconScale = useRef(new Animated.Value(1)).current;
  const [displayedIconIndex, setDisplayedIconIndex] = useState(activeTab);
  const isFirstRender = useRef(true);

  // Frame listener driving the pure SVG path in real-time at 60 FPS
  useEffect(() => {
    const listenerId = posAnim.addListener(({ value }) => {
      setPosValue(value);
    });
    return () => {
      posAnim.removeListener(listenerId);
    };
  }, [posAnim]);

  useEffect(() => {
    const targetPos = activeTab / itemsLength;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      posAnim.setValue(targetPos);
      setPosValue(targetPos);
      return;
    }

    // 1. Horizontal glide: notch & bubble slide smoothly across the bar (Flutter easeInOut)
    Animated.timing(posAnim, {
      toValue: targetPos,
      duration: ANIM_DURATION,
      easing: Easing.bezier(0.42, 0.0, 0.58, 1.0),
      useNativeDriver: false,
    }).start();

    // 2. Submarine dive & surface physics (Flutter _buttonHide formula)
    Animated.sequence([
      // A. Submerge down into the scoop
      Animated.timing(bubbleDiveAnim, {
        toValue: 1,
        duration: ANIM_DURATION * 0.48,
        easing: Easing.in(Easing.quad),
        useNativeDriver: false,
      }),
      // B. Surface back up and pop into resting nestled position
      Animated.timing(bubbleDiveAnim, {
        toValue: 0,
        duration: ANIM_DURATION * 0.52,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: false,
      }),
    ]).start();

    // 3. Icon morph scale bounce inside the floating bubble
    Animated.sequence([
      Animated.timing(bubbleIconScale, {
        toValue: 0.35,
        duration: ANIM_DURATION * 0.4,
        useNativeDriver: false,
      }),
      Animated.timing(bubbleIconScale, {
        toValue: 1.0,
        duration: ANIM_DURATION * 0.6,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: false,
      }),
    ]).start();

    const timer = setTimeout(() => {
      setDisplayedIconIndex(activeTab);
    }, ANIM_DURATION * 0.48);

    return () => clearTimeout(timer);
  }, [activeTab, barWidth, itemsLength]);

  // Pure SVG Nav Bar Path (exact Flutter NavCustomPainter)
  const barPath = getFlutterNavPath(
    posValue,
    itemsLength,
    barWidth,
    barHeight,
    SCOOP_DEPTH
  );

  // Horizontal translation for the active circular bubble
  // Tracks exactly with posAnim: slotWidth * pos * itemsLength + (slotWidth / 2 - BUBBLE_RADIUS)
  const bubbleTranslateX = posAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      slotWidth / 2 - BUBBLE_RADIUS,
      barWidth + slotWidth / 2 - BUBBLE_RADIUS,
    ],
  });

  // Vertical dive translation: 0 = resting nestled, 1 = submerged behind the bar
  const bubbleTranslateY = bubbleDiveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 34],
  });

  const ActiveIcon = TABS[displayedIconIndex]?.icon || LayoutDashboard;

  return (
    <>
      <View
        pointerEvents="box-none"
        style={[
          styles.container,
          {
            height: barHeight + HEADROOM,
          },
        ]}
      >
        <View
          pointerEvents="box-none"
          style={[
            styles.barWrapper,
            {
              width: barWidth,
              height: barHeight + HEADROOM,
            },
          ]}
        >
          {/* ========================================================= */}
          {/* LAYER 1: Deeply Nestled Floating Bubble (Active Tab)      */}
          {/* In Flutter, the button is placed first in the Stack so it */}
          {/* cleanly dives BEHIND the solid bar during transitions.    */}
          {/* ========================================================= */}
          <Animated.View
            pointerEvents="box-none"
            style={[
              styles.bubbleContainer,
              {
                transform: [
                  {
                    translateX: bubbleTranslateX,
                  },
                  {
                    translateY: bubbleTranslateY,
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={toggleDrawer}
              style={styles.bubbleCircle}
              accessibilityLabel={`${TABS[activeTab]?.label} active. Tap for shortcuts.`}
            >
              <Animated.View
                style={{
                  transform: [{ scale: bubbleIconScale }],
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ActiveIcon size={22} color="#ffffff" strokeWidth={2.4} />
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>

          {/* ========================================================= */}
          {/* LAYER 2: Pure SVG Monolithic Bar Background               */}
          {/* Exact Flutter NavCustomPainter path filled with Rose.     */}
          {/* ========================================================= */}
          <Svg
            width={barWidth}
            height={barHeight}
            viewBox={`0 0 ${barWidth} ${barHeight}`}
            style={styles.svgBar}
            pointerEvents="none"
          >
            <Path d={barPath} fill="#e11d48" />
          </Svg>

          {/* ========================================================= */}
          {/* LAYER 3: Dynamic Resting Tab Buttons (Flutter NavButton)  */}
          {/* Dynamically ducks down & fades out when notch approaches. */}
          {/* Anchored to top active zone above system navigation insets.*/}
          {/* ========================================================= */}
          <View
            style={[
              styles.tabsRow,
              {
                top: HEADROOM,
                height: BAR_BASE_HEIGHT,
                width: barWidth,
              },
            ]}
          >
            {TABS.map((tab, index) => {
              const Icon = tab.icon;
              const desiredPos = index / itemsLength;
              const span = 1.0 / itemsLength;

              // Flutter NavButton: opacity = length * difference
              const restingOpacity = posAnim.interpolate({
                inputRange: [desiredPos - span, desiredPos, desiredPos + span],
                outputRange: [1.0, 0.0, 1.0],
                extrapolate: "clamp",
              });

              // Flutter NavButton: verticalAlignment = 1 - length * difference (pushed down)
              const restingTranslateY = posAnim.interpolate({
                inputRange: [desiredPos - span, desiredPos, desiredPos + span],
                outputRange: [0, 16, 0],
                extrapolate: "clamp",
              });

              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => onTabSelect(tab.id)}
                  activeOpacity={0.7}
                  style={styles.tabItem}
                  accessibilityLabel={tab.label}
                >
                  <Animated.View
                    style={{
                      opacity: restingOpacity,
                      transform: [{ translateY: restingTranslateY }],
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon
                      size={20}
                      color="rgba(255, 255, 255, 0.94)"
                      strokeWidth={2.15}
                    />
                    <Text numberOfLines={1} style={styles.tabLabel}>
                      {tab.label}
                    </Text>
                  </Animated.View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Atelier Floor Quick Action Drawer */}
      <QuickActionDrawer
        isOpen={isDrawerOpen}
        onClose={() => setInternalDrawerOpen(false)}
        onSelectAction={onActionSelect}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    alignItems: "center", // Center barWrapper on wide screens/desktop web
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
      android: {
        elevation: 8,
      },
      default: {
        filter: "drop-shadow(0px -3px 6px rgba(0, 0, 0, 0.12))",
      },
    }),
  },
  tabsRow: {
    position: "absolute",
    top: HEADROOM,
    left: 0,
    height: BAR_BASE_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 46,
  },
  tabItem: {
    flex: 1,
    height: BAR_BASE_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleContainer: {
    position: "absolute",
    // Bar top edge starts at y = HEADROOM (13px) in barWrapper; scoop valley reaches y = 13 + 42 = 55px.
    // Placing top at 1px:
    // - Top crown rises 12px above the bar top line (y = 1 vs y = 13).
    // - Bottom of bubble sits at y = 1 + 48 = 49px.
    // - Bottom space clearance = 55px - 49px = 6px uniform crescent gap cradling the circle.
    top: 1,
    left: 0,
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    zIndex: 35, // Positioned behind the SVG bar so it dives under the bar during transitions
  },
  bubbleCircle: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_RADIUS,
    backgroundColor: "#e11d48", // Brand Rose
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
      android: {
        elevation: 10,
      },
      default: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 6,
      },
    }),
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.94)",
    marginTop: 2,
    letterSpacing: 0.1,
  },
});
