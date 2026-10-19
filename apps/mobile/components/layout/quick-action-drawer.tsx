import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  BackHandler,
  TouchableWithoutFeedback,
  Animated,
} from "react-native";
import {
  ShoppingBag,
  QrCode,
  Ruler,
  Scissors,
  X,
  ChevronRight,
} from "lucide-react-native";

interface QuickActionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction?: (actionId: string) => void;
}

const actions = [
  {
    id: "new_order",
    title: "Create Couture Order",
    description: "Initialize bespoke garment production ticket",
    icon: ShoppingBag,
    color: "#e11d48",
    bg: "#fff1f2",
  },
  {
    id: "scan_tag",
    title: "Scan Garment Hangtag",
    description: "Scan QR barcode to pull up artisan specs",
    icon: QrCode,
    color: "#0284c7",
    bg: "#f0f9ff",
  },
  {
    id: "record_measurements",
    title: "Log Client Measurements",
    description: "Record bust, waist, hip & shoulder specs",
    icon: Ruler,
    color: "#059669",
    bg: "#ecfdf5",
  },
  {
    id: "stage_handoff",
    title: "Advance Production Stage",
    description: "Handoff piece from Cutting to Hand Embroidery",
    icon: Scissors,
    color: "#d97706",
    bg: "#fffbeb",
  },
];

export function QuickActionDrawer({
  isOpen,
  onClose,
  onSelectAction,
}: QuickActionDrawerProps) {
  const translateYAnim = useRef(new Animated.Value(450)).current;

  // Intercept Android hardware back button when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        handleDismiss();
        return true;
      }
    );

    return () => backHandler.remove();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      Animated.spring(translateYAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 65,
      }).start();
    } else {
      translateYAnim.setValue(450);
    }
  }, [isOpen, translateYAnim]);

  const handleDismiss = () => {
    Animated.timing(translateYAnim, {
      toValue: 450,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const handleAction = (id: string) => {
    handleDismiss();
    if (onSelectAction) {
      onSelectAction(id);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      transparent
      visible={isOpen}
      animationType="none"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Backdrop Tap to Dismiss */}
        <TouchableWithoutFeedback onPress={handleDismiss}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        {/* Animated Slide-Up Card */}
        <Animated.View
          style={[
            styles.drawerCard,
            {
              transform: [{ translateY: translateYAnim }],
            },
          ]}
        >
          {/* Top Notch Drag Indicator */}
          <View className="items-center py-2">
            <View className="w-12 h-1.5 rounded-full bg-slate-300" />
          </View>

          {/* Drawer Title Header */}
          <View className="flex-row items-center justify-between px-5 pt-1 pb-4 border-b border-slate-100">
            <View>
              <Text className="text-base font-extrabold text-slate-900">
                Atelier Quick Actions
              </Text>
              <Text className="text-xs text-slate-500 font-medium">
                Rapid floor tools for tailors & masters
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleDismiss}
              activeOpacity={0.7}
              className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
            >
              <X size={18} color="#64748b" strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          {/* Action List Tiles */}
          <View className="p-4 gap-2.5">
            {actions.map((act) => {
              const IconComponent = act.icon;
              return (
                <TouchableOpacity
                  key={act.id}
                  onPress={() => handleAction(act.id)}
                  activeOpacity={0.75}
                  className="flex-row items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/70"
                >
                  <View className="flex-row items-center gap-3.5 flex-1">
                    <View
                      style={{ backgroundColor: act.bg }}
                      className="w-11 h-11 rounded-xl items-center justify-center border border-black/5"
                    >
                      <IconComponent size={20} color={act.color} strokeWidth={2.2} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-slate-900">
                        {act.title}
                      </Text>
                      <Text className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                        {act.description}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color="#94a3b8" strokeWidth={2} />
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  drawerCard: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
});
