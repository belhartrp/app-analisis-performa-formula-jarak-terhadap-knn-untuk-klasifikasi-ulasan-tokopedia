import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-fredoka)", "system-ui", "sans-serif"],
      },
      colors: {
        accent: "#4f46e5",
        positive: "#16a34a",
        negative: "#dc2626",
      },
    },
  },
  plugins: [],
};

export default config;
