/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#F5C518",      // App's main yellow
        secondary: "#2D6A2D",    // App's main green
        accent: "#FF8C00",       // Deep saffron orange accent
        dark: "#1A1A1A",         // Dark background
        card: "#1E1E1E",         // Card background
        textLight: "#FFFFFF",
        textMuted: "#AAAAAA",
      },
    },
  },
  plugins: [],
};
