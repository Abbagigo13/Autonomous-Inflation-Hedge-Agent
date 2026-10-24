import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        graphite: "#090B0F",
        panel: "#10141A",
        mint: "#B8FF6A",
        electric: "#57C7FF",
        amber: "#FFC857"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      boxShadow: {
        glow: "0 0 32px rgba(184, 255, 106, 0.12)"
      }
    }
  },
  plugins: []
} satisfies Config;
