import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Elit-Web brand-ish palette + per-channel accents
        brand: {
          DEFAULT: "#1a56db",
          dark: "#0b1220",
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
