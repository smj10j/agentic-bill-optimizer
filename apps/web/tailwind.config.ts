import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        primary: {
          DEFAULT: "hsl(221 83% 53%)",
          foreground: "hsl(0 0% 100%)",
        },
        success: "hsl(142 71% 45%)",
        warning: "hsl(38 92% 50%)",
      },
    },
  },
  plugins: [],
} satisfies Config;
