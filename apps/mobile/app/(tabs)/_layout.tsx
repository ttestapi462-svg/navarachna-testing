import React from "react";
import { Alert } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { CurvedBottomNavBar } from "../../components/layout/curved-bottom-nav-bar";
import { AtelierHeader } from "../../components/layout/atelier-header";

export default function TabLayout() {
  const router = useRouter();

  const handleActionSelect = (actionId: string) => {
    switch (actionId) {
      case "new_order":
      case "stage_handoff":
        router.push("/(tabs)/orders");
        break;
      case "record_measurements":
        router.push("/(tabs)/customer");
        break;
      case "scan_tag":
        Alert.alert(
          "Garment QR Scanner",
          "Point the camera at the physical order hangtag on the atelier cutting table."
        );
        break;
      default:
        break;
    }
  };

  return (
    <Tabs
      tabBar={(props) => (
        <CurvedBottomNavBar
          activeTab={props.state.index}
          onTabSelect={(index) => {
            const targetRoute = props.state.routes[index];
            if (targetRoute) {
              const event = props.navigation.emit({
                type: "tabPress",
                target: targetRoute.key,
                canPreventDefault: true,
              });

              if (!event.defaultPrevented) {
                props.navigation.navigate(targetRoute.name);
              }
            }
          }}
          onActionSelect={handleActionSelect}
        />
      )}
      screenOptions={{
        header: () => (
          <AtelierHeader
            userName="Master Priya"
            isOnline={true}
            onPressProfile={() => {
              Alert.alert(
                "Operator Security Profile",
                "Single-Device Session: iPhone 16 Pro (Mobile Companion)\nAuth State: Valid JWT Token"
              );
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
      {/* Slot 0: Dashboard */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
        }}
      />

      {/* Slot 1: Orders */}
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
        }}
      />

      {/* Slot 2: Customer */}
      <Tabs.Screen
        name="customer"
        options={{
          title: "Customer",
        }}
      />

      {/* Slot 3: Expense */}
      <Tabs.Screen
        name="expense"
        options={{
          title: "Expense",
        }}
      />

      {/* Slot 4: More */}
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
        }}
      />
    </Tabs>
  );
}
