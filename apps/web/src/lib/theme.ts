/**
 * Navarachna Designer Studio — Official Color Specification & Theme Constants
 * Primary Brand Color: #78070D (Atelier Crimson Garnet)
 * Accent: #C59B4E / #E0B159 (3D Embossed Antique Gold)
 * Canvas: #FAF7F2 (Warm Linen Ivory)
 * Single Source of Truth for the entire web project.
 */

export const THEME_COLORS = {
  brand: {
    // Primary Atelier Crimson Garnet & Variations
    maroon: "#78070D",           // Core Primary Brand Color (#78070D)
    maroonHover: "#63060B",      // Primary button hover state
    maroonActive: "#4A0408",     // Primary button pressed state
    maroonLight: "rgba(120, 7, 13, 0.08)",  // Subtle badge/pill tint
    maroonSubtle: "rgba(120, 7, 13, 0.04)", // Table row hover highlight

    // Deep Noir & Velvet Shadows (Dark theme & depth)
    wineNoir: "#1F0207",         // Deepest vignette shadow
    wineDeep: "#2D050F",         // Deep wine velvet (sidebar/dark surfaces)

    // 3D Embossed Brushed Antique Gold (Monogram & Accents)
    goldHighlight: "#E0B159",     // Luminous gold specular highlight
    gold: "#C59B4E",              // Official antique gold midtone — Focus/Accent
    goldHover: "#B58838",         // Gold interactive hover state
    goldShadow: "#8E6339",        // Deep bronze shadow from letter bevels
    goldLight: "rgba(197, 155, 78, 0.15)",  // Focus ring & selection highlight
    goldSubtle: "rgba(197, 155, 78, 0.06)", // Soft gold surface tint

    // Couture Canvas & Neutrals
    ivory: "#FAF7F2",             // Warm Linen Ivory — Solid page canvas background
    cream: "#F5EFE6",             // Soft Warm Cream — Secondary panel backgrounds
    stone: "#6E6862",             // Muted Warm Taupe — Subtitles & secondary text
    stoneLight: "#9B958F",        // Light Taupe — Placeholders & caption text
    charcoal: "#231E1C",          // Warm Obsidian Charcoal — Primary body text
    border: "#E8E2D8",            // Warm Stone Border — Subtle card & component outline
    borderSubtle: "rgba(120, 7, 13, 0.08)", // Luxury subtle garnet divider
  },

  charts: {
    maroon: "#78070D",
    gold: "#C59B4E",
    crimson: "#A3131B",
    amber: "#D49A3D",
    plum: "#4A0408",
  },
} as const;

export type ThemeColors = typeof THEME_COLORS;
