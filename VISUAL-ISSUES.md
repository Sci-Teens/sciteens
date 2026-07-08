# Visual / UI-UX Audit

Methodology: ran `pnpm dev`, walked every top-level route plus the auth
flows at desktop (1440×900) and mobile (390×844) in a headless, **foregrounded**
browser tab, with full real-scroll passes on scroll-reveal pages (a
backgrounded/unfocused tab throttles `requestAnimationFrame`, which produced
false "stuck at opacity/scale 0" positives during initial passes — those are
called out and excluded below). Every issue listed was confirmed in DOM/CSS,
console, or a reproducible dev error overlay — not inferred from code alone.

Severity: **P0** = visibly broken, crashes, or actively damages brand/trust.
**P1** = inconsistent/dated, worth fixing in this pass. **P2** = noted, lower
value or larger lift than this pass warrants.

All issues below are marked **[FIXED]** or **[NOT FIXED — see note]**.

---

## Global (every page)

### P0-1. Announcement banner clashes with the brand and dumps a raw URL — **[FIXED]**

`components/Banner.js` rendered Prismic `banner.data.message` inside a hard
`from-indigo-500 via-purple-500 to-pink-500` gradient bar — the only
purple/pink surface anywhere on a site whose entire identity is SciTeens
green (`#00c853`), and it's the first thing on every page. On mobile it
wrapped to 3 lines (~130px, more vertical space than the nav bar itself).
The link inside had no visible affordance beyond bold weight.
**Fix:** solid `bg-sciteensGreen-regular` (matches footer/CTA green),
links inside the rich text get `underline` via a `[&_a]:underline` rule,
close button got a proper hit target + hover state, padding switched from
a fixed height to content-driven `py-2.5` so it scales cleanly on mobile.

### P0-2. Navbar logomark is stretched/cropped — **[FIXED]**

`components/NavBar.js` rendered `sciteens_logo_initials.svg` (intrinsic
`182×161`) with `next/image fill` inside a 48×48 **square** and no
`object-fit`, so the default `object-fit: fill` squashed the mark on
every page. **Fix:** container now sized `h-11 aspect-[182/161]` (matches
the source aspect ratio) with `object-contain`; verified via screenshot
zoom that the "s" swirl + "t" glyph render undistorted.

### P0-3. `/project/[id]` pages render with no navbar and no footer, and reliably crash with a hydration error — **[FIXED]**

Found while spot-checking a project detail page after the abstract-HTML
fix (P0-6 below). Two independent bugs stacked on this one route:

- `pages/project/[id]/index.js`'s `getServerSideProps` never called
  `serverSideTranslations`, so `next-i18next` never initializes for this
  route. `NavBar`/`Footer` both gate their entire render on
  `i18n?.isInitialized`, so **both were permanently empty** (`0`-height,
  `0` children) on every single project page — a user viewing any project
  saw no site navigation and no footer at all, just the bare content
  floating in a green void. **Fix:** added `locale` to the
  `getServerSideProps` signature and spread
  `...(await serverSideTranslations(locale, ['common']))` into the props,
  matching every other dynamic route in the app (`profile/[slug]/*`,
  `project/[id]/edit.js`).
- Separately, `<Discussion>` was gated with
  `{typeof window !== 'undefined' && <Discussion .../>}` — a classic
  Next.js hydration-mismatch anti-pattern: `typeof window` is always
  `false` during SSR (nothing rendered server-side) but immediately `true`
  on the client's first paint (renders `<Discussion>` where the server
  rendered nothing), guaranteeing "Hydration failed because the initial UI
  does not match what was rendered on the server" — reproduced on 100% of
  fresh loads (3/3), full dev error overlay, `<Project><div><Discussion>
  <div>` flagged as the mismatch point. **Fix:** converted `Discussion` to
  `next/dynamic(..., { ssr: false })`, the exact pattern already used for
  `NavBar`/`Footer` in `Layout.js`, and dropped the redundant `typeof
  window` guard. Verified 0/3 hydration errors on fresh tabs after the fix
  (was 3/3 before).
- Also found and removed while in this file: a dangling `{router.isReady
&& router.basePath}` line in `components/Discussion.js` that rendered
  the raw router basePath as visible page text for no purpose (dead debug
  code, also a plausible secondary contributor to the same hydration
  class of bug).

### P1-4. Two competing "card" languages — **[FIXED]**

