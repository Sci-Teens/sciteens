module.exports = {
  mode: 'jit',
  purge: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        sciteensGreen: {
          regular: "#2d8a5b",
          dark: "#236648",
        },
        sciteensLightGreen: {
          regular: "#00c853",
          dark: "#00ad48",
        },
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
