import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

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
  const primaryBaseUrl = getApiBaseUrl();

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

  const executeFetch = async (baseUrl: string) => {
    const url = `${baseUrl}${endpoint}`;
    return await fetch(url, {
      ...options,
      headers,
    });
  };

  let response: Response;
  try {
    response = await executeFetch(primaryBaseUrl);
  } catch (primaryErr) {
    // Fallback: If port 5207 direct connect fails, try port 3000 (Next.js proxy gateway)
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