The shadcn `Card` primitive (`components/ui/card.jsx`) is `rounded-xl
border shadow-sm bg-card`, and it was used **only** by `ProjectCard.js`.
Every other card-like surface hand-rolled a slightly different box
(`rounded-lg`/`rounded-sm`, no border, inconsistent shadow weight):
`about.js` member cards, `getinvolved.js`/`educators.js` panels, home
page testimonial + featured-media cards, the `/signup` chooser tile.
**Fix:** unified all of the above to the same token set —
`rounded-xl border border-border/60 bg-card shadow-sm` (or `shadow-md`
where already present) — so every white surface across the site now
reads as one consistent design language. (`articles.js`/`courses.js`
list rows were checked and already used this exact token set —
`bg-card`/`ring-border/60`/`rounded-xl`/`shadow-sm` — no change needed
there.)

### P1-5. Off-brand blue links/buttons — **[FIXED]**

`donate.js`, `getinvolved.js` "Donate Now" buttons used `bg-blue-500`,
and 3 `getinvolved.js` mailto links used `text-blue-700` — a generic
Bootstrap-blue instead of the SciTeens green used for every other
primary action and body link. **Fix:** swapped to
`bg-sciteensLightGreen-regular`/`hover:bg-sciteensLightGreen-dark`
(buttons) and `text-sciteensGreen-regular hover:text-sciteensGreen-dark
font-semibold` (links), matching the established patterns elsewhere in
the same files.

### P1-6. Scroll-reveal thresholds too strict, 3 trigger elements zero-width — **[FIXED]**

`pages/index.js` used `IntersectionObserver({ threshold: 1 })` — content
only faded in once the _entire_ trigger element was on screen; 3 of 4
trigger `div`s (`#mission`, `#testimonials`, `#media`) had no explicit
width (0×20px box), relying on implementation-defined zero-area
intersection behavior. `pages/about.js` used `threshold: 0.85` across 28
member cards. Both eventually revealed content on a real scroll, but
noticeably later/jerkier than every other reveal in the codebase (which
use 0/state-gated booleans). **Fix:** `threshold: 0.15` +
`rootMargin: '0px 0px -10% 0px'` on both files; gave the 3 zero-width
trigger `div`s an explicit `right-0` so they span full width instead of
relying on undefined zero-area behavior.

---

## Home (`/`)

### P2-7. `educators.js`/`getinvolved.js` shared one spring across 3 cards — **[FIXED]**

Both pages built one `useSpring()` result and applied the _same_ style
object to three separate `animated.div`s, instead of one instance per
element (the pattern used everywhere else in the codebase — verified via
a stashed before/after comparison that this was not actually causing a
visible bug in a real foreground tab, just an inconsistent pattern with
no stagger). **Fix:** converted both to `useTrail(3, …)`, matching
`partnersTrail`/`testimonialsTrail`/`missionTrail`, for consistency and a
matching staggered-entrance.

---

## About (`/about`)

### P2-8. "Current members" grid rendered unconditionally, with no heading — **[FIXED]**

The `current === true` grid wrapper always rendered even when it
filtered to zero members (true for all 28 seeded members today), and
unlike "Previous Members" it had no heading. **Fix:** wrapped in
`{currentMembers.length > 0 && (...)}` with its own `about.current_members`
i18n heading (added to all 4 locale files), so the section only appears,
labeled, once a current member exists. Also moved the previously
hardcoded `Previous Members` heading through `t('about.previous_members')`
for i18n compliance (`AGENTS.md` requires no hardcoded English
user-facing copy) and unified all member cards to the shadcn Card token
set (see P1-4).

---

## Sign up (`/signup`)

### P1-9. Chooser page read as unfinished — **[FIXED]**

