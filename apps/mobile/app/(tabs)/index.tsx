import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useEffect, useState } from "react";
import { mobileApiClient, getApiBaseUrl } from "../../lib/api-client";

interface HealthStatus {
  status: string;
  service: string;
}

export default function MobileHomeScreen() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const checkConnectivity = async () => {
    setLoading(true);
    try {
      const data = await mobileApiClient<HealthStatus>("/health");
      setHealth(data);
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkConnectivity();
  }, []);

  return (
    <ScrollView className="flex-1 bg-slate-50 p-4">
      <View className="mb-6 rounded-2xl bg-blue-600 p-6 shadow-md">
        <Text className="text-2xl font-bold text-white">Navarachna Mobile</Text>
        <Text className="mt-1 text-sm text-blue-100">Studio Admin Companion</Text>
      </View>

      <View className="mb-4 rounded-xl bg-white p-5 border border-slate-200 shadow-xs">
        <Text className="text-base font-semibold text-slate-800">API Connection</Text>
        <Text className="mt-1 text-xs text-slate-500">
          Target: {getApiBaseUrl()}
        </Text>
        <Text className="mt-0.5 text-xs text-slate-500">
          Status: {loading ? "Checking..." : health ? `Connected (${health.service})` : "Disconnected"}
        </Text>
        <TouchableOpacity
          onPress={checkConnectivity}
          className="mt-4 rounded-lg bg-slate-900 py-2.5 px-4 items-center"
        >
          <Text className="font-semibold text-white text-xs">Ping Backend API</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
