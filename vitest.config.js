const { defineConfig } = require('vitest/config')
const path = require('node:path')

module.exports = defineConfig({
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, '.') },
      // The app mixes `firebase/x` and `@firebase/x` imports for these
      // subpaths (both are the same public API; the latter only
      // resolves under bundlers that walk into a dependency's own
      // nested node_modules, which Vite/Node's resolver does not).
      // Redirect to the `firebase` package's subpath, a real top-level
      // dependency — scoped to exact names so it never shadows an
      // unrelated package like `@firebase/rules-unit-testing`.
      {
        find: /^@firebase\/(firestore|auth|storage|app)$/,
        replacement: 'firebase/$1',
      },
    ],
  },
  test: {
    environment: 'node',
    include: ['**/*.test.js'],
    exclude: [
      '**/node_modules/**',
      '**/.next/**',
      '**/.git/**',
    ],
  },
})
