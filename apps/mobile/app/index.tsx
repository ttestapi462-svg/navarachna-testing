import { useEffect } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { getAuthToken, mobileApiClient, clearAuthTokens } from "../lib/api-client";
import { StudioLoader } from "../components/brand/StudioLoader";

export default function RootEntryScreen() {
  const router = useRouter();

  useEffect(() => {
    async function determineInitialRoute() {
      // Ensure the elegant launch branding is visible for at least 1.4s
      const minLaunchDelay = new Promise((resolve) => setTimeout(resolve, 1400));

      try {
        const token = await getAuthToken();
        if (!token) {
          await minLaunchDelay;
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

          await minLaunchDelay;
          if (check.isAuthenticated) {
            router.replace("/(tabs)");
          } else {
            await clearAuthTokens();
            router.replace("/(auth)/login");
          }
        } catch (err: unknown) {
          await minLaunchDelay;
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
        await minLaunchDelay;
        router.replace("/(auth)/login");
      }
    }

    determineInitialRoute();
  }, [router]);

  return (
    <View style={{ flex: 1, backgroundColor: "#FAF7F2" }}>
      <StatusBar style="dark" />
      <StudioLoader
        statusText="Verifying Active Session..."
        size={104}
      />
    </View>
  );
}
