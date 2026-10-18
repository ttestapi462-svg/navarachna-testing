import * as signalR from "@microsoft/signalr";
import { getStoredToken } from "./api-client";

let connection: signalR.HubConnection | null = null;

export function initAuthHub(
  onSuperseded: (payload?: unknown) => void,
  onTerminated?: () => void
): () => void {
  const token = getStoredToken();
  if (!token) return () => {};

  // If already connected or connecting, skip re-creating
  if (
    connection &&
    (connection.state === signalR.HubConnectionState.Connected ||
      connection.state === signalR.HubConnectionState.Connecting)
  ) {
    return () => {};
  }

  const hubUrl = "http://localhost:5207/hubs/auth";

  const newConnection = new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, {
      accessTokenFactory: () => getStoredToken() || "",
      skipNegotiation: false,
      transport:
        signalR.HttpTransportType.WebSockets |
        signalR.HttpTransportType.LongPolling,
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000])
    .configureLogging(signalR.LogLevel.Warning)
    .build();

  newConnection.on("SessionSuperseded", (payload) => {
    onSuperseded(payload);
  });

  if (onTerminated) {
    newConnection.on("SessionTerminated", () => {
      onTerminated();
    });
  }

  connection = newConnection;

  newConnection.start().catch((err) => {
    console.warn("SignalR real-time hub unavailable, fallback to HTTP heartbeat:", err);
  });

  return () => {
    if (connection) {
      connection.stop().catch(() => {});
      connection = null;
    }
  };
}
