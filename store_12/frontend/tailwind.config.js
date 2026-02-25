/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        serif: ['"DM Serif Display"', 'serif'],
      },
      colors: {
        primary: {
          50: '#f0f9f1',
          100: '#dcf1df',
          200: '#bbe1c2',
          300: '#8ec99a',
          400: '#5da86c',
          500: '#3e8c4e',
          600: '#2e703c',
          700: '#265932',
          800: '#20472a',
          900: '#1b3b24',
          950: '#0e2013',
        },
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        }
      }
    },
  },
  plugins: [],
  darkMode: 'class',
}
