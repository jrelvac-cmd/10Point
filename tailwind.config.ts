import type { Config } from "tailwindcss";

/**
 * Les couleurs de surface et de texte sont des variables CSS : le même
 * composant s'affiche en verre sombre sur les pages publiques et en verre
 * clair dans l'application (voir globals.css, classe `theme-app`).
 * L'accent reste une valeur fixe car il est utilisé avec des opacités
 * (`bg-accent/40`), ce que Tailwind ne sait pas dériver d'une variable.
 */
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
          DEFAULT: "var(--glass)",
          strong: "var(--glass-strong)",
          border: "var(--glass-border)",
          inner: "var(--glass-inner)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        accent: {
          DEFAULT: "#6366F1",
          light: "#A5B4FC",
          dark: "#4338CA",
        },
        up: "#34D399",
        down: "#FB923C",
        warn: "#FBBF24",
        gauge: {
          up: "#5561B9",
          stable: "#F1F2F9",
          down: "#F2A0A0",
        },
      },
      fontFamily: {
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui"],
      },
      backdropBlur: {
        glass: "16px",
        "glass-strong": "24px",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        inner: "var(--shadow-inner)",
      },
    },
  },
  plugins: [],
};

export default config;
