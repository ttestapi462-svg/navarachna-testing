import "../global.css";
import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Blob as ExpoBlob } from "expo-blob";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { registerSessionSupersededHandler } from "../lib/api-client";
import { ToastProvider } from "../components/ui/toast-provider";

// Expo's fetch implementation falls back to React Native's Blob unless the
// Expo Blob implementation is installed globally before any bill requests run.
if (globalThis.Blob !== ExpoBlob) {
  Object.defineProperty(globalThis, "Blob", {
    configurable: true,
    writable: true,
    value: ExpoBlob,
  });
}

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    registerSessionSupersededHandler(() => {
      router.replace("/(auth)/login");
    });
  }, [router]);

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar style="dark" />
      <ToastProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#f8fafc" },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </ToastProvider>
    </SafeAreaProvider>
  );
}

