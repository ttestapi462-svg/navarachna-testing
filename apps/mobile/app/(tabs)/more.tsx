import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  QrCode,
  Ruler,
  Scissors,
  Layers,
  Settings,
  Bell,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Sparkles,
  Smartphone,
  Info,
} from "lucide-react-native";
import { clearAuthTokens } from "../../lib/api-client";
import { getTabBarContentPadding } from "../../constants/layout";

export default function MoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleLogout = async () => {
    Alert.alert(
      "End Shift & Sign Out",
      "Are you sure you want to sign out from this device?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await clearAuthTokens();
            router.replace("/(auth)/login");
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{
        padding: 16,
        paddingBottom: getTabBarContentPadding(insets.bottom),
      }}
    >
      {/* Operator Master Profile Card */}
      <View className="bg-white border border-slate-200/90 rounded-3xl p-4 mb-4 shadow-xs">
        <View className="flex-row items-center gap-3.5">
          <View className="w-14 h-14 rounded-2xl bg-rose-600 items-center justify-center shadow-xs">
            <Text className="text-xl font-black text-white">MP</Text>
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-lg font-extrabold text-slate-900">
                Master Priya
              </Text>
              <View className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <Text className="text-[10px] font-bold text-emerald-700">Active Shift</Text>
              </View>
            </View>
            <Text className="text-xs text-slate-500 font-medium mt-0.5">
              Executive Atelier Tailor • Single-Device Protected
            </Text>
          </View>
        </View>

        <View className="mt-3.5 pt-3 border-t border-slate-100 flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5">
            <Smartphone size={13} color="#64748b" />
            <Text className="text-xs text-slate-600 font-medium">
              iPhone 16 Pro (Mobile Companion)
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <ShieldCheck size={13} color="#10b981" />
            <Text className="text-xs font-semibold text-emerald-600">Verified</Text>
          </View>
        </View>
      </View>

      {/* Atelier Floor Utilities */}
      <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
        Atelier Floor Operations
      </Text>
      <View className="bg-white border border-slate-200/90 rounded-3xl p-1 mb-4 shadow-xs">
        <TouchableOpacity
          onPress={() =>
            Alert.alert(
              "Garment QR Scanner",
              "Camera initialized to scan physical garment order hangtags."
            )
          }
          activeOpacity={0.7}
          className="flex-row items-center justify-between p-3.5 border-b border-slate-100"
        >
          <View className="flex-row items-center gap-3">
            <View className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 items-center justify-center">
              <QrCode size={18} color="#e11d48" />
            </View>
            <View>
              <Text className="text-sm font-bold text-slate-900">
                Garment Hangtag Scanner
              </Text>
              <Text className="text-xs text-slate-500">
                Scan QR on cutting table work tickets
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color="#cbd5e1" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            Alert.alert(
              "Measurement Templates",
              "Standard sizing chart: S, M, L, XL, Plus & bespoke bridal matrices."
            )
          }
          activeOpacity={0.7}
          className="flex-row items-center justify-between p-3.5 border-b border-slate-100"
        >
          <View className="flex-row items-center gap-3">
            <View className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 items-center justify-center">
              <Ruler size={18} color="#e11d48" />
            </View>
            <View>
              <Text className="text-sm font-bold text-slate-900">
                Measurement Preset Library
              </Text>
              <Text className="text-xs text-slate-500">
                Standard & custom tailoring matrices
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color="#cbd5e1" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            Alert.alert(
              "Production Handoff",
              "Advance garment from Cutting to Stitching or Hand Embroidery."
            )
          }
          activeOpacity={0.7}
          className="flex-row items-center justify-between p-3.5"
        >
          <View className="flex-row items-center gap-3">
            <View className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 items-center justify-center">
              <Scissors size={18} color="#e11d48" />
            </View>
            <View>
              <Text className="text-sm font-bold text-slate-900">
                Production Stage Handoff
              </Text>
              <Text className="text-xs text-slate-500">
                Move garments between tailoring stations
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color="#cbd5e1" />
        </TouchableOpacity>
      </View>

      {/* Preferences & System */}
      <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
        Preferences & System
      </Text>
      <View className="bg-white border border-slate-200/90 rounded-3xl p-1 mb-4 shadow-xs">
        <TouchableOpacity
          onPress={() =>
            Alert.alert(
              "Atelier Studio Preferences",
              "Default measurement unit: Inches (Imperial Standard)\nAuto-sync: Real-time SignalR active"
            )
          }
          activeOpacity={0.7}
          className="flex-row items-center justify-between p-3.5 border-b border-slate-100"
        >
          <View className="flex-row items-center gap-3">
            <View className="w-9 h-9 rounded-xl bg-slate-100 items-center justify-center">
              <Settings size={18} color="#475569" />
            </View>
            <View>
              <Text className="text-sm font-bold text-slate-900">
                Studio Preferences
              </Text>
              <Text className="text-xs text-slate-500">
                Units, language, auto-ticket print
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color="#cbd5e1" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            Alert.alert(
              "System Info",
              "Navarachna Atelier Companion v2.0\nSignalR Live Hub: Connected\nAPI Endpoint: Active"
            )
          }
          activeOpacity={0.7}
          className="flex-row items-center justify-between p-3.5"
        >
          <View className="flex-row items-center gap-3">
            <View className="w-9 h-9 rounded-xl bg-slate-100 items-center justify-center">
              <Info size={18} color="#475569" />
            </View>
            <View>
              <Text className="text-sm font-bold text-slate-900">
                About & Diagnostics
              </Text>
              <Text className="text-xs text-slate-500">
                Version 2.0 • Real-time backend
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color="#cbd5e1" />
        </TouchableOpacity>
      </View>

      {/* Logout Action */}
      <TouchableOpacity
        onPress={handleLogout}
        activeOpacity={0.8}
        className="bg-white border border-rose-200 rounded-3xl p-4 flex-row items-center justify-center gap-2 mb-2 shadow-xs"
      >
        <LogOut size={18} color="#e11d48" />
        <Text className="text-sm font-bold text-rose-600">
          Sign Out of Atelier Session
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
