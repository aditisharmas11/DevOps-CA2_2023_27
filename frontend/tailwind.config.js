/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "var(--border-color)",
        input: "rgba(255, 255, 255, 0.05)",
        ring: "var(--accent-primary)",
        background: "var(--bg-primary)",
        foreground: "var(--text-primary)",
        primary: {
          DEFAULT: "var(--accent-primary)",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "var(--bg-secondary)",
          foreground: "var(--text-primary)",
        },
        destructive: {
          DEFAULT: "var(--accent-danger)",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "var(--text-muted)",
          foreground: "var(--text-secondary)",
        },
        accent: {
          DEFAULT: "rgba(255, 255, 255, 0.03)",
          foreground: "var(--text-primary)",
        },
        popover: {
          DEFAULT: "var(--bg-secondary)",
          foreground: "var(--text-primary)",
        },
        card: {
          DEFAULT: "var(--bg-secondary)",
          foreground: "var(--text-primary)",
        },
      },
      borderRadius: {
        lg: "var(--border-radius)",
        md: "calc(var(--border-radius) - 2px)",
        sm: "calc(var(--border-radius) - 4px)",
      },
      boxShadow: {
        neo: "var(--shadow-neo-flat)",
        "neo-inset": "var(--shadow-neo-inset)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
}
