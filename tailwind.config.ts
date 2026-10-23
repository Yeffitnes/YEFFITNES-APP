import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0A0910", surface: "#F5F6FA", neon: "#F7254B", rose: "#F2406B",
        accent: "#D41A40", garnet: "#9C1535", pearl: "#CDB170", "gold-deep": "#8D6526",
        line: "#E1E3EC", dim: "#5B6172",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
