import React from "react";
import { Tabs, usePathname, useRouter, type Href } from "expo-router";
import {
  CurvedBottomNavBar as LegacyCurvedBottomNavBar,
  type MobileTabRoute,
} from "../../components/layout/curved-bottom-nav-bar";

export default function TabLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const tabHrefs: Record<MobileTabRoute, Href> = {
    index: "/(tabs)",
    orders: "/(tabs)/orders",
    customer: "/(tabs)/customer",
    expense: "/(tabs)/expense",
    more: "/(tabs)/more",
  };

  return (
    <Tabs
      tabBar={({ insets }) => (
        <LegacyCurvedBottomNavBar
          activeRoute={pathname}
          safeAreaBottom={insets.bottom}
          onTabSelect={(routeName) => router.navigate(tabHrefs[routeName])}
        />
      )}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="orders" options={{ title: "Orders" }} />
      <Tabs.Screen name="customer" options={{ title: "Customer" }} />
      <Tabs.Screen name="expense" options={{ title: "Expense" }} />
      <Tabs.Screen name="more" options={{ title: "More" }} />
    </Tabs>
  );
}
