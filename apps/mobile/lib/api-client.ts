import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || "http://10.0.2.2:5000";
const SESSION_KEY = "navarachna_session_cookie";

export async function setSessionToken(token: string) {
  await SecureStore.setItemAsync(SESSION_KEY, token);
}

export async function getSessionToken() {
  return await SecureStore.getItemAsync(SESSION_KEY);
}

export async function clearSessionToken() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function mobileApiClient<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getSessionToken();
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    // Injects ASP.NET Core cookie session header
    headers["Cookie"] = `.Navarachna.Auth=${token}`;
    headers["Authorization"] = `Cookie ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Extract set-cookie if present on login
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) {
    const match = setCookie.match(/\.Navarachna\.Auth=([^;]+)/);
    if (match && match[1]) {
      await setSessionToken(match[1]);
    }
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(errorBody || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
