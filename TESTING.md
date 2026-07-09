# Testing roadmap

No test runner is wired up yet. This is the recommended next step, ordered
by bang-for-buck: highest-value, lowest-effort items first. Everything below
targets **vitest** (unit/integration) and **Playwright** (end-to-end), per
project decision.

Each item below was scoped against the actual codebase (real file/function
names), and several are motivated directly by bugs found during the
pre-merge sweep of `fix/phase-migration-followups` — the fastest way to prove
these tests earn their keep is to write one and watch it fail on the bug that
prompted it.

## Priority 0 — Firestore security rules (highest ROI, no browser needed)

`firestore.rules` is the actual security boundary for this app (see
AGENTS.md: "Owner-scoped writes only"). It's currently unverified by
anything except manual review. Rule regressions are invisible until
someone probes them in production.

- **Setup**: `firebase-tools` emulator + `@firebase/rules-unit-testing`,
  driven from vitest (`vitest` can run any Node test file; no special
  integration needed beyond starting the emulator in `globalSetup`).
- **Tests to write** (`firestore.rules.test.js`, one `describe` per
  collection in the rules file):
  - `/profiles/{uid}`: owner can create/update/delete; non-owner cannot;
    `create` without `uid == auth.uid` is rejected.
  - `/emails/{uid}`: **no client (including the owner) can read** —
    this is the collection `pages/project/create.js` and
    `pages/project/[id]/edit.js` currently query client-side via
    `collection(firestore, 'emails')` for member-invite lookup; a rules
    test here would have caught that this query is permission-denied
    by construction (see sweep finding below — reproduce with
    `assertFails(getDocs(query(collection(db, 'emails'), ...)))`).
  - `/projects/{projectId}`: create requires `member_uids[0] ==
auth.uid`; update by a non-member is rejected; update that touches
    `member_uids`/`subscribers` is rejected even for a member (mass-assignment
    guard); delete only by a member.
  - `/projects/{id}/discussion/{feedbackId}`: create requires
    `uid == auth.uid`; update/delete only by the comment's author.
  - `/project-invites/{projectId}`: only a project member can
    create/update/delete.
  - Denied-to-clients collections (`programs`, `courses`, `statistics`):
    any client read/write is rejected outright.
- **Why first**: fast (no Next.js, no browser), deterministic, and
  directly defends the property AGENTS.md calls out as mattering most.
  Catches the exact class of bug (a client trying to read/write something
  the rules forbid) that's otherwise only found by manually clicking
  through the app.

## Priority 1 — Pure-function unit tests (vitest, no mocking)

Fast, isolated, regression-locks logic that's already been the source of
real bugs this migration:

- `context/helpers.js`
  - `getSafeUploadName`: only images/PDFs in `UPLOAD_MIME_EXTENSIONS` are
    accepted (returns `null` otherwise); the returned name never contains
    `/`, `\`, or `..` regardless of the input `File#name` (`../../etc/passwd`,
    empty, no extension) because the extension comes solely from a MIME
    allowlist, never from parsing the filename.
  - `resolveRefPath`: allowlist enforcement — rejects unknown sections,
    rejects ids with path separators/dot-segments/special characters,
    accepts only `project|profile|article|course`, `projects` normalizes
    to `project`. This is the open-redirect guard on post-login `?ref=`;
    a single bad case here is a real vulnerability.
  - `getFieldLabel` / `getTranslatedFieldsDict` / `getProjectFieldOptions`:
    case-insensitive lookup (regression test for the
    lowercase-vs-Title-Case project `fields` bug already fixed once —
    `array-contains-any: [field, field.toLowerCase()]` in
    `pages/projects.js`), and confirm `getProjectFieldOptions` excludes
    the `All` sentinel (regression test for the "All" saved as a real
    project field bug).
  - `validatePassword`: table-test the rule set (length, character
    classes) against known-good/known-bad passwords.
