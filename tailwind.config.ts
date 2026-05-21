import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/styles/**/*.css",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-ui)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        mono: ["ui-monospace", "monospace"],
      },
      colors: {
        flag: {
          DEFAULT: "#d63d32",
          hover: "#b83229",
          muted: "#fde8e6",
          glow: "#ff6b5e",
        },
        night: {
          DEFAULT: "#18181b",
          soft: "#3f3f46",
        },
        sand: {
          DEFAULT: "#fafafa",
          deep: "#e4e4e7",
          card: "#ffffff",
        },
        surface: {
          DEFAULT: "#fafafa",
          muted: "#e4e4e7",
        },
        ink: {
          DEFAULT: "#18181b",
          muted: "#52525b",
          subtle: "#a1a1aa",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(0, 0, 0, 0.04), 0 16px 40px -20px rgba(0, 0, 0, 0.12)",
        lift: "0 24px 48px -16px rgba(0, 0, 0, 0.14), 0 8px 16px -8px rgba(0, 0, 0, 0.08)",
        flag: "0 8px 28px -6px rgba(214, 61, 50, 0.35)",
        brand: "0 10px 30px -12px rgba(0, 0, 0, 0.1)",
      },
      backgroundImage: {
        "welcome-sheen":
          "linear-gradient(135deg, #ffffff 0%, rgba(253, 232, 230, 0.35) 48%, #fafafa 100%)",
        "flag-ribbon":
          "repeating-linear-gradient(125deg, rgba(214,61,50,0.03) 0px, rgba(214,61,50,0.03) 2px, transparent 2px, transparent 11px)",
        "hero-band":
          "linear-gradient(105deg, rgba(244,244,245,0.95) 0%, rgba(250,250,250,0.5) 50%, transparent 80%)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};
export default config;
