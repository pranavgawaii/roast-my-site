/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ember: {
          50: "#faf7ef",
          100: "#f1e7d2",
          200: "#e4d0a5",
          300: "#d4b67a",
          400: "#c49d56",
          500: "#b18435",
          600: "#8f6928",
          700: "#6c4f1f",
          800: "#4a3717",
          900: "#2b220f"
        }
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"]
      },
      boxShadow: {
        glow: "0 0 42px rgba(177, 132, 53, 0.2)"
      }
    }
  },
  plugins: []
};
