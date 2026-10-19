import { Platform } from "react-native";

export const HEADER_BAR_HEIGHT = 56; // Clean atmospheric ambient wash header height
export const BAR_BASE_HEIGHT = 52; // Low-profile curved nav bar base height with labels
export const BUBBLE_SIZE = 48; // Floating circular button diameter with generous padding
export const FAB_SIZE = 44; // Action button diameter
export const FAB_ELEVATION_OFFSET = 12; // Snug elevation in the scoop

/**
 * Calculates effective safe bottom inset across Android (3-button / gesture),
 * iOS (home indicator bar), and Web/Desktop viewports.
 */
export function getSafeBottom(bottomInset: number): number {
  if (Platform.OS === "ios") {
    // iPhone X+ has 34pt home indicator; iPhone SE has 0. Ensure at least 14pt breathing room.
    return Math.max(bottomInset, 14);
  }
  if (Platform.OS === "android") {
    // Android system navigation:
    // - 3-button navigation (Back / Home / Recents) reports bottomInset ~48dp.
    // - Gesture navigation bar reports bottomInset ~16-24dp.
    // - Physical hardware keys or non-edge-to-edge report bottomInset = 0.
    return Math.max(bottomInset, 0);
  }
  return Math.max(bottomInset, 0);
}

/**
 * Calculates total height of the curved bottom bar taking system safe area into account.
 */
export function getTabBarHeight(bottomInset: number): number {
  return BAR_BASE_HEIGHT + getSafeBottom(bottomInset);
}

/**
 * Calculates the required bottom padding for scrollable lists / views
 * so items are not occluded by the curved floating bottom navigation bar.
 */
export function getTabBarContentPadding(bottomInset: number): number {
  return getTabBarHeight(bottomInset) + 16;
}

