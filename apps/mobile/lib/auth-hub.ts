import * as signalR from "@microsoft/signalr";
import { getAuthToken, clearAuthTokens, getApiBaseUrl } from "./api-client";
import { Alert } from "react-native";

let connection: signalR.HubConnection | null = null;

export function initMobileAuthHub(
  onSuperseded: () => void,
  onTerminated?: () => void
): () => void {
  let isCancelled = false;

  const connect = async () => {
    try {
      const token = await getAuthToken();
      if (!token || isCancelled) return;

      if (
        connection &&
        (connection.state === signalR.HubConnectionState.Connected ||
          connection.state === signalR.HubConnectionState.Connecting)
      ) {
        return;
      }

      const baseUrl = getApiBaseUrl();
      const hubUrl = `${baseUrl}/hubs/auth`;

      const newConnection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: async () => (await getAuthToken()) || "",
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000])
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      newConnection.on("SessionSuperseded", async () => {
        await clearAuthTokens();
        Alert.alert(
          "Session Terminated",
          "Your account was logged in from another device. To protect your studio data, this mobile session was ended."
        );
        onSuperseded();
      });

      if (onTerminated) {
        newConnection.on("SessionTerminated", async () => {
          await clearAuthTokens();
          onTerminated();
        });
      }

      connection = newConnection;
      await newConnection.start();
    } catch (err) {
      console.warn("Mobile SignalR hub unavailable, fallback to HTTP heartbeat:", err);
    }
  };

  connect();

  return () => {
    isCancelled = true;
    if (connection) {
      connection.stop().catch(() => {});
      connection = null;
    }
  };
}
