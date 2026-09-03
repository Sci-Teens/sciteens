# AGENTS.md

SciTeens is the open-source platform behind [sciteens.com](https://sciteens.com):
a Next.js site (SSR + SSG) on React, backed by Firebase v9 modular SDK
(Auth, Firestore, Cloud Storage, Cloud Functions). Articles and courses are
self-hosted markdown in `content/`, project search runs on self-hosted
Meilisearch, i18n in four locales (en/es/fr/hi). Deployed on Google
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

## Design philosophy

SciTeens follows a **Minimalist / Swiss-style** design system:
flat surfaces, borders as the primary visual separator, and
restrained shadows (`shadow-sm`, never large soft-UI shadows).
Color comes from the brand green palette
(`sciteensGreen`, `sciteensLightGreen`, `backgroundGreen` in
`styles/globals.css`); everything else is neutral grayscale via
shadcn tokens.

- **Prefer shadcn primitives** (`components/ui/*`) over hand-rolled
  equivalents. If a `Card`, `Button`, `Badge`, `Input`, `Skeleton`,
  or `Separator` fits, use it instead of recreating the styles with
  raw `<div>`/`<a>` + ad-hoc Tailwind. Only deviate when a
  component genuinely needs behavior the primitive doesn't provide.
- **Card pattern**: `Card` + `CardContent` with `border-border/60`
  and `shadow-sm`, matching `ProjectCard`. Listing items (projects,
  articles, courses) should share this shape.
- **Mobile gutter consistency**: the nav bar sits at `mx-4`; page
  content on mobile must use `px-4` to align with it. Differing
  widths (e.g. `w-11/12`, `w-5/6`, `lg:w-1/2`) should only apply
  at `md:` and above, never on the base/mobile layer.
- **Consistent radius**: use the theme radius scale
  (`rounded-xl` for cards, `rounded-lg` for nested media). Do not
  mix `rounded-sm`, `rounded-md`, or bare corners on content
  surfaces.
- **Loading states**: use `Skeleton` (`components/ui/skeleton.jsx`)
  for shimmer placeholders, not ad-hoc `bg-muted animate-pulse`
  divs.
- **Entrance motion never hides content.** Anything that can land in
  the initial viewport must paint opaque, or it cannot be a
  first-contentful-paint/LCP candidate until it fades in. Above the
  fold use the `.reveal-up` utility in `styles/globals.css` (CSS
  keyframe, transform-only, no JS, honours
  `prefers-reduced-motion`); for scroll-triggered sections use
  `riseUp` + `useSectionReveal` from `lib/reveal.js`, which is
  transform-only for the same reason. Never animate `opacity` from 0
  on a page's own content.

## Architecture

- One Next.js app: `pages/`, `components/`, `context/` + `lib/` (client
  singletons and hooks), `functions/` (Firebase Cloud Functions).
- Firebase access goes through singletons split by SDK so that the
  Firestore and Storage bundles stay out of the shared `_app` chunk:
  `lib/firebase.js` (`app`, `auth`), `lib/firestore.js` (`db`),
  `lib/storage.js` (`storage`). The guarded init
  (`getApps().length ? getApp() : initializeApp(config)`) lets SSR/SSG reuse
  one app instance. No ad-hoc `initializeApp`, and never re-export `db` or
  `storage` from `lib/firebase.js` to shorten an import.
- `auth` is built with `initializeAuth`, not `getAuth`, specifically to leave
  `popupRedirectResolver` unset: `getAuth` would eagerly fetch the
  `*.firebaseapp.com/__/auth/iframe.js` helper (plus gapi) on every page as
  soon as `onAuthStateChanged` subscribes. `context/helpers.js#providerSignIn`
  passes `browserPopupRedirectResolver` to `signInWithPopup` instead, so only
  Google sign-in pays for it.
- Auth state: `AuthProvider` in `context/AuthContext.js`, one
  `onAuthStateChanged` listener. Use its hooks (`useSigninCheck`, `useUser`),
  not per-component listeners.
- Firestore real-time reads: `useFirestoreDocData` /
  `useFirestoreCollectionData` in `lib/firestoreData.js` (onSnapshot-backed,
  reactfire-shaped returns). Memoize Query args so subscriptions don't
  rebuild every render.
- Cloud Functions own cross-collection integrity: `newUser`, `newProfile`,
  `newProgram`, `updateUserStats`, `scheduledProgramEmailer`, `fileUpload`.
  Denormalize/aggregate/notify in a function, not the client. Client triggers
  side effects by writing a doc the function watches (e.g. `project-invites`).
- Articles and courses are markdown in `content/articles/` and
  `content/courses/`, with media in `public/content/media/`. Prismic is gone:
  there is no CMS, no webhook, and no content in Firestore. The pipeline is
  build-time only and split on purpose:
  `lib/markdown.mjs` (markdown to hast, `.mjs` so the prebuild script can
  load it under plain node), `lib/content.js` (reads `content/` with `fs`,
  measures image dimensions off the files themselves), and
  `components/MarkdownContent.js` (renders the hast JSON). Import
  `lib/content.js` from `getStaticProps` only. It pulls in `node:fs` and the
  parser, and the point of the split is that no markdown parser reaches the
  client bundle.
  Two directives carry what Prismic slices used to: `::embed{url=…}` and
  `:::interview{name=… headshot=…}`. Never add `rehype-raw`; `script-src`
  still carries `'unsafe-inline'`, so a raw-HTML sink here is a scripting
  sink. Every url is allowlisted in `lib/contentUrls.mjs`, checked at build
  time and again at the render sink.
  Article and course media is pre-converted WebP at the width it renders, so
  it is served as a plain `<img>` from `public/`, never through
  `next/image`: Cloud Run runs `min-instances 0` with a per-instance
  optimizer cache, so `/_next/image` would re-encode after every cold start.
  Small thumbnails (listing cards, recommendation slides) are the one
  exception and do go through `next/image`.
  Body-text search needs `public/content/article-search.json`, generated by
  `scripts/build-search-index.mjs` before `dev` and `build`. `/articles`
  fetches it lazily on the first real query, never on a plain visit.
- Project and opportunity search run on a self-hosted Meilisearch instance
  in Cloud Run (`infra/meilisearch/`). `functions/search.js` keeps both
  indexes in sync through Firestore triggers in `functions/index.js`.
  Only `pages/api/search/projects.js` and
  `pages/api/search/opportunities.js` handle browser search requests.
  Cloud Functions use the master key to maintain both indexes. The browser
  never receives `MEILI_HOST` or an API key.
  Plain project browsing and single-topic filtering stay on Firestore
  directly (see `lib/search.js#requiresSearchIndex`). Free-text search,
  date-range filtering, and the "Most upvoted" order use the projects index.
  The opportunities page uses its index for student-focused text, grade,
  location, program type, deadline, and status filters. Its initial static
  fallback uses Firestore.
  Index settings live in `scripts/lib/meilisearchIndexSettings.js`. Query
  settings live in `lib/search.js` and `lib/opportunitySearch.js`.
  Measure project relevance with
  `scripts/eval-meilisearch-relevance.js --baseline` and the fixtures in
  `scripts/lib/relevanceBattery.js`. See
  `infra/meilisearch/README.md#relevance-tuning`. After a search document
  mapper changes, run `scripts/reindex-meilisearch.js` for the affected
  index because the triggers do not backfill unchanged documents.
- API routes (`pages/api/*`) are Next serverless functions, distinct from
  `functions/` (Firebase Cloud Functions). Keep server-only work (e.g. the
  Meilisearch admin/search keys) in API routes or `functions/`, never in
  client bundles.
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
- Firebase Hosting sits in front of Cloud Run as a CDN (`hosting` in
  `firebase.json`, deployed last in `cloud-build.yaml`). It proxies every
  path to the `website` service rather than serving `public/` itself, so all
  responses keep the headers above and there is one origin of truth for them;
  Hosting still edge-caches whatever `Cache-Control` Cloud Run sends. It is
  inert until the custom domain moves off the Cloud Run domain mapping. See
  `infra/hosting/README.md`.

## Security considerations

- **Owner-scoped writes only.** Client writes are gated on `auth.uid` (and
  documented ownership like `member_uids` for projects). Collections written
  by Cloud Functions (`programs`, `statistics`, `emails`) are denied to
  clients, as is `courses` (enrollment records nothing writes any more). See
  the enforcement comment at the top of `firestore.rules`.
- Comment threads exist for projects, articles and courses at
  `projects|article|course/{id}/discussion`. All three share
  `isValidNewComment()`/`isCommentBodyEdit()` in `firestore.rules`; add a new
  thread by reusing those, not by copying the guards.
- **Server-only secrets stay server-side.** Anything prefixed `NEXT_PUBLIC_`
  is inlined into the client bundle. Keys that must not leak
  (`MEILI_MASTER_KEY`, `MEILI_SEARCH_KEY`) are never `NEXT_PUBLIC_` and only
  read in API routes or Cloud Functions. Never hardcode keys or webhooks;
  the repo is public.
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
