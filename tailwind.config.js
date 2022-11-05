module.exports = {
  important: true,
  mode: 'jit',
  purge: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: false, // or 'media' or 'class'
  theme: {
    fontFamily: {
      sciteens: [
        'nunito',
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
  variants: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/line-clamp'),
  ],
}
