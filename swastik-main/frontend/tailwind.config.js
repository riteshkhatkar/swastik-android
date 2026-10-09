/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          htmlRoot: "#E8EDF3",
          mainWorkspace: "#F1F5F9",
          configBackgroundDefault: "#F4F6F9",
          configBackgroundSubtle: "#EEF2F6"
        },
        surfaces: {
          cardPaper: "#FFFFFF",
          cardGradientEnd: "#F8FAFC",
          nestedInset: "#F8FAFC",
        },
        brandPrimary: {
          DEFAULT: "#6366F1",
          dark: "#4F46E5",
          light: "#818CF8",
          onPrimary: "#FFFFFF",
        },
        semantic: {
          positive: "#10B981",
          warning: "#F59E0B",
          negative: "#EF4444",
          accentA: "#8B5CF6",
          accentB: "#0EA5E9"
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Outfit", "sans-serif"],
      },
      boxShadow: {
        premium: "0 1px 3px 0 rgba(15,23,42,0.06), 0 8px 24px -4px rgba(15,23,42,0.08)",
        "accent-a-glow": "0 0 20px -4px rgba(139,92,246,0.2)",
        "accent-b-glow": "0 0 20px -4px rgba(14,165,233,0.15)",
      },
      borderRadius: {
        hero: "1rem", // rounded-2xl
        card: "0.75rem", // rounded-xl
        nested: "0.5rem", // rounded-lg
        badge: "0.375rem", // rounded-md
      }
    },
  },
  plugins: [],
}