- `lib/projects.js`
  - `normalizeProject`: strips HTML tags from `abstract`/`about` (regression
    test for the raw-HTML-rendered-as-text bug), falls back `title`→`name`,
    `project_photo`→`photo`, `member_arr`→`members`, derives `member_uids`
    from `members[].uid` when absent.
- `lib/prismicImageLoader.js`
  - `appendImgixParams` via `maxWidthImageLoader`/`createCropImageLoader`:
    appends with `&` when the source URL already has a query string, `?`
    otherwise (regression test for the double-`?` broken-image bug).
- `lib/firestoreData.js`
  - `getCollectionQueryKey`/`getDocQueryKey` (exported or refactored to be
    exportable): same logical query produces the same key regardless of
    object identity (this is what makes `useFirestoreCollectionData` safe
    to call with a freshly-constructed `query(...)` each render); a
    changed filter/orderBy produces a different key. This is the guard
    against the "callers must memoize" footgun called out in the file's
    own comment — a key-stability test is cheap insurance against a
    reintroduced infinite-refetch loop.

## Priority 2 — Toxicity detection unit tests (vitest, no mocking) — DONE

`pages/api/toxicity.js` (a Perspective API proxy gating `GM_API_KEY`) has
been replaced with a fully client-side classifier — Xenova/toxic-bert run
in-browser via `@huggingface/transformers`, in a Web Worker
(`lib/toxicityWorker.js`), per
https://web.dev/articles/ai-detect-toxicity-build. There is no longer an
HTTP route, so the original method/origin/rate-limit/API-key bullets below
no longer apply — nothing is left to gatekeep a request or leak a secret
with; classification runs entirely on the user's own device against a
public model name. `lib/toxicity.test.js` (implemented) covers what
carries over and what matters most now that detection itself is the
client's responsibility:

- `validateCommentText`: missing/empty text is rejected; text over
  `MAX_TEXT_LEN` is rejected; text at exactly the limit is accepted
  (boundary) — this is the client-side equivalent of the old route's
  400s, run before the worker is ever invoked.
- `getToxicityTypes` / `assessToxicity`: only labels whose score is
  strictly greater than `TOXICITY_THRESHOLD` are flagged (boundary case:
  a score exactly at the threshold is excluded); malformed/empty
  classifier output degrades to "not toxic" instead of throwing.
- A regression guard that `lib/toxicity.js` never references
  `process.env` — this module is meant to be safe to import anywhere
  (including the Web Worker bundle), and reintroducing a server secret
  into it would be the modern equivalent of the leak the old route
  existed to prevent.

Not covered by unit tests (would need a browser, per Priority 4): the
`lib/toxicityWorker.js` message protocol itself (`MESSAGE_CODE.*`) and
`components/Discussion.js`'s wiring to it — actually loading the ONNX
model and running inference needs a real browser/WebAssembly
environment, not vitest's Node environment.

## Priority 3 — Component tests (vitest + React Testing Library) — DONE

- Signup/signin forms (`pages/signup/student.js`, `pages/signin/student.js`):
  submit stays disabled until all fields are valid; birthday under 13
  rejected with the expected zod error; submit stays disabled until
  `recaptchaSolved` even when the rest of the form is valid.
  (`tests/pages/signup/student.test.js`, `tests/pages/signin/student.test.js`)
- `components/ProjectCard.js`: renders zero-member projects without a
  dangling "By" label (regression test — `member_arr?.length > 0`, not a
  truthy-empty-array check); field badge renders the correct label for
  both legacy-lowercase and Title-Case `fields` values.
  (`components/ProjectCard.test.js`)
- `components/ui/*` primitives are thin Base UI wrappers — not worth
  testing directly (see sweep notes); test them through the pages that
  use them instead (Sheet via NavBar, Field/Label via the forms above).

Two implementation notes for anyone adding more of these:

