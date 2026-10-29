import React from "react";
import { Tabs, usePathname, useRouter, type Href } from "expo-router";
import {
  CurvedBottomNavBar as LegacyCurvedBottomNavBar,
  type MobileTabRoute,
} from "../../components/layout/curved-bottom-nav-bar";
import { AtelierHeader } from "../../components/layout/atelier-header";
import { notifyMobile } from "../../lib/notifications";

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
        header: () => (
          <AtelierHeader
            userName="Master Priya"
            isOnline={true}
            onPressProfile={() => {
              notifyMobile("info", "Sign-out is available in More.", "Operator security profile");
            }}
          />
        ),
        headerShown: true,
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: "#f8fafc",
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="orders" options={{ title: "Orders" }} />
      <Tabs.Screen name="customer" options={{ title: "Customer" }} />
      <Tabs.Screen name="expense" options={{ title: "Expense", headerShown: false }} />
      <Tabs.Screen name="more" options={{ title: "More" }} />
    </Tabs>
  );
}
