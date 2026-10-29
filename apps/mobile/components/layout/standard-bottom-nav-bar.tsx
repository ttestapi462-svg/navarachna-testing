import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  LayoutDashboard,
  MoreHorizontal,
  Receipt,
  ShoppingBag,
  Users,
  type LucideIcon,
} from "lucide-react-native";
import { mobileTheme } from "../../constants/theme";
import { BAR_BASE_HEIGHT, getSafeBottom } from "../../constants/layout";

export type MobileTabRoute = "index" | "orders" | "customer" | "expense" | "more";

export interface CurvedBottomNavBarProps {
  activeRoute: string;
  onTabSelect: (routeName: MobileTabRoute) => void;
}

const tabs: Array<{ route: MobileTabRoute; label: string; icon: LucideIcon }> = [
  { route: "index", label: "Home", icon: LayoutDashboard },
  { route: "orders", label: "Orders", icon: ShoppingBag },
  { route: "customer", label: "Clients", icon: Users },
  { route: "expense", label: "Expenses", icon: Receipt },
  { route: "more", label: "More", icon: MoreHorizontal },
];

function activeTabFor(pathname: string): MobileTabRoute | null {
  const path = (pathname || "").split("?")[0].replace(/\/$/, "");
  if (!path || path === "/" || path.endsWith("/(tabs)") || path.endsWith("/index")) return "index";
  if (path.endsWith("/orders")) return "orders";
  if (path.endsWith("/customer")) return "customer";
  if (path.endsWith("/expense")) return "expense";
  if (path.endsWith("/more") || path.includes("/more/")) return "more";
  return null;
}

export function CurvedBottomNavBar({ activeRoute, onTabSelect }: CurvedBottomNavBarProps) {
  const insets = useSafeAreaInsets();
  const safeBottom = getSafeBottom(insets.bottom);
  const activeTab = activeTabFor(activeRoute);

  return (
    <View pointerEvents="box-none" style={styles.container}>
      <View style={[styles.bar, { minHeight: BAR_BASE_HEIGHT + safeBottom, paddingBottom: safeBottom }]}>
        {tabs.map(({ route, label, icon: Icon }) => {
          const selected = activeTab === route;
          return (
            <Pressable
              key={route}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected }}
              aria-current={selected ? "page" : undefined}
              onPress={() => onTabSelect(route)}
              style={styles.tab}
            >
              <View style={[styles.tabContent, selected && styles.tabContentActive]}>
                <Icon
                  size={19}
                  color={selected ? mobileTheme.color.primary : mobileTheme.color.muted}
                  strokeWidth={selected ? 2.3 : 1.9}
                />
                <Text style={[styles.label, selected && styles.labelActive]} numberOfLines={1}>
                  {label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
  },
  bar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 9,
    paddingHorizontal: 10,
    backgroundColor: mobileTheme.color.surface,
    borderTopWidth: 1,
    borderTopColor: mobileTheme.color.border,
    ...Platform.select({
      ios: { shadowColor: "#211d1b", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.055, shadowRadius: 10 },
      android: { elevation: 10 },
      default: { boxShadow: "0 -4px 14px rgba(33, 29, 27, 0.055)" },
    }),
  },
  tab: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  tabContent: {
    minWidth: 54,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  tabContentActive: {
    backgroundColor: mobileTheme.color.primaryTint,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    color: mobileTheme.color.muted,
    letterSpacing: 0,
  },
  labelActive: {
    color: mobileTheme.color.primaryDark,
    fontWeight: "700",
  },
});
