// Two projects: "emulator" (local Firebase Auth + Firestore emulators,
// everything that writes data) and "live" (real firebaseConfig,
// csp-smoke.spec.js only — reCAPTCHA needs the real widget, which the
// Auth emulator fakes).
const {
  defineConfig,
  devices,
} = require('@playwright/test')
const {
  EMULATOR_PROJECT_ID,
  EMULATOR_APP_PORT,
  LIVE_APP_PORT,
  EMULATOR_FIREBASE_CONFIG,
} = require('./e2e/support/env')
const {
  readEnvLocal,
} = require('./e2e/support/read-env-local')

const liveEnv = { ...readEnvLocal(), ...process.env }
const hasLiveFirebaseConfig = Boolean(
  liveEnv.NEXT_PUBLIC_FB_API_KEY &&
    liveEnv.NEXT_PUBLIC_FB_PROJECT_ID
)
if (!hasLiveFirebaseConfig) {
  console.warn(
    '[playwright.config] No real Firebase config found — skipping the "live" project (e2e/csp-smoke.spec.js).'
  )
}

const reuseExistingServer = !process.env.CI

const webServer = [
  {
    // `emulators:exec` (not `emulators:start`) for reliable teardown:
    // the Firestore emulator's Java process runs in its own detached
    // session and survives a plain SIGTERM. Capped heap: standard
    // GitHub-hosted runners have 7GB total RAM and no swap — the JVM,
    // next dev, and Chromium together peak above that during teardown.
    // Fixture data is a handful of docs, so 512m is generous.
    command: `pnpm exec firebase emulators:exec --only auth,firestore --project ${EMULATOR_PROJECT_ID} "node e2e/support/hold-open.js"`,
    url: 'http://127.0.0.1:8080',
    reuseExistingServer,
    timeout: 60_000,
    gracefulShutdown: { timeout: 5_000 },
    env: {
      JAVA_TOOL_OPTIONS: '-Xmx512m',
    },
  },
  {
    // `next dev`, not build+start: build+start didn't fix the known
    // /articles hydration issue (see i18n-smoke.spec.js) and was less
    // stable overall in testing.
    command: `pnpm exec next dev -p ${EMULATOR_APP_PORT}`,
    url: `http://127.0.0.1:${EMULATOR_APP_PORT}`,
    reuseExistingServer,
    timeout: 180_000,
    gracefulShutdown: { timeout: 5_000 },
    env: {
      ...EMULATOR_FIREBASE_CONFIG,
      NEXT_PUBLIC_I18NEXT_DEBUG: 'true',
      NEXT_DIST_DIR: '.next-e2e-emulator',
      // Same 7GB-runner memory budget as the JVM cap above — `next
      // dev`'s module graph grows with every distinct route/locale
      // it compiles across the run, so cap it instead of letting V8
      // grow toward the default (much larger) ceiling.
      NODE_OPTIONS: '--max-old-space-size=1024',
    },
  },
]

const projects = [
  {
    name: 'emulator',
    testDir: './e2e',
    testIgnore: /csp-smoke\.spec\.js/,
    use: {
      ...devices['Desktop Chrome'],
      baseURL: `http://127.0.0.1:${EMULATOR_APP_PORT}`,
    },
  },
]

if (hasLiveFirebaseConfig) {
  webServer.push({
    command: `pnpm exec next build && pnpm exec next start -p ${LIVE_APP_PORT}`,
    url: `http://127.0.0.1:${LIVE_APP_PORT}`,
    reuseExistingServer,
    timeout: 300_000,
    env: {
      NEXT_PUBLIC_USE_FIREBASE_EMULATORS: 'false',
      NEXT_DIST_DIR: '.next-e2e-live',
    },
  })
  projects.push({
    name: 'live',
    testDir: './e2e',
    testMatch: /csp-smoke\.spec\.js/,
    use: {
      ...devices['Desktop Chrome'],
      baseURL: `http://127.0.0.1:${LIVE_APP_PORT}`,
    },
  })
}

module.exports = defineConfig({
  testDir: './e2e',
  globalSetup: require.resolve('./e2e/global-setup.js'),
  globalTeardown: require.resolve(
    './e2e/global-teardown.js'
  ),
  fullyParallel: true,
  // Capped: too much parallelism serializes route compilation behind
  // one dev server. Single worker in CI: standard GitHub-hosted
  // runners only have 7GB RAM total, and even 2 parallel Chromium
  // instances alongside `next dev` and the JVM Firestore/Auth
  // emulator OOM-killed the run (see the JVM/Node heap caps above —
  // this is a memory budget problem, not a compile-race one).
  workers: process.env.CI ? 1 : 4,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['list']]
    : [['list']],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer,
  projects,
})
