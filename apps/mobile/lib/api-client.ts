import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { notifyMobile } from "./notifications";

export class MobileApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "MobileApiError";
    this.status = status;
    this.data = data;
  }
}

export function getApiBaseUrl(): string {
  // 1. If running on Web in the browser, always connect to the API on the current browser's hostname (e.g. localhost:5207)
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    const hostname = window.location.hostname || "localhost";
    return `http://${hostname}:5207`;
  }

  // 2. Explicit environment variable
  const environmentApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (environmentApiUrl) {
    return environmentApiUrl.replace(/\/$/, "");
  }

  // 3. Expo config extra
  if (Constants.expoConfig?.extra?.apiUrl) {
    return (Constants.expoConfig.extra.apiUrl as string).replace(/\/$/, "");
  }

  // 4. Runtime LAN host from Expo hostUri (for physical Android/iOS devices running Expo Go / dev build)
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    try {
      const host = new URL(hostUri.includes("://") ? hostUri : `http://${hostUri}`).hostname;
      const isPrivateIpv4 =
        /^10\./.test(host) ||
        /^192\.168\./.test(host) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
        host === "localhost" ||
        host === "127.0.0.1";
      if (isPrivateIpv4) return `http://${host}:5207`;
    } catch {
      // Use fallback below
    }
  }

  // 5. Development fallback: use current Wi-Fi LAN IP (192.168.29.47) for physical mobile devices
  if (process.env.NODE_ENV === "development") {
    return "http://192.168.29.47:5207";
  }

  return "http://localhost:5207";
}

const TOKEN_KEY = "navarachna_jwt_token";
const REFRESH_KEY = "navarachna_refresh_token";

// Cross-platform persistent storage helper (Web: localStorage, Native: SecureStore)
async function storageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Fallback if Keystore is restricted
  }
}

async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function storageDelete(key: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(key);
    }
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Fallback
  }
}

let onSessionSupersededCallback: (() => void) | null = null;

export function registerSessionSupersededHandler(callback: () => void) {
  onSessionSupersededCallback = callback;
}

export async function setAuthTokens(token: string, refreshToken: string) {
  await storageSet(TOKEN_KEY, token);
  await storageSet(REFRESH_KEY, refreshToken);
}

export async function getAuthToken(): Promise<string | null> {
  return await storageGet(TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return await storageGet(REFRESH_KEY);
}

export async function clearAuthTokens() {
  await storageDelete(TOKEN_KEY);
  await storageDelete(REFRESH_KEY);
}

let refreshInFlight: Promise<string> | null = null;

async function fetchFromApi(endpoint: string, options: RequestInit): Promise<Response> {
  const primary = getApiBaseUrl().replace(/\/$/, "");
  return fetch(`${primary}${endpoint}`, options);
}

async function fetchWithNotification(endpoint: string, options: RequestInit): Promise<Response> {
  try {
    return await fetchFromApi(endpoint, options);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    const reason = error instanceof Error ? error.message : "Check your connection and try again.";
    notifyMobile(
      "error",
      `${reason} API: ${getApiBaseUrl()}. Make sure this device can reach the laptop on the same network and port 5207.`,
      "Connection failed"
    );
    throw error;
  }
}

async function executeTokenRefresh(): Promise<string> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token stored.");

  const response = await fetchFromApi("/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    if (errorBody.code === "SESSION_SUPERSEDED" || errorBody.code === "SESSION_TERMINATED") {
      await clearAuthTokens();
      if (errorBody.code === "SESSION_SUPERSEDED") {
        notifyMobile("warning", "Your account was logged into from another device. Please sign in again.", "Session terminated");
      }
      onSessionSupersededCallback?.();
    }
    const message = errorBody.message || "Session refresh failed. Please sign in again.";
    notifyMobile("error", message, "Session refresh failed");
    throw new Error(message);
  }

  const data = await response.json();
  if (!data.token) throw new Error("Invalid token refresh payload.");
  await setAuthTokens(data.token, data.refreshToken || refreshToken);
  return data.token;
}

async function getFreshToken(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = executeTokenRefresh().finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

/**
 * Authenticated raw-response helper for multipart uploads and receipt downloads.
 * It shares the API URL fallback and token-refresh behavior with JSON requests,
 * without setting Content-Type (the runtime must set multipart boundaries itself).
 */
export async function mobileApiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response = await fetchWithNotification(endpoint, { ...options, headers });
  if (response.status === 401 && !endpoint.includes("/api/auth/login") && !endpoint.includes("/api/auth/refresh")) {
    const errorBody = await response.clone().json().catch(() => ({}));
    if (errorBody.code === "SESSION_SUPERSEDED" || errorBody.code === "SESSION_TERMINATED") {
      await clearAuthTokens();
      if (errorBody.code === "SESSION_SUPERSEDED") {
        notifyMobile("warning", "Your account was logged in from another device. Please sign in again.", "Session terminated");
      }
      onSessionSupersededCallback?.();
      throw new MobileApiError(errorBody.message || "Session ended. Please sign in again.", 401, errorBody);
    }

    try {
      const newToken = await getFreshToken();
      response = await fetchWithNotification(endpoint, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
      });
    } catch (error) {
      await clearAuthTokens();
      onSessionSupersededCallback?.();
      const message = error instanceof Error ? error.message : "Session expired. Please sign in again.";
      notifyMobile("error", message, "Session expired");
      throw new MobileApiError(message, 401);
    }
  }

  if (!response.ok) {
    const errorText = await response.clone().text();
    let parsed: any;
    try { parsed = JSON.parse(errorText); } catch { /* non-JSON response */ }
    const validationMessage = parsed?.errors ? Object.values(parsed.errors).flat().join(" ") : "";
    const message = validationMessage || parsed?.message || parsed?.detail || parsed?.title || errorText || `HTTP ${response.status}`;
    notifyMobile(parsed?.errors ? "validation" : "error", message);
    throw new MobileApiError(message, response.status, parsed);
  }
  return response;
}

export async function mobileApiClient<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };
  const response = await mobileApiFetch(endpoint, { ...options, headers });
  if (response.status === 204) return {} as T;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return {} as T;
  return await response.json() as T;
}
