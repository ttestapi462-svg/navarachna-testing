import React from "react";
import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getTabBarContentPadding } from "../../constants/layout";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-slate-50 items-center justify-center p-6"
      style={{ paddingBottom: getTabBarContentPadding(insets.bottom) }}
    >
      <Text className="text-2xl font-bold tracking-tight text-slate-800">
        Dashboard
      </Text>
    </View>
  );
}
