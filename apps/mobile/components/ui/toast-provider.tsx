import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react-native";
import { notifyMobile, subscribeToMobileNotifications } from "../../lib/notifications";
import type { MobileNotification, MobileNotificationKind } from "../../lib/notifications";

const ToastContext = createContext<{ showToast: typeof notifyMobile } | null>(null);

const palette: Record<MobileNotificationKind, { bg: string; border: string; icon: string; title: string }> = {
  success: { bg: "#ecfdf5", border: "rgba(33, 182, 75, 0.3)", icon: "#21b64b", title: "#0f172a" },
  error: { bg: "#fff1f2", border: "rgba(239, 68, 68, 0.3)", icon: "#ef4444", title: "#0f172a" },
  warning: { bg: "#fffbeb", border: "#fcd34d", icon: "#d97706", title: "#0f172a" },
  validation: { bg: "#fffbeb", border: "#fcd34d", icon: "#d97706", title: "#0f172a" },
  info: { bg: "#eff6ff", border: "#93c5fd", icon: "#2563eb", title: "#0f172a" },
};

const icons = { success: CheckCircle2, error: AlertCircle, warning: AlertTriangle, validation: AlertTriangle, info: Info };
const titles: Record<MobileNotificationKind, string> = {
  success: "Success",
  error: "Error",
  warning: "Warning",
  validation: "Check the form",
  info: "Information",
};
const durations: Record<MobileNotificationKind, number> = {
  success: 3200,
  error: 5600,
  warning: 4600,
  validation: 5600,
  info: 4200,
};

function notificationKey(notification: MobileNotification) {
  return `${notification.kind}|${notification.message.trim().toLowerCase()}`;
}

export function useMobileToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useMobileToast must be used inside ToastProvider.");
  return context;
}

export function ToastProvider({ children }: React.PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<MobileNotification | null>(null);
  const toastRef = useRef<MobileNotification | null>(null);
  const pendingRef = useRef<MobileNotification[]>([]);
  const lastRef = useRef<{ key: string; time: number } | null>(null);
  const dismissingIdRef = useRef<number | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const offset = useRef(new Animated.Value(-14)).current;

  const dismiss = useCallback((id?: number) => {
    const current = toastRef.current;
    if (!current || (id !== undefined && current.id !== id)) return;
    if (dismissingIdRef.current === current.id) return;
    dismissingIdRef.current = current.id;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(offset, { toValue: -10, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      if (toastRef.current?.id === current.id) {
        const next = pendingRef.current.shift() || null;
        toastRef.current = next;
        dismissingIdRef.current = null;
        setToast(next);
      }
    });
  }, [opacity, offset]);

  useEffect(
    () =>
      subscribeToMobileNotifications((next) => {
        const key = notificationKey(next);
        const now = Date.now();
        const current = toastRef.current;
        if (current && notificationKey(current) === key) return;
        if (pendingRef.current.some((item) => notificationKey(item) === key)) return;
        if (lastRef.current?.key === key && now - lastRef.current.time < 900) return;
        lastRef.current = { key, time: now };

        if (current) {
          pendingRef.current.push(next);
          return;
        }
        toastRef.current = next;
        setToast(next);
      }),
    []
  );

  useEffect(() => {
    if (!toast) return;
    opacity.stopAnimation();
    offset.stopAnimation();
    opacity.setValue(0);
    offset.setValue(-14);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 190, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(offset, { toValue: 0, damping: 18, stiffness: 220, mass: 0.8, useNativeDriver: true }),
    ]).start();
    const timer = setTimeout(() => dismiss(toast.id), durations[toast.kind]);
    return () => clearTimeout(timer);
  }, [toast, dismiss, opacity, offset]);

  const Icon = toast ? icons[toast.kind] : Info;
  const colors = toast ? palette[toast.kind] : palette.info;

  return (
    <ToastContext.Provider value={{ showToast: notifyMobile }}>
      {children}
      <Modal
        visible={Boolean(toast)}
        transparent
        animationType="none"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => dismiss(toast?.id)}
      >
        {toast ? (
          <View pointerEvents="box-none" style={[styles.overlay, { paddingTop: insets.top + 10 }]}>
            <Animated.View
              accessible
              accessibilityRole="alert"
              accessibilityLiveRegion={toast.kind === "error" || toast.kind === "validation" ? "assertive" : "polite"}
              accessibilityLabel={`${toast.title || titles[toast.kind]}. ${toast.message}`}
              style={[styles.toast, { backgroundColor: colors.bg, borderColor: colors.border }, { opacity, transform: [{ translateY: offset }] }]}
            >
              <View style={[styles.icon, { backgroundColor: colors.icon }]}>
                <Icon size={17} color="#ffffff" strokeWidth={2.4} />
              </View>
              <View style={styles.copy}>
                <Text style={[styles.title, { color: colors.title }]} numberOfLines={1}>
                  {toast.title || titles[toast.kind]}
                </Text>
                <Text style={styles.message} numberOfLines={2} ellipsizeMode="tail">
                  {toast.message}
                </Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notification" accessibilityHint="Closes this notification" hitSlop={10} onPress={() => dismiss(toast.id)} style={styles.close}>
                <X size={17} color="#64748b" />
              </Pressable>
            </Animated.View>
          </View>
        ) : null}
      </Modal>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: "center", paddingHorizontal: 16 },
  toast: {
    width: "100%",
    maxWidth: 560,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...Platform.select({
      ios: { shadowColor: "#0f172a", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 14 },
      android: { elevation: 12 },
      default: { boxShadow: "0 10px 24px rgba(15, 23, 42, 0.16)" },
    }),
  },
  icon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontSize: 12.5, fontWeight: "800" },
  message: { fontSize: 12, lineHeight: 17, color: "#334155", flexShrink: 1 },
  close: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", flexShrink: 0 },
});
