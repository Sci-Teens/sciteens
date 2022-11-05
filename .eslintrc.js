module.exports = {
  root: true,
  env: {
    node: true,
    es6: true,
  },
  parserOptions: { ecmaVersion: 8 },
  ignorePatterns: [
    'node_modules/*',
    '.next/*',
    '.out/*',
    '!.prettierrc.js',
  ],
  extends: ['eslint:recommended'],
  overrides: [
    {
      files: ['**/*.js', '**/*.jsx'],
      // parser: '@typescript-eslint/parser',
      settings: { react: { version: 'detect' } },
      env: {
        browser: true,
        node: true,
        es6: true,
      },
      extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'plugin:jsx-a11y/recommended',
        'prettier',
        'plugin:prettier/recommended',
      ],
      rules: {
        'react/prop-types': 'off',
        'react/react-in-jsx-scope': 'off',
        'jsx-a11y/anchor-is-valid': 'off',
        'prettier/prettier': [
          'error',
          {},
          { usePrettierrc: true },
        ],
      },
    },
  ],
}
