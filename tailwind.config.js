/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    fontFamily: {
      sciteens: [
        'var(--font-sciteens)',
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'Roboto',
        'Helvetica',
        'Arial',
        'sans-serif',
        'Apple Color Emoji',
        'Segoe UI Emoji',
        'Segoe UI Symbol',
      ],
    },
    extend: {
      colors: {
        sciteensGreen: {
          regular: '#2d8a5b',
          dark: '#236648',
        },
        sciteensLightGreen: {
          regular: '#00c853',
          dark: '#00ad48',
        },
        backgroundGreen: '#F5FFF5',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
