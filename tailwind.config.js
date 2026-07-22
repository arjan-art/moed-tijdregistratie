/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B2A4A',
          50: '#e8eaf0', 100: '#c5cad8', 200: '#9ea7bf', 300: '#7885a6',
          400: '#5b6b93', 500: '#1B2A4A', 600: '#16233f', 700: '#111b33',
          800: '#0c1427', 900: '#070e1b',
        },
        accent: {
          DEFAULT: '#F59E0B',
          50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
          400: '#fbbf24', 500: '#F59E0B', 600: '#d97706', 700: '#b45309',
          800: '#92400e', 900: '#78350f',
        },
        teal: {
          DEFAULT: '#0D9488',
          50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4',
          400: '#2dd4bf', 500: '#0D9488', 600: '#0d9488', 700: '#0f766e',
          800: '#115e59', 900: '#134e4a',
        },
        rose: {
          DEFAULT: '#E11D48',
          50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af',
          400: '#fb7185', 500: '#E11D48', 600: '#e11d48', 700: '#be123c',
          800: '#9f1239', 900: '#881337',
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