- Page-level component tests live under `tests/pages/**`, not colocated
  in `pages/**` — Next's Pages Router treats every `.js` file under
  `pages/` as a route, so a colocated `pages/signup/student.test.js`
  broke `next build` (it tried to render the test file as a page). Mock
  the page's dependencies via the `@/*` alias (`vi.mock('@/lib/firebase', …)`)
  rather than a relative path, since the test file's location no longer
  matches the page's.
- `vitest.config.js` forces `oxc.lang: 'jsx'` for `.js`/`.jsx` files —
  Vite 8's built-in oxc transform infers JSX support from the file
  extension, so it silently refuses to parse the plain `.js`-with-JSX
  files this repo (and Next) writes everywhere. `@testing-library/react`,
  `@testing-library/jest-dom`, `@testing-library/user-event`, and
  `jsdom` are the only new test-only dependencies; `vitest.setup.js`
  wires up the jest-dom matchers and each component test file opts into
  `// @vitest-environment jsdom` (the pure-function suites stay on the
  faster default `node` environment) and calls `afterEach(cleanup)`
  itself, since this repo doesn't set `test.globals: true`.

## Priority 4 — Playwright end-to-end (the few flows worth a real browser) — DONE

Implemented in `playwright.config.js` + `e2e/*.spec.js`. Two projects:
"emulator" (local Firebase Auth + Firestore emulators, everything that
writes data) and "live" (real firebaseConfig, `csp-smoke.spec.js` only
— skipped when no real Firebase config is available).

1. **Signup → redirect** (`signup-redirect.spec.js`): student signup
   with no `?ref=` redirects home; a sign-in (not a second signup —
   the Auth Emulator's reCAPTCHA mock only auto-resolves once per
   emulator lifetime, firebase-js-sdk#4126) with
   `?ref=project|<id>` redirects to `/project/<id>`.
2. **Project create → member invite → edit** (`project-flow.spec.js`):
   field checkboxes survive create + edit, including the
   legacy-lowercase-fields pre-check case. Found and documented a
   pre-existing bug: member-by-email lookup is non-functional in
   production (`validateEmail()` queries a collection firestore.rules
   denies all reads on) — needs a Cloud Function fix, out of scope
   here.
3. **`/projects?field=X` filtering** (`projects-filter.spec.js`): a
   seeded lowercase legacy project and a Title-Case project both show
   up with the translated badge.
4. **Mobile nav Sheet a11y** (`nav-a11y.spec.js`): focus trap,
   Escape-to-close, focus restoration.
5. **i18n smoke** (`i18n-smoke.spec.js`): zero missing-key warnings and
   zero page errors across `/`, `/projects`, `/articles` × 4 locales.
   `/articles` has a known, tracked hydration-mismatch bug under
   `next dev` (not root-caused; suspect `useWindowVirtualizer` racing
   live external CMS data) — marked via `test.fail()`, not silently
   dropped.
6. **CSP smoke** (`csp-smoke.spec.js`): reCAPTCHA iframe mounts, zero
   CSP violations (a "script-src: eval" from Google's reCAPTCHA
   challenge UI is filtered — it's an external dependency's behavior,
   not this app's CSP allowlist).

## Setup notes

- **vitest**: `environment: 'jsdom'` for component tests, default `node`
  environment for the pure-function/API-route/rules tests (faster, no DOM
  needed). Reuse the `@/*` alias from `jsconfig.json` in `vitest.config.js`
  so test imports match app imports.
- **Firebase emulator**: `firebase emulators:start --only firestore` in
  CI, `@firebase/rules-unit-testing`'s `initializeTestEnvironment` for the
  P0 rules suite. Do not point rules tests at the real project.
- **Playwright**: `webServer` runs `pnpm dev` for the "emulator"
  project (faster iteration; `next build && next start` surfaced
  more, not fewer, hydration issues in testing) and
  `next build && next start` for "live" (`csp-smoke.spec.js`, real
  firebaseConfig).
- `test:e2e` is wired into `package.json` and CI
  (`.github/workflows/test.yml`'s `e2e-tests` job, "emulator" project
  only — "live" needs real Firebase secrets not yet configured in CI).
