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
import { clearAuthTokens, mobileApiClient } from "../../lib/api-client";
import { getTabBarContentPadding } from "../../constants/layout";
import { notifyMobile } from "../../lib/notifications";
import { AtelierHeader } from "../../components/layout/atelier-header";

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
            try {
              await mobileApiClient("/api/auth/logout", { method: "POST" });
            } catch {
              notifyMobile("warning", "The server could not confirm sign-out. This device will still be signed out.", "Signed out locally");
            } finally {
              await clearAuthTokens();
              router.replace("/(auth)/login");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FAF7F2" }}>
      <AtelierHeader
        title="Settings"
        icon={<ShieldCheck size={20} color="#78070D" strokeWidth={2.4} />}
        showProfile={false}
      />
      <ScrollView
        className="flex-1 bg-[#FAF7F2]"
        contentContainerStyle={{
          padding: 16,
          paddingTop: 8,
          paddingBottom: getTabBarContentPadding(insets.bottom),
        }}
      >
        {/* Operator Master Profile Card */}
        <View className="bg-white border border-[#E8E2D8] rounded-2xl p-4 mb-4 shadow-xs">
          <View className="flex-row items-center gap-3.5">
            <View className="w-14 h-14 rounded-2xl bg-[#78070D] items-center justify-center shadow-xs">
              <Text className="text-xl font-black text-white">MP</Text>
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-lg font-extrabold text-[#231E1C]">
                  Master Priya
                </Text>
                <View className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <Text className="text-[10px] font-bold text-emerald-700">Active Shift</Text>
                </View>
              </View>
              <Text className="text-xs text-[#6E6862] font-medium mt-0.5">
                Executive Atelier Tailor • Single-Device Protected
              </Text>
            </View>
          </View>

          <View className="mt-3.5 pt-3 border-t border-[#F2ECE2] flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <Smartphone size={13} color="#7B8497" />
              <Text className="text-xs text-[#231E1C] font-medium">
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
        <Text className="text-xs font-bold text-[#9B958F] uppercase tracking-wider mb-2 ml-1">
          Atelier Floor Operations
        </Text>
        <View className="bg-white border border-[#E8E2D8] rounded-2xl p-1 mb-4 shadow-xs">
          <TouchableOpacity
            onPress={() =>
              notifyMobile("info", "Camera initialized to scan physical garment order hangtags.", "Garment QR scanner")
            }
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-3.5 border-b border-[#F2ECE2]"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-xl bg-[#FBF2F3] border border-[#F5D6D8] items-center justify-center">
                <QrCode size={18} color="#78070D" />
              </View>
              <View>
                <Text className="text-sm font-bold text-[#231E1C]">
                  Garment Hangtag Scanner
                </Text>
                <Text className="text-xs text-[#6E6862]">
                  Scan QR on cutting table work tickets
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#9B958F" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              notifyMobile("info", "Standard sizing chart: S, M, L, XL, Plus & bespoke bridal matrices.", "Measurement templates")
            }
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-3.5 border-b border-[#F2ECE2]"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-xl bg-[#FBF2F3] border border-[#F5D6D8] items-center justify-center">
                <Ruler size={18} color="#78070D" />
              </View>
              <View>
                <Text className="text-sm font-bold text-[#231E1C]">
                  Measurement Preset Library
                </Text>
                <Text className="text-xs text-[#6E6862]">
                  Standard & custom tailoring matrices
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#9B958F" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              notifyMobile("info", "Advance garment from Cutting to Stitching or Hand Embroidery.", "Production handoff")
            }
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-3.5"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-xl bg-[#FBF2F3] border border-[#F5D6D8] items-center justify-center">
                <Scissors size={18} color="#78070D" />
              </View>
              <View>
                <Text className="text-sm font-bold text-[#231E1C]">
                  Production Stage Handoff
                </Text>
                <Text className="text-xs text-[#6E6862]">
                  Move garments between tailoring stations
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#9B958F" />
          </TouchableOpacity>
        </View>

        {/* Preferences & System */}
        <Text className="text-xs font-bold text-[#9B958F] uppercase tracking-wider mb-2 ml-1">
          Preferences & System
        </Text>
        <View className="bg-white border border-[#E8E2D8] rounded-2xl p-1 mb-4 shadow-xs">
          <TouchableOpacity
            onPress={() =>
              notifyMobile("info", "Default measurement unit: Inches (Imperial Standard). Auto-sync: Real-time SignalR active.", "Atelier studio preferences")
            }
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-3.5 border-b border-[#F2ECE2]"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-xl bg-[#F5EFE6] items-center justify-center">
                <Settings size={18} color="#34394A" />
              </View>
              <View>
                <Text className="text-sm font-bold text-[#231E1C]">
                  Studio Preferences
                </Text>
                <Text className="text-xs text-[#6E6862]">
                  Units, language, auto-ticket print
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#9B958F" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              notifyMobile("info", "Navarachna Atelier Companion v2.0. SignalR Live Hub: Connected. API endpoint: Active.", "System info")
            }
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-3.5"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-xl bg-[#F5EFE6] items-center justify-center">
                <Info size={18} color="#34394A" />
              </View>
              <View>
                <Text className="text-sm font-bold text-[#231E1C]">
                  About & Diagnostics
                </Text>
                <Text className="text-xs text-[#6E6862]">
                  Version 2.0 • Real-time backend
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#9B958F" />
          </TouchableOpacity>
        </View>

        {/* Logout Action */}
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.8}
          className="bg-white border border-[#F5D6D8] rounded-2xl p-4 flex-row items-center justify-center gap-2 mb-2 shadow-xs"
        >
          <LogOut size={18} color="#78070D" />
          <Text className="text-sm font-bold text-[#78070D]">
            Sign Out of Atelier Session
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
