import * as signalR from "@microsoft/signalr";
import { getStoredToken } from "./api-client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5207";
const HUB_URL = `${API_BASE_URL}/hubs/auth`;

type SupersededCallback = (payload?: unknown) => void;
type TerminatedCallback = () => void;

let connection: signalR.HubConnection | null = null;
let startPromise: Promise<void> | null = null;

const supersededListeners = new Set<SupersededCallback>();
const terminatedListeners = new Set<TerminatedCallback>();

function createConnection(): signalR.HubConnection {
  const newConnection = new signalR.HubConnectionBuilder()
    .withUrl(HUB_URL, {
      accessTokenFactory: () => getStoredToken() || "",
      skipNegotiation: false,
      transport:
        signalR.HttpTransportType.WebSockets |
        signalR.HttpTransportType.LongPolling,
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000])
    .configureLogging(signalR.LogLevel.None) // Silence internal abort warnings during dev reload
    .build();

  newConnection.on("SessionSuperseded", (payload) => {
    supersededListeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (err) {
        console.error("Error in SessionSuperseded listener:", err);
      }
    });
  });

  newConnection.on("SessionTerminated", () => {
    terminatedListeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error("Error in SessionTerminated listener:", err);
      }
    });
  });

  newConnection.onclose(() => {
    connection = null;
    startPromise = null;
  });

  return newConnection;
}

export function initAuthHub(
  onSuperseded: SupersededCallback,
  onTerminated?: TerminatedCallback
): () => void {
  const token = getStoredToken();
  if (!token) return () => {};

  supersededListeners.add(onSuperseded);
  if (onTerminated) {
    terminatedListeners.add(onTerminated);
  }

  // Ensure connection singleton exists
  if (!connection) {
    connection = createConnection();
  }

  // Start connection if currently disconnected and not already in-flight
  if (
    connection.state === signalR.HubConnectionState.Disconnected &&
    !startPromise
  ) {
    startPromise = connection
      .start()
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        // Gracefully ignore negotiation aborts caused by dev StrictMode double-mounting
        if (
          !msg.includes("stopped during negotiation") &&
          !msg.includes("AbortError")
        ) {
          console.warn("SignalR auth hub unavailable, fallback to HTTP heartbeat:", msg);
        }
      })
      .finally(() => {
        startPromise = null;
      });
  }

  // Unsubscribe listener without prematurely killing the session connection on StrictMode unmount
  return () => {
    supersededListeners.delete(onSuperseded);
    if (onTerminated) {
      terminatedListeners.delete(onTerminated);
    }
  };
}

export async function stopAuthHub(): Promise<void> {
  supersededListeners.clear();
  terminatedListeners.clear();

  if (!connection) return;

  const activeConn = connection;
  connection = null;

  try {
    if (startPromise) {
      await startPromise.catch(() => {});
    }
    if (activeConn.state !== signalR.HubConnectionState.Disconnected) {
      await activeConn.stop();
    }
  } catch {
    // Ignore shutdown cleanup errors
  }
}
