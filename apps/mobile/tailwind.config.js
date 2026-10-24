/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Navarachna Atelier Crimson Theme
        primary: {
          DEFAULT: "#9E1B38",
          foreground: "#ffffff",
          50: "#fff1f3",
          100: "#ffe4e8",
          200: "#fecdd6",
          300: "#fda4b8",
          400: "#fb7193",
          500: "#d91e4a",
          600: "#9e1b38",
          700: "#80142c",
          800: "#640f22",
          900: "#4a0b19",
          950: "#2d040d",
        },
        // Navarachna Atelier Midnight Navy Theme
        navy: {
          DEFAULT: "#1E2246",
          foreground: "#ffffff",
          50: "#f3f4f8",
          100: "#e5e7f1",
          200: "#cbd1e3",
          300: "#a3add1",
          400: "#7582bb",
          500: "#5260a5",
          600: "#3d498c",
          700: "#2e376e",
          800: "#1e2246",
          900: "#14172f",
          950: "#0b0c1a",
        },
        // Preset b51GFh7y6 Mist Palette
        mist: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
      },
      borderRadius: {
        "4xl": "2rem",
        "3xl": "1.5rem",
        "2xl": "1rem",
        xl: "0.75rem",
      },
    },
  },
  plugins: [],
};
