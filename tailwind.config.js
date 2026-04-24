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
          // These reference CSS vars so they switch with the theme automatically
          cream: 'rgb(var(--brand-cream) / <alpha-value>)',
          dark: 'rgb(var(--brand-dark) / <alpha-value>)',
          yellow: 'rgb(var(--brand-yellow) / <alpha-value>)',
          'yellow-dark': '#D4961A',
          teal: 'rgb(var(--brand-teal) / <alpha-value>)',
          'teal-dark': '#787873',
          red: 'rgb(var(--brand-yellow) / <alpha-value>)',
          'red-dark': '#D4961A',
          light: 'rgb(var(--brand-cream) / <alpha-value>)',
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
