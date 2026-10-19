/* eslint-disable @next/next/no-location-assign-relative-destination */
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status: number;
}

export interface ApiErrorData {
  requiresForceLogout?: boolean;
  activeDevice?: string;
  sessionStartedAt?: string;
  message?: string;
  detail?: string;
  title?: string;
  [key: string]: unknown;
}

export class ApiError extends Error {
  status: number;
  data?: ApiErrorData | null;

  constructor(message: string, status: number, data?: ApiErrorData | null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5207";

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("navarachna_token");
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("navarachna_refresh_token");
}

export function setStoredTokens(token: string, refreshToken: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("navarachna_token", token);
  localStorage.setItem("navarachna_refresh_token", refreshToken);
  // Set lightweight SSR cookie for layout rendering without flash
  document.cookie = `navarachna_session=1; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
}

export function clearStoredTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("navarachna_token");
  localStorage.removeItem("navarachna_refresh_token");
  document.cookie = "navarachna_session=; path=/; max-age=0; SameSite=Lax";
}

async function executeTokenRefresh(): Promise<string> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    if (errorBody.code === "SESSION_SUPERSEDED") {
      clearStoredTokens();
      if (typeof window !== "undefined") {
        window.location.href = "/login?reason=session_superseded";
      }
    } else if (errorBody.code === "SESSION_TERMINATED") {
      clearStoredTokens();
      if (typeof window !== "undefined") {
        window.location.href = "/login?reason=session_terminated";
      }
    }
    throw new Error("Refresh failed");
  }

  const data = await response.json();
  if (data.token) {
    setStoredTokens(data.token, data.refreshToken || refreshToken);
    return data.token;
  }

  throw new Error("Invalid refresh response");
}

export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  const token = getStoredToken();

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers as Record<string, string>),
    },
  };

  const response = await fetch(url, config);

  if (response.status === 401) {
    let errorJson: { code?: string; message?: string } = {};
    try {
      errorJson = await response.clone().json();
    } catch {
      // ignore
    }

    // Detect explicit session supersession (Force Logout from another device)
    if (errorJson.code === "SESSION_SUPERSEDED") {
      clearStoredTokens();
      if (typeof window !== "undefined") {
        window.location.href = "/login?reason=session_superseded";
      }
      throw new Error("Your session was terminated because a new login occurred on another device.");
    }

    // Detect normal session termination (Logout from another tab / admin revocation)
    if (errorJson.code === "SESSION_TERMINATED") {
      clearStoredTokens();
      if (typeof window !== "undefined") {
        window.location.href = "/login?reason=session_terminated";
      }
      throw new Error("Your session has ended. Please sign in again.");
    }

    // Critical Plot Hole 2: Refresh Mutex for standard token expiration
    if (!endpoint.includes("/api/auth/login") && !endpoint.includes("/api/auth/refresh")) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const newToken = await executeTokenRefresh();
          onTokenRefreshed(newToken);
          // Retry original request with new token
          const retryHeaders = {
            ...config.headers,
            Authorization: `Bearer ${newToken}`,
          };
          const retryResponse = await fetch(url, { ...config, headers: retryHeaders });
          if (!retryResponse.ok) {
            throw new Error(`HTTP ${retryResponse.status}`);
          }
          if (retryResponse.status === 204) return {} as T;
          return retryResponse.json();
        } catch {
          clearStoredTokens();
          if (typeof window !== "undefined") {
            window.location.href = "/login?reason=expired";
          }
          throw new Error("Session expired. Please log in again.");
        } finally {
          isRefreshing = false;
        }
      }

      // Queue concurrent requests behind the active refresh execution
      return new Promise<T>((resolve, reject) => {
        refreshSubscribers.push(async (newToken: string) => {
          try {
            const retryHeaders = {
              ...config.headers,
              Authorization: `Bearer ${newToken}`,
            };
            const retryResponse = await fetch(url, { ...config, headers: retryHeaders });
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
    let errorDetail = "An unexpected error occurred.";
    let errorJson: Record<string, unknown> | null = null;
    try {
      errorJson = (await response.json()) as Record<string, unknown>;
      errorDetail =
        typeof errorJson?.message === "string"
          ? errorJson.message
          : typeof errorJson?.detail === "string"
          ? errorJson.detail
          : typeof errorJson?.title === "string"
          ? errorJson.title
          : JSON.stringify(errorJson);
    } catch {
      errorDetail = response.statusText || `${response.status} Error`;
    }
    throw new ApiError(errorDetail, response.status, errorJson);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
