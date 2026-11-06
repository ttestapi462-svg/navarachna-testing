import React from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ShieldOff, Trash2 } from "lucide-react-native";

const SURFACE = "#FFFFFF";
const BORDER = "#E8E2D8";
const TEXT = "#231E1C";
const MUTED = "#6E6862";
const DANGER = "#DC2626";
const DANGER_BG = "#FEE2E2";

interface Props {
  visible: boolean;
  kind: "delete" | "removeLogin" | "deleteDocument";
  employeeName: string;
  documentName?: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function EmployeeConfirmationDialog({
  visible,
  kind,
  employeeName,
  documentName,
  busy,
  onCancel,
  onConfirm,
}: Props) {
  const deleting = kind === "delete";
  const deletingDocument = kind === "deleteDocument";

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => {
        if (!busy) onCancel();
      }}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            if (!busy) onCancel();
          }}
          accessibilityRole="button"
          accessibilityLabel="Dismiss confirmation"
        />
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            {deleting || deletingDocument ? (
              <Trash2 size={20} color={DANGER} strokeWidth={2.2} />
            ) : (
              <ShieldOff size={20} color={DANGER} strokeWidth={2.2} />
            )}
          </View>
          <Text style={styles.title}>
            {deleting
              ? "Delete employee profile?"
              : deletingDocument
                ? "Delete uploaded document?"
                : "Remove login access?"}
          </Text>
          <Text style={styles.message}>
            {deleting ? (
              <>
                Delete <Text style={styles.employeeName}>{employeeName}</Text> from the employee directory? This action cannot be undone.
              </>
            ) : deletingDocument ? (
              <>
                Delete <Text style={styles.employeeName}>{documentName || "this document"}</Text> from <Text style={styles.employeeName}>{employeeName}</Text>’s profile? This action cannot be undone.
              </>
            ) : (
              <>
                Remove sign-in access for <Text style={styles.employeeName}>{employeeName}</Text>? They will no longer be able to sign in.
              </>
            )}
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={busy}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, busy && styles.disabledButton]}
              onPress={onConfirm}
              disabled={busy}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={deleting ? "Delete employee" : deletingDocument ? "Delete uploaded document" : "Remove login access"}
            >
              {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
              <Text style={styles.confirmText}>
                {busy ? "Working…" : deleting || deletingDocument ? "Delete" : "Remove access"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(35, 30, 28, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: SURFACE,
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({
      ios: {
        shadowColor: "#231E1C",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14,
        shadowRadius: 16,
      },
      default: { elevation: 8 },
    }),
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DANGER_BG,
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT,
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 12.5,
    lineHeight: 18,
    color: MUTED,
    textAlign: "center",
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  employeeName: {
    fontWeight: "700",
    color: TEXT,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#E2DDD5",
    backgroundColor: "#FAF7F2",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    color: "#5C554F",
    fontSize: 13,
    fontWeight: "600",
  },
  confirmButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 19,
    backgroundColor: DANGER,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: DANGER,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      default: { elevation: 2 },
    }),
  },
  confirmText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.6,
  },
});
