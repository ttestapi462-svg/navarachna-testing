import { Platform } from "react-native";
import { Tabs } from "expo-router";
import { Home, ShoppingBag } from "lucide-react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#e11d48",
        tabBarInactiveTintColor: "#64748b",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#e2e8f0",
          borderTopWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
          height: Platform.OS === "ios" ? 84 : 60,
          paddingBottom: Platform.OS === "ios" ? 28 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        headerStyle: {
          backgroundColor: "#ffffff",
          borderBottomColor: "#f1f5f9",
          borderBottomWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: "#0f172a",
        headerTitleStyle: {
          fontWeight: "700",
          fontSize: 16,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Studio Overview",
          tabBarLabel: "Overview",
          tabBarIcon: ({ color, focused }) => (
            <Home
              size={20}
              color={typeof color === "string" ? color : "#e11d48"}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Atelier Orders",
          tabBarLabel: "Orders",
          tabBarIcon: ({ color, focused }) => (
            <ShoppingBag
              size={20}
              color={typeof color === "string" ? color : "#64748b"}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
    </Tabs>
  );
}
