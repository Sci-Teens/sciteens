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

## Priority 3 — Component tests (vitest + React Testing Library)

- Signup/signin forms (`pages/signup/student.js`, `pages/signin/student.js`):
  submit stays disabled until all fields are valid; birthday under 13
  rejected with the expected zod error; submit stays disabled until
  `recaptchaSolved` even when the rest of the form is valid.
- `components/ProjectCard.js`: renders zero-member projects without a
  dangling "By" label (regression test — `member_arr?.length > 0`, not a
  truthy-empty-array check); field badge renders the correct label for
  both legacy-lowercase and Title-Case `fields` values.
- `components/ui/*` primitives are thin Base UI wrappers — not worth
  testing directly (see sweep notes); test them through the pages that
  use them instead (Sheet via NavBar, Field/Label via the forms above).

## Priority 4 — Playwright end-to-end (the few flows worth a real browser)

Keep this list short — E2E is expensive to write and maintain. Cover the
journeys that cross multiple systems (auth + Firestore + routing) where a
unit test can't catch the integration failure:

1. **Signup → redirect**: student signup happy path, then a second run
   hitting `/signup/student?ref=project|<id>` confirms the post-signup
   redirect lands on `/project/<id>` (exercises `resolveRefPath` end to
   end, not just the pure function).
2. **Project create → member invite → edit**: create a project, add a
   member by email, edit it, confirm field checkboxes reflect saved
   state (regression coverage for the legacy-lowercase-fields
   pre-check bug already fixed once in `project/[id]/edit.js`).
3. **`/projects?field=X` filtering**: for at least one seeded lowercase
   legacy project and one Title-Case project, confirm the filtered list
   is non-empty and shows the translated badge (this is the exact bug
   MIGRATION-PHASES.md's post-Phase-5 sweep found and fixed — a filter
   silently returning zero results is easy to miss without this test).
4. **Mobile nav Sheet a11y**: open the hamburger menu, Tab through links,
   confirm Escape closes it and focus returns to the trigger (regression
   coverage for the Phase 3 a11y rewrite — Base UI should handle this,
   but it's cheap to pin down with a real browser rather than trust it).
5. **i18n smoke**: load `/`, `/projects`, `/articles` in all four locales
   (`en`/`es`/`fr`/`hi`) and assert zero `next-i18next` missing-key
   console warnings and zero page errors.
6. **CSP smoke**: load `/signup/student`, confirm zero
   `Content-Security-Policy` violation reports in the console and that
   the reCAPTCHA iframe actually mounts (regression coverage for the
   CSP-blocked-recaptcha bug already found and fixed once).

## Setup notes

- **vitest**: `environment: 'jsdom'` for component tests, default `node`
  environment for the pure-function/API-route/rules tests (faster, no DOM
  needed). Reuse the `@/*` alias from `jsconfig.json` in `vitest.config.js`
  so test imports match app imports.
- **Firebase emulator**: `firebase emulators:start --only firestore` in
  CI, `@firebase/rules-unit-testing`'s `initializeTestEnvironment` for the
  P0 rules suite. Do not point rules tests at the real project.
- **Playwright**: `webServer` config pointing at `pnpm build && pnpm start`
  (or `pnpm dev` for local iteration) so tests exercise the same SSR/SSG
  paths users hit. Needs a real (or emulator-backed) `firebaseConfig.js`/
  `.env.local` — do not commit test credentials; wire from CI secrets the
  same way `firebaseConfig.js` already works locally.
- Wire both into `package.json` (`test`, `test:e2e`) and CI once the P0/P1
  suites exist; don't block the first PR on covering everything above —
  land P0 (rules) + P1 (pure functions) first, they're the cheapest and
  catch the sharpest bugs.
