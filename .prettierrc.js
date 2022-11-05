module.exports = {
  semi: false,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 60,
  tabWidth: 2,
  useTabs: false,
  jsxBracketSameLine: false,
  bracketSpacing: true,
  plugins: [require('prettier-plugin-tailwindcss')],
  tailwindConfig: './tailwind.config.js',
}
