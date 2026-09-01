import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          from: "#0f0c29",
          via: "#302b63",
          to: "#24243e",
        },
        glass: {
          DEFAULT: "rgba(255, 255, 255, 0.08)",
          strong: "rgba(255, 255, 255, 0.14)",
          border: "rgba(255, 255, 255, 0.15)",
        },
        text: {
          primary: "#FFFFFF",
          secondary: "rgba(255, 255, 255, 0.60)",
          muted: "rgba(255, 255, 255, 0.35)",
        },
        accent: {
          DEFAULT: "#6366F1",
          light: "#A5B4FC",
          dark: "#4338CA",
        },
        up: "#34D399",
        down: "#FB923C",
        warn: "#FBBF24",
      },
      fontFamily: {
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui"],
      },
      backdropBlur: {
        glass: "16px",
        "glass-strong": "24px",
      },
    },
  },
  plugins: [],
};

export default config;
