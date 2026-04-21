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
          cream: '#f7ebd7',
          dark: '#020100',
          yellow: '#fecc30',
          'yellow-dark': '#d4a800',
          teal: '#40b3ac',
          'teal-dark': '#2e9991',
          // Aliases so existing references to brand-red auto-update
          red: '#fecc30',
          'red-dark': '#d4a800',
          light: '#f7ebd7',
        }
      },
      fontFamily: {
        sans: ['Josefin Sans', 'sans-serif'],
        display: ['Lobster', 'cursive'],
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(247, 235, 215, 0.08), rgba(247, 235, 215, 0))',
      }
    },
  },
  plugins: [],
}
