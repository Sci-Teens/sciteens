# AGENTS.md

SciTeens is the open-source platform behind [sciteens.com](https://sciteens.com):
a Next.js site (SSR + SSG) on React, backed by Firebase v9 modular SDK
(Auth, Firestore, Cloud Storage, Cloud Functions). Content lives in Prismic,
search in Algolia, i18n in four locales (en/es/fr/hi). Deployed on Google
Cloud Run. Security, ownership checks, and secret hygiene matter most.

SciTeens' platform-lift migration (Next 14 Pages Router, React 18,
Tailwind v4, shadcn/Base UI primitives, TanStack Query replacing
reactfire/swr/react-paginate) is complete and merged to `main`. Do not
pin to specific dependency versions without checking `package.json` and
the tree first.

## Setup commands

```bash
corepack pnpm install            # deps (lockfile frozen in CI)
corepack pnpm dev                # dev server on :3000 (needs firebaseConfig.js)
corepack pnpm build              # next build + sitemap; lint fails the build
corepack pnpm lint               # next lint
corepack pnpm format            # prettier --check
corepack pnpm format:fix        # prettier --write
```

API keys / Firebase config live in `firebaseConfig.js` (gitignored) and build
args; without them `pnpm dev` errors at runtime, not install.

## Code style

- Prettier is enforced by ESLint: no semicolons, single quotes, trailing
  comma `es5`, `printWidth: 60`, `tabWidth: 2`. Run `pnpm format:fix`.
- Comments answer "why", not "what". No section-divider comments. Comments
  should be sparse and minimal. If you MUST comment, only use a single
  sentence or statement.
- No em dashes or emojis in prose (README, docs, commits, PRs).
- i18n required on user-facing pages: `useTranslation('common')` in
  components, `serverSideTranslations(locale, ['common'])` in `getStaticProps`.
  Strings in `public/locales/{en,es,fr,hi}/common.json`. No hardcoded English
  user-facing copy.

## Architecture

- One Next.js app: `pages/`, `components/`, `context/` + `lib/` (client
  singletons and hooks), `functions/` (Firebase Cloud Functions).
- Firebase access goes through singletons in `lib/firebase.js`
  (`app`, `auth`, `db`, `storage`); the guarded init
  (`getApps().length ? getApp() : initializeApp(config)`) lets SSR/SSG reuse
  one app instance. No ad-hoc `initializeApp`.
- Auth state: `AuthProvider` in `context/AuthContext.js`, one
  `onAuthStateChanged` listener. Use its hooks (`useSigninCheck`, `useUser`),
  not per-component listeners.
- Firestore real-time reads: `useFirestoreDocData` /
  `useFirestoreCollectionData` in `lib/firestoreData.js` (onSnapshot-backed,
  reactfire-shaped returns). Memoize Query args so subscriptions don't
  rebuild every render.
- Cloud Functions own cross-collection integrity: `newUser`, `newProfile`,
  `newProgram`, `updateUserStats`, `newCourse` (Prismic webhook),
  `scheduledProgramEmailer`, `fileUpload`. Denormalize/aggregate/notify in a
  function, not the client. Client triggers side effects by writing a doc the
  function watches (e.g. `project-invites`).
- Content (courses/articles) is authored in Prismic and synced into Firestore
  by the `newCourse` webhook. Prefer Prismic + Algolia over duplicating
  storage in Firestore.
- API routes (`pages/api/*`) are Next serverless functions, distinct from
  `functions/` (Firebase Cloud Functions). Keep server-only work (e.g. the
  Algolia admin key) in API routes or `functions/`, never in client
  bundles.
- Toxicity detection (`components/Discussion.js`) runs fully client-side:
  `lib/toxicityWorker.js` loads Xenova/toxic-bert with
  `@huggingface/transformers`, fetched at runtime from jsDelivr (pinned
  version, `webpackIgnore`d — Next's webpack/SWC build cannot parse
  onnxruntime-web's pre-minified ESM chunks) in a Web Worker, and
  classifies comments in the browser — no server round trip, no API key.
  `lib/toxicity.js` holds the shared constants/validation/threshold logic
  and is unit-tested directly. See
  https://web.dev/articles/ai-detect-toxicity-build.
- Security headers (CSP, HSTS, X-Frame-Options, Permissions-Policy) are set
  in `next.config.js#headers()`. Any new external script/style/font/img/
  connect host must be added to the CSP there, or it will be blocked.

## Security considerations

- **Owner-scoped writes only.** Client writes are gated on `auth.uid` (and
  documented ownership like `member_uids` for projects). Collections written
  by Cloud Functions (`programs`, `courses`, `statistics`, `emails`) are
  denied to clients. See the enforcement comment at the top of
  `firestore.rules`.
- **Server-only secrets stay server-side.** Anything prefixed `NEXT_PUBLIC_`
  is inlined into the client bundle. Keys that must not leak
  (`AL_ADMIN_KEY`) are never `NEXT_PUBLIC_` and only read in API routes or
  Cloud Functions. Never hardcode keys or webhooks; the repo is public.
- **Filename and ref validation.** User uploads never trust `File#name`.
  `getSafeUploadName` (`context/helpers.js`) derives the stored object
  name from an owned MIME allowlist (`UPLOAD_MIME_EXTENSIONS`; images and
  PDFs only, for now) and a freshly-generated id, returning `null` for a
  disallowed type so the caller can reject the upload; never build a
  storage path from a raw user filename or extension. Post-login `?ref=`
  targets are resolved through `resolveRefPath`, which allowlists known
  section prefixes.
- For Firestore/Storage rule changes, walk the rule through the enforcement
  model by hand before deploying.

## Testing instructions

vitest (unit, component, and Firestore rules tests) and Playwright
(end-to-end) are configured; see the Makefile for shortcuts.

- `make test-unit` (or `pnpm test:unit`): pure-function, component, and
  page-level tests under `context/`, `lib/`, `components/`, `tests/pages/`.
- `make test-rules` (or `pnpm test:rules`): `firestore.rules` against the
  Firestore emulator (needs a JDK 21+ for the `firebase-tools` emulator).
- `make test-e2e` / `make test-e2e-ui` (or `pnpm test:e2e[:ui]`):
  Playwright, `emulator` project by default; the `live` project
  (`csp-smoke.spec.js`) needs a real `firebaseConfig.js`.
- `make test` runs unit + rules, matching CI.

For anything not covered by an existing suite:

- Bug fix: describe the repro and confirm the fix (manual `pnpm dev`, or a
  `fetch` against an API route).
- New behavior: happy path plus at least one edge case (empty input, missing
  auth, oversized payload, unauthenticated write).
- Refactor: no behavior change; `pnpm lint` and `pnpm build` stay green.
- Never weaken validation or security checks to make something pass.

## PR instructions

- Branch off `main` with `fix/`, `feat/`, `refactor/`, `chore/` prefixes.
  Conventional commit messages; standard git commits only; never commit via
  credential tokens.
- Run `pnpm lint && pnpm test:unit && pnpm build` before opening a PR
  (`make lint test-unit build` also works).
- End each task with: **What changed** (files/functions), **Why** (root cause
  or rationale), **Validation** (commands run and what passed), **Open
  questions/risks**.
- Deployments go through Cloud Build (`cloud-build.yaml`) to Cloud Run; do
  not push to `main` expecting auto-deploy without confirming build args are
  set.
