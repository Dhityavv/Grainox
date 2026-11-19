import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      colors: {
        grain: {
          bg: "#080A0E",
          card: "#11151D",
          panel: "#161B26",
          elevated: "#1A212E",
          border: "#202838",
          "border-subtle": "rgba(255, 255, 255, 0.08)",
          accent: "#F59E0B",
          "accent-hover": "#D97706",
          "accent-active": "#B45309",
          muted: "#94A3B8",
        },
      },
      animation: {
        "shimmer-slide": "shimmer 3s ease-in-out infinite",
        "pulse-subtle": "pulseSubtle 3s ease-in-out infinite",
      },
      keyframes: {
        shimmer: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.96", transform: "scale(0.995)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
