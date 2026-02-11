/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ember: {
          50: "#fff2ee",
          100: "#ffd9cf",
          200: "#ffb3a1",
          300: "#ff8c73",
          400: "#ff6b47",
          500: "#ff4d22",
          600: "#e53d18",
          700: "#b72f13",
          800: "#8f240f",
          900: "#61180a"
        }
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"]
      },
      boxShadow: {
        glow: "0 0 42px rgba(255, 77, 34, 0.24)"
      }
    }
  },
  plugins: []
};
