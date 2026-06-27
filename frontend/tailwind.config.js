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
          primary: '#3B82F6',    // Sky Blue
          secondary: '#1E3A8A',  // Deep Royal Blue
          accent: '#60A5FA',     // Soft Light Blue
          bg: '#F0F4F8',         // Light Blue-Gray bg
          card: '#FFFFFF',       // White
          text: '#1E293B',       // Dark Slate
        }
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