Only the "Student" tile is ever rendered (Educator signup is correctly
invitation-gated and intentionally omitted — confirmed via
`/signup/educator`'s "not accepting new signups" state). The page still
used the old multi-option "card grid" pattern: one small `h-56 w-56
rounded-sm` tile floating alone inside an `h-screen` flex container, with
a huge amount of dead space around it on desktop. **Fix:** wrapped the
whole flow (heading, sign-in line, tile, get-involved line) in a centered
`max-w-md rounded-xl border border-border/60 bg-card shadow-sm` card
consistent with the site's other narrow-form pages; the tile itself
folded into the card as a green-bordered CTA element instead of a second
nested white-on-white box. `show_student_info` toggle, `ref` query
passthrough, and navigation all verified still working.

### P2-10. Native `<input type="date">` on the birthday field — **NOT FIXED**

`signup/student.js` mixes a browser-native date input into an otherwise
fully shadcn-styled form. Stylistically the odd one out; a full shadcn
date-picker replacement is a larger lift than this pass covers (new
dependency/primitive, calendar popover, keyboard nav) — flagged for a
follow-up, not attempted here to avoid a rushed, undertested primitive
swap on a real signup form.

---

## Projects (`/projects`, `/project/[id]`)

### P0-11. Raw HTML tags rendered as visible text — **[FIXED]**

`lib/projects.js` passed `project.about` straight through as `abstract`
with no sanitization, and both `ProjectCard.js` and
`project/[id]/index.js` rendered it as a plain string child. The
`abstract` field is a plain `<Textarea>` in the create/edit forms (not
rich text), but several live seeded projects have legacy HTML saved into
that field, so their cards/detail pages literally showed
`<h2>Abstract</h2><p></p><h3>Research Question</h3>...` as visible text.
**Fix:** added a `stripHtml` helper in `lib/projects.js`'s
`normalizeProject`, so both consumers get clean text automatically.
Deliberately did **not** switch to `dangerouslySetInnerHTML` — that would
render a user-authored plain-text field as HTML, a stored-XSS regression.

### P2-12. Missing-photo fallback reused the stretched logomark, cropped — **[FIXED]**

Cards fell back to `/assets/sciteens_initials.jpg` with `object-cover` in
a square box when a project has no photo (or Storage 412s — see "Not
fixed" below) — looked like a broken image. **Fix:** fallback image now
renders `object-contain` with padding and reduced opacity so it reads as
an intentional placeholder mark, not a broken/cropped photo; real photos
keep `object-cover` unchanged.

### P1-13. Dangling "By" label and underlined filter pills on project detail — **[FIXED]**

Found while re-verifying P0-3: `project.member_arr && (...)` guards a
falsy check, but an **empty array is truthy** in JS, so any project with
zero members still rendered the "By" label with an empty avatar row.
Separately, the field-tag pills (`physics`, `chemistry`, ...) are
`<Link>`s inside a `prose` typography-plugin wrapper, which applies a
default `underline` to all anchors — turning badge-styled pills into
plain underlined text links. **Fix:** guard changed to
`project.member_arr?.length > 0`; pills got `no-underline` (matching the
member-credit link, which already had it).

---

## Forms (signup/signin, all variants)

### P2-14. Disabled submit buttons are low contrast — **NOT FIXED**

shadcn `Button`'s disabled state renders "Create Account"/"Sign In" as a
washed-out mint on a white card. Not fixing broadly — disabled-affordance
opacity is a deliberate, consistent design decision across the whole
shadcn migration (every disabled button in the app looks this way);
changing it here alone would be a new, unreviewed inconsistency, not a
fix. Noting only.

### Discussion component (`components/Discussion.js`) — **partially fixed**

While verifying P0-3, found the top-level comment composer's "Cancel"
button used `opacity-50 hover:bg-opacity-100` — permanently 50% opacity
_by default_, only reaching full opacity on hover, making it look
perpetually disabled/broken. **Fixed:** switched to shadcn
`variant="outline"`. Did **not** touch the reply-composer's matching
Cancel button, the comment/reply bubble radii, or the connected
expand/collapse reply-panel styling (`rounded-t-lg`/`rounded-b-lg`
seams) — that's a deliberately-interlocking multi-state visual unit
(`replyingToId === comment.id` drives 4 different corner-radius/border
combinations to keep the composer visually "attached" to the comment
being replied to) that I could not visually verify end-to-end without a
real authenticated Firestore session with existing comments/replies.
Touching it blind risked a real regression on the one interactive,
stateful piece of UI in this codebase migration notes call out as
"local state, keep as-is." Flagged for a follow-up with real data.

---

## Not fixed in this pass (out of scope)

- **Intermittent hydration-mismatch dev overlay on `/articles`**
  (`useWindowVirtualizer` + SSR interaction), reproduced twice in ~6
  navigations, not reproduced on a further 4 clean attempts. Root cause
  not isolated (unlike P0-3, which had a 100%-reproducible, clearly
  attributable cause). This is a stability/correctness issue, not a
  styling one; flagging for a dedicated follow-up rather than guessing at
  a fix inside an aesthetic pass.
- **28 "Previous Members" cards with no pagination** on `/about` —
  content/product scope, not styling.
- **Legal pages (`/legal/*`)** — dense but functional (sticky table of
  contents already present); no redesign attempted, low traffic/low
  payoff versus the rest of this list.
- **Firebase Storage 412s / CORS errors** breaking real project/profile
  photos and file listings — documented pre-existing infra issue in
  `MIGRATION-PHASES.md` (Storage bucket service-account misconfiguration
  in the connected Firebase project), reproduced again in this pass as a
  CORS-blocked `firebasestorage.googleapis.com` XHR on
  `/project/[id]`. Not a code bug; no code change in this repo can work
  around it.
- **Native date input** (P2-10) and **disabled-button contrast** (P2-14)
  — see notes above.
