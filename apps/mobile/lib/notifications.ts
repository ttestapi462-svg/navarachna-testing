export type MobileNotificationKind =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "validation";

export type MobileNotification = {
  id: number;
  kind: MobileNotificationKind;
  title?: string;
  message: string;
};

type Listener = (notification: MobileNotification) => void;

const listeners = new Set<Listener>();
let nextId = 0;

export function notifyMobile(
  kind: MobileNotificationKind,
  message: string,
  title?: string
) {
  const trimmedMessage = message.trim();
  if (!trimmedMessage) return;

  const notification: MobileNotification = {
    id: ++nextId,
    kind,
    title,
    message: trimmedMessage,
  };
  listeners.forEach((listener) => listener(notification));
}

export function subscribeToMobileNotifications(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
