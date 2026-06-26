/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#2563EB',    // Modern Blue
          secondary: '#60A5FA',  // Light Blue
          accent: '#06B6D4',     // Cyan
          bg: '#F8FAFC',         // Soft Gray
          card: '#FFFFFF',       // White
          text: '#0F172A',       // Dark Slate
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
