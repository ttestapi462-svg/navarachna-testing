import { useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Layers } from "lucide-react-native";
import { getAuthToken, mobileApiClient, clearAuthTokens } from "../lib/api-client";

export default function RootEntryScreen() {
  const router = useRouter();

  useEffect(() => {
    async function determineInitialRoute() {
      try {
        const token = await getAuthToken();
        if (!token) {
          router.replace("/(auth)/login");
          return;
        }

        // Fast timeout-guarded preflight check to verify session isn't superseded before rendering tabs
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("preflight_timeout")), 2000)
          );
          const check = await Promise.race([
            mobileApiClient<{ isAuthenticated: boolean }>("/api/auth/me"),
            timeoutPromise,
          ]) as { isAuthenticated: boolean };

          if (check.isAuthenticated) {
            router.replace("/(tabs)");
          } else {
            await clearAuthTokens();
            router.replace("/(auth)/login");
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "";
          if (msg.includes("superseded") || msg.includes("terminated")) {
            await clearAuthTokens();
            router.replace("/(auth)/login");
          } else {
            // Network offline or timeout: allow offline load to tabs
            router.replace("/(tabs)");
          }
        }
      } catch {
        router.replace("/(auth)/login");
      }
    }

    determineInitialRoute();
  }, [router]);

  return (
    <View className="flex-1 bg-slate-50 items-center justify-center p-6">
      <StatusBar style="dark" />
      <View className="w-14 h-14 rounded-2xl bg-white border border-rose-200/80 items-center justify-center mb-4 shadow-xs">
        <Layers size={28} color="#e11d48" strokeWidth={2} />
      </View>
      <Text className="text-lg font-bold text-slate-900 text-center tracking-tight">
        Navarachna Studio
      </Text>
      <Text className="text-[11px] text-rose-600 font-semibold tracking-wider uppercase mt-1 mb-5 text-center">
        Haute Couture Atelier
      </Text>
      <ActivityIndicator size="small" color="#e11d48" />
    </View>
  );
}
