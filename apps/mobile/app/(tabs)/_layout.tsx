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

  const handleTabSelect = (routeName: MobileTabRoute) => {
    if (routeName === "customer") {
      router.navigate({
        pathname: "/(tabs)/customer",
        params: { resetNav: Date.now().toString() },
      });
    } else {
      router.navigate(tabHrefs[routeName]);
    }
  };

  return (
    <Tabs
      tabBar={({ insets }) => (
        <LegacyCurvedBottomNavBar
          activeRoute={pathname}
          safeAreaBottom={insets.bottom}
          onTabSelect={handleTabSelect}
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
