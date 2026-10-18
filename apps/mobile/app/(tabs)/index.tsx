import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  AppState,
  AppStateStatus,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Layers,
  CheckCircle2,
  Smartphone,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Scissors,
  Clock,
  ShoppingBag,
  ArrowRight,
} from "lucide-react-native";
import {
  mobileApiClient,
  getApiBaseUrl,
  clearAuthTokens,
  getAuthToken,
  registerSessionSupersededHandler,
} from "../../lib/api-client";
import { initMobileAuthHub } from "../../lib/auth-hub";

interface HealthStatus {
  status: string;
  service: string;
}

interface UserProfile {
  id: number;
  username: string;
  email?: string;
  firstName: string;
  lastName?: string;
  activeDeviceName?: string;
  sessionStartedAt?: string;
  createdAt?: string;
  createdBy?: number;
  updatedAt?: string;
  updatedBy?: number;
}

export default function MobileHomeScreen() {
  const router = useRouter();

  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const fetchUserProfile = async (silent = false) => {
    if (!silent) setAuthLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        setUser(null);
        router.replace("/(auth)/login");
        return;
      }
      const data = await mobileApiClient<{
        isAuthenticated: boolean;
        user?: UserProfile;
      }>("/api/auth/me");
      if (data.isAuthenticated && data.user) {
        setUser(data.user);
      } else {
        await clearAuthTokens();
        setUser(null);
        router.replace("/(auth)/login");
      }
    } catch {
      await clearAuthTokens();
      setUser(null);
      router.replace("/(auth)/login");
    } finally {
      if (!silent) setAuthLoading(false);
    }
  };

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

  const handleLogout = async () => {
    try {
      await mobileApiClient("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignored
    } finally {
      await clearAuthTokens();
      setUser(null);
      router.replace("/(auth)/login");
    }
  };

  useEffect(() => {
    registerSessionSupersededHandler(() => {
      setUser(null);
      router.replace("/(auth)/login");
    });

    const cleanupHub = initMobileAuthHub(() => {
      setUser(null);
      router.replace("/(auth)/login");
    });

    checkConnectivity();
    fetchUserProfile();

    // Active session heartbeat: Poll every 8s while app is actively foregrounded
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

    const startHeartbeat = () => {
      if (!heartbeatTimer) {
        heartbeatTimer = setInterval(() => {
          fetchUserProfile(true);
        }, 8000);
      }
    };

    const stopHeartbeat = () => {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    };

    startHeartbeat();

    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState === "active") {
        fetchUserProfile(true);
        startHeartbeat();
      } else {
        stopHeartbeat();
      }
    });

    return () => {
      cleanupHub();
      stopHeartbeat();
      subscription.remove();
    };
  }, []);

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 18 }}>
      <StatusBar style="dark" />

      {/* Top Banner / Atelier Greeting Card */}
      <View className="bg-white border border-slate-200/90 rounded-3xl p-5 mb-4 shadow-xs">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3.5">
            <View className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/90 items-center justify-center">
              <Layers size={26} color="#e11d48" strokeWidth={2} />
            </View>
            <View>
              <Text className="text-lg font-extrabold text-slate-900 leading-tight">
                Navarachna Atelier
              </Text>
              <Text className="text-xs text-slate-500 font-medium mt-0.5">
                {user ? `Hello, ${user.firstName}` : "Executive Mobile Console"}
              </Text>
            </View>
          </View>

          {/* Live Status Pill */}
          <View className="flex-row items-center bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full gap-1.5">
            <View className="w-2 h-2 rounded-full bg-emerald-500" />
            <Text className="text-xs font-semibold text-emerald-700">Online</Text>
          </View>
        </View>
      </View>

      {/* Atelier KPI Metrics (3-Card Row) */}
      <View className="flex-row gap-3 mb-4">
        {/* Metric 1 */}
        <View className="flex-1 bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-semibold text-slate-500">Orders</Text>
            <Scissors size={16} color="#e11d48" strokeWidth={2} />
          </View>
          <Text className="text-2xl font-black text-slate-900">18</Text>
          <Text className="text-xs text-emerald-600 font-bold mt-1">+3 today</Text>
        </View>

        {/* Metric 2 */}
        <View className="flex-1 bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-semibold text-slate-500">Cutting</Text>
            <Clock size={16} color="#e11d48" strokeWidth={2} />
          </View>
          <Text className="text-2xl font-black text-slate-900">7</Text>
          <Text className="text-xs text-slate-500 font-medium mt-1">Active</Text>
        </View>

        {/* Metric 3 */}
        <View className="flex-1 bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-semibold text-slate-500">Ready</Text>
            <CheckCircle2 size={16} color="#10b981" strokeWidth={2} />
          </View>
          <Text className="text-2xl font-black text-slate-900">5</Text>
          <Text className="text-xs text-slate-500 font-medium mt-1">Dispatches</Text>
        </View>
      </View>

      {/* Active Security Session Card */}
      <View className="bg-white border border-slate-200/90 rounded-3xl p-5 mb-4 shadow-xs">
        <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <View className="flex-row items-center gap-2.5">
            <ShieldCheck size={22} color="#e11d48" strokeWidth={2} />
            <Text className="text-base font-bold text-slate-900">
              Active Security Session
            </Text>
          </View>
          <View className="bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
            <Text className="text-xs font-semibold text-rose-700">JWT Token</Text>
          </View>
        </View>

        {authLoading ? (
          <ActivityIndicator color="#e11d48" size="small" className="py-4" />
        ) : user ? (
          <View>
            {/* User & Device Details */}
            <View className="space-y-2.5 mb-4">
              <View className="flex-row justify-between items-center py-1.5">
                <Text className="text-sm text-slate-500 font-medium">Operator</Text>
                <Text className="text-sm font-bold text-slate-900">
                  {user.firstName} {user.lastName || ""} (@{user.username})
                </Text>
              </View>

              {user.email && (
                <View className="flex-row justify-between items-center py-1.5 border-t border-slate-100">
                  <Text className="text-sm text-slate-500 font-medium">Email</Text>
                  <Text className="text-sm font-semibold text-slate-700">{user.email}</Text>
                </View>
              )}

              <View className="flex-row justify-between items-center py-1.5 border-t border-slate-100">
                <Text className="text-sm text-slate-500 font-medium">Linked Device</Text>
                <View className="flex-row items-center gap-2">
                  <Smartphone size={16} color="#e11d48" strokeWidth={2} />
                  <Text className="text-xs font-bold text-rose-700 font-mono">
                    {user.activeDeviceName || "Mobile Companion App"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Logout Action */}
            <TouchableOpacity
              onPress={handleLogout}
              activeOpacity={0.8}
              className="h-11 rounded-2xl border border-rose-200 bg-rose-50/70 items-center flex-row justify-center gap-2"
            >
              <LogOut size={16} color="#e11d48" strokeWidth={2} />
              <Text className="font-bold text-rose-700 text-xs">
                Sign Out & Release Session
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="py-2 items-center">
            <Text className="text-sm text-slate-500 text-center mb-3.5">
              No authenticated session detected.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/login")}
              activeOpacity={0.85}
              className="rounded-2xl bg-rose-600 px-6 py-3 items-center"
            >
              <Text className="font-bold text-white text-sm">
                Sign In to Connect
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Quick Navigation Action to Orders */}
      <TouchableOpacity
        onPress={() => router.push("/(tabs)/orders")}
        activeOpacity={0.8}
        className="bg-white border border-slate-200/90 rounded-3xl p-4 mb-4 shadow-xs flex-row items-center justify-between"
      >
        <View className="flex-row items-center gap-3.5">
          <View className="w-11 h-11 rounded-2xl bg-slate-100 items-center justify-center">
            <ShoppingBag size={22} color="#0f172a" strokeWidth={2} />
          </View>
          <View>
            <Text className="text-sm font-bold text-slate-900">
              Manage Atelier Orders
            </Text>
            <Text className="text-xs text-slate-500 font-medium">
              5 orders currently in progress
            </Text>
          </View>
        </View>
        <ArrowRight size={18} color="#94a3b8" strokeWidth={2} />
      </TouchableOpacity>

      {/* Backend API Health & Connectivity */}
      <View className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-sm font-bold text-slate-900">
            Backend Diagnostics
          </Text>
          <View className="flex-row items-center gap-2">
            <View
              className={`w-2.5 h-2.5 rounded-full ${
                health?.status === "Healthy" ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
            <Text className="text-xs font-bold text-slate-700">
              {loading ? "Connecting..." : health?.status || "Online"}
            </Text>
          </View>
        </View>

        <Text className="text-xs text-slate-500 font-mono mb-1">
          {getApiBaseUrl()}
        </Text>
        <Text className="text-xs text-slate-600 mb-3.5">
          {health?.service || "ASP.NET Core .NET 10 Web API"}
        </Text>

        <TouchableOpacity
          onPress={() => {
            checkConnectivity();
            fetchUserProfile();
          }}
          disabled={loading}
          activeOpacity={0.8}
          className="h-11 rounded-2xl bg-slate-100 hover:bg-slate-200 items-center flex-row justify-center border border-slate-200/80 gap-2"
        >
          {loading ? (
            <ActivityIndicator size="small" color="#0f172a" />
          ) : (
            <>
              <RefreshCw size={16} color="#0f172a" strokeWidth={2} />
              <Text className="font-bold text-slate-800 text-xs">
                Refresh Status
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
