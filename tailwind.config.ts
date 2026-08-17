import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Elit-Web фірмові кольори + акценти платформ
        brand: {
          DEFAULT: "#FA321E", // фірмовий червоний Elit-Web
          dark: "#0a0a0b",
        },
        surface: {
          bg: "#0a0a0b",
          card: "#141416",
          border: "#26262a",
        },
        channel: {
          google_ads: "#4285F4",
          meta: "#0866FF",
          ga4: "#E8710A",
          hubspot: "#FF7A59",
          search_console: "#34A853",
        },
      },
    },
  },
  plugins: [],
};

export default config;
