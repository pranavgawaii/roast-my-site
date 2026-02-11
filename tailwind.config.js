/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ember: {
          50: "#fff0f0",
          100: "#ffc2c2",
          200: "#ff9b9b",
          300: "#ff7373",
          400: "#ff5656",
          500: "#ff3b3b",
          600: "#e02c2c",
          700: "#b52121",
          800: "#8b1919",
          900: "#611010"
        }
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"]
      },
      boxShadow: {
        glow: "0 0 42px rgba(255, 59, 59, 0.24)"
      }
    }
  },
  plugins: []
};
