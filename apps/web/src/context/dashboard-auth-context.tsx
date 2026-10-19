"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  apiClient,
  clearStoredTokens,
  getStoredToken,
} from "@/lib/api-client";
import { initAuthHub, stopAuthHub } from "@/lib/auth-hub";

export interface HealthStatus {
  status: string;
  service: string;
  framework: string;
  timestamp: string;
}

export interface UserDto {
  id: number;
  username: string;
  email?: string;
  firstName: string;
  lastName?: string;
  phoneNumber?: string;
  activeDeviceName?: string;
  sessionStartedAt?: string;
  createdAt?: string;
  createdBy?: number;
  updatedAt?: string;
  updatedBy?: number;
}

export interface AuthMeResponse {
  isAuthenticated: boolean;
  user?: UserDto;
}

interface DashboardAuthContextType {
  user?: UserDto;
  health?: HealthStatus;
  isHealthLoading: boolean;
  isAuthLoading: boolean;
  isAuthenticated: boolean;
  handleLogout: () => Promise<void>;
  refetchAuth: () => void;
}

const DashboardAuthContext = createContext<DashboardAuthContextType | null>(null);

export function DashboardAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return !getStoredToken();
  });

  // 1. Initial Client-Side Authentication Check: If no token, bounce to login
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      clearStoredTokens();
      router.replace("/login");
    } else {
      setIsAuthChecking(false);
    }
  }, [router]);

  // 2. Real-Time Single-Session Enforcement via SignalR
  useEffect(() => {
    if (isAuthChecking) return;

    const cleanup = initAuthHub(
      () => {
        stopAuthHub().catch(() => {});
        clearStoredTokens();
        queryClient.setQueryData(["authMe"], { isAuthenticated: false });
        router.replace("/login?reason=session_superseded");
      },
      () => {
        stopAuthHub().catch(() => {});
        clearStoredTokens();
        queryClient.setQueryData(["authMe"], { isAuthenticated: false });
        router.replace("/login?reason=session_terminated");
      }
    );

    return () => {
      cleanup();
    };
  }, [isAuthChecking, router, queryClient]);

  // 3. Backend Connectivity Query
  const { data: health, isLoading: isHealthLoading } = useQuery<HealthStatus>({
    queryKey: ["health"],
    queryFn: () => apiClient<HealthStatus>("/health"),
    refetchInterval: 15000,
    enabled: !isAuthChecking,
  });

  // 4. User Session & Profile Query with Adaptive Heartbeat & Instant Cache Hydration
  const {
    data: auth,
    isLoading: isAuthLoading,
    refetch: refetchAuth,
  } = useQuery<AuthMeResponse>({
    queryKey: ["authMe"],
    queryFn: async () => {
      try {
        return await apiClient<AuthMeResponse>("/api/auth/me");
      } catch (err: unknown) {
        stopAuthHub().catch(() => {});
        clearStoredTokens();
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("superseded")) {
          router.replace("/login?reason=session_superseded");
        } else if (msg.includes("terminated")) {
          router.replace("/login?reason=session_terminated");
        } else {
          router.replace("/login?reason=session_expired");
        }
        return { isAuthenticated: false };
      }
    },
    initialData: () => queryClient.getQueryData<AuthMeResponse>(["authMe"]),
    enabled: !isAuthChecking,
    refetchInterval: () =>
      typeof document !== "undefined" && document.hidden ? false : 12000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  // Redirect if server says not authenticated
  useEffect(() => {
    if (!isAuthLoading && auth && !auth.isAuthenticated) {
      stopAuthHub().catch(() => {});
      clearStoredTokens();
      router.replace("/login");
    }
  }, [isAuthLoading, auth, router]);

  // 5. Logout Handler
  const handleLogout = useCallback(async () => {
    try {
      await apiClient("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout
    } finally {
      await stopAuthHub();
      clearStoredTokens();
      queryClient.setQueryData(["authMe"], { isAuthenticated: false });
      router.replace("/login");
    }
  }, [queryClient, router]);

  const value = {
    user: auth?.user,
    health,
    isHealthLoading,
    isAuthLoading: !auth?.isAuthenticated && (isAuthChecking || isAuthLoading),
    isAuthenticated: !!auth?.isAuthenticated,
    handleLogout,
    refetchAuth: () => {
      refetchAuth();
    },
  };

  return (
    <DashboardAuthContext.Provider value={value}>
      {children}
    </DashboardAuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(DashboardAuthContext);
  if (!context) {
    throw new Error("useAuth must be used within a DashboardAuthProvider");
  }
  return context;
}
