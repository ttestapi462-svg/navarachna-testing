import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { Alert, Platform } from "react-native";

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
  if (Constants.expoConfig?.extra?.apiUrl) {
    return Constants.expoConfig.extra.apiUrl as string;
  }
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    return `http://${ip}:5207`;
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

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

async function executeTokenRefresh(): Promise<string> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token stored.");
  }

  const primaryBaseUrl = getApiBaseUrl();
  const response = await fetch(`${primaryBaseUrl}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    if (errorBody.code === "SESSION_SUPERSEDED") {
      await clearAuthTokens();
      Alert.alert(
        "Session Terminated",
        "Your account was logged into from another device (e.g. Web Dashboard). Please sign in again."
      );
      if (onSessionSupersededCallback) {
        onSessionSupersededCallback();
      }
    } else if (errorBody.code === "SESSION_TERMINATED") {
      await clearAuthTokens();
      if (onSessionSupersededCallback) {
        onSessionSupersededCallback();
      }
    }
    throw new Error("Refresh failed");
  }

  const data = await response.json();
  if (data.token) {
    await setAuthTokens(data.token, data.refreshToken || refreshToken);
    return data.token;
  }

  throw new Error("Invalid token refresh payload.");
}

export async function mobileApiClient<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();
  const primaryBaseUrl = getApiBaseUrl();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const executeFetch = async (baseUrl: string, customHeaders = headers) => {
    const url = `${baseUrl}${endpoint}`;
    return await fetch(url, {
      ...options,
      headers: customHeaders,
    });
  };

  let response: Response;
  try {
    response = await executeFetch(primaryBaseUrl);
  } catch (primaryErr) {
    // Port 3000 fallback gateway if 5207 direct LAN connection is blocked
    const hostUri = Constants.expoConfig?.hostUri;
    const ip = hostUri ? hostUri.split(":")[0] : "localhost";
    const fallbackBaseUrl = `http://${ip}:3000`;
    if (fallbackBaseUrl !== primaryBaseUrl) {
      try {
        response = await executeFetch(fallbackBaseUrl);
      } catch {
        throw primaryErr;
      }
    } else {
      throw primaryErr;
    }
  }

  if (response.status === 401) {
    const errorBody = await response.clone().json().catch(() => ({}));

    // Force Logout Detection on Mobile (another device took over):
    if (errorBody.code === "SESSION_SUPERSEDED") {
      await clearAuthTokens();
      Alert.alert(
        "Session Terminated",
        "Your account was logged in from another device. To protect your studio data, this mobile session was ended."
      );
      if (onSessionSupersededCallback) {
        onSessionSupersededCallback();
      }
      throw new Error("Session superseded");
    }

    // Normal session termination (Logged out from another tab / admin revocation):
    if (errorBody.code === "SESSION_TERMINATED") {
      await clearAuthTokens();
      if (onSessionSupersededCallback) {
        onSessionSupersededCallback();
      }
      throw new Error("Session terminated");
    }

    // Refresh Mutex for normal token expiration
    if (!endpoint.includes("/api/auth/login") && !endpoint.includes("/api/auth/refresh")) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const newToken = await executeTokenRefresh();
          onTokenRefreshed(newToken);
          const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
          const retryResponse = await executeFetch(primaryBaseUrl, retryHeaders);
          if (!retryResponse.ok) {
            throw new Error(`HTTP ${retryResponse.status}`);
          }
          if (retryResponse.status === 204) return {} as T;
          return retryResponse.json();
        } catch {
          await clearAuthTokens();
          if (onSessionSupersededCallback) {
            onSessionSupersededCallback();
          }
          throw new Error("Session expired. Please sign in again.");
        } finally {
          isRefreshing = false;
        }
      }

      return new Promise<T>((resolve, reject) => {
        refreshSubscribers.push(async (newToken: string) => {
          try {
            const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
            const retryResponse = await executeFetch(primaryBaseUrl, retryHeaders);
            if (!retryResponse.ok) {
              reject(new Error(`HTTP ${retryResponse.status}`));
            } else if (retryResponse.status === 204) {
              resolve({} as T);
            } else {
              resolve(await retryResponse.json());
            }
          } catch (err) {
            reject(err);
          }
        });
      });
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    let parsed: any;
    try {
      parsed = JSON.parse(errorText);
    } catch {
      // not JSON
    }
    const message = parsed?.message || parsed?.detail || errorText || `HTTP ${response.status}`;
    throw new MobileApiError(message, response.status, parsed);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
