export const mobileTheme = {
  color: {
    // Canvas & Neutral Surfaces
    canvas: "#FAF7F2",
    surface: "#ffffff",
    surfaceMuted: "#F5EFE6",
    surfaceElevated: "#ffffff",

    // Typography & Ink Hierarchy
    ink: "#231E1C",
    text: "#4A433E",
    muted: "#6E6862",
    subtle: "#9B958F",

    // Form Controls & Dividers
    border: "#E8E2D8",
    borderSoft: "#F2ECE2",
    ring: "#C59B4E",

    // Primary Atelier Crimson Garnet System
    primary: "#78070D",
    primaryHover: "#63060B",
    primaryDark: "#4A0408",
    primaryTint: "#FBF2F3",
    primarySubtle: "rgba(120, 7, 13, 0.04)",
    primaryBorder: "rgba(120, 7, 13, 0.18)",

    // Dual-Tone Antique Gold System
    gold: "#C59B4E",
    goldHighlight: "#E0B159",
    goldHover: "#B58838",
    goldDark: "#8E6339",
    goldLight: "#FAF2E2",
    goldTint: "rgba(197, 155, 78, 0.15)",

    // Semantic Feedback States
    success: "#15803d",
    successTint: "#ecfdf5",
    warning: "#b45309",
    warningTint: "#fffbeb",
    info: "#0284c7",
    infoTint: "#eff6ff",
    destructive: "#b91c1c",
    destructiveTint: "#fef2f2",
  },
  radius: {
    card: 18,
    panel: 14,
    control: 12,
    pill: 999,
  },
  spacing: {
    screen: 18,
    section: 16,
  },
} as const;
