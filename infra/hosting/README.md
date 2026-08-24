# Firebase Hosting CDN

Firebase Hosting sits in front of the Cloud Run service as a global CDN. The
`hosting` block in `firebase.json` rewrites every path to the `website` service
in `us-east1`.

## Why this exists

Cloud Run runs in one region (`us-east1`) with `--min-instances 0` and
`--max-instances 10`. Before this, nothing was edge-cached. Two consequences:

- Every reader outside the eastern United States paid a full cross-region
  round trip for the HTML, the JS, and every image.
- Article and course media is served from `public/` by the Node process, on the
  same single vCPU and the same event loop that renders pages. A popular
  article could saturate image serving and degrade unrelated routes such as
  signup and projects.

Self-hosting the article media (previously on Prismic's imgix CDN) moved a
whole traffic class onto that service, which is what made the missing CDN worth
fixing.

Firebase Hosting's free tier includes 10 GB of storage and 10 GB per month of
CDN transfer, and this project already uses Firebase for Auth, Firestore,
Storage, and Functions. It is the cheapest option that does not add a vendor.

## Why it proxies everything instead of serving files itself

`public` points at an intentionally empty directory
(`infra/hosting/public/.gitkeep`), and a single `**` rewrite sends all traffic
to Cloud Run.

Hosting could serve the repository's `public/` directory directly from its CDN,
skipping Cloud Run entirely for images. It deliberately does not, because a
file served by Hosting never passes through `next.config.js#headers()`. That
function is where the CSP, HSTS, `X-Frame-Options`, `Permissions-Policy`, and
the immutable `Cache-Control` for `/content/media/*` are set. Splitting asset
delivery across two origins would mean maintaining two header allowlists that
must agree, which is exactly the kind of drift that turns into a silent
security regression.

Proxying everything keeps one origin of truth for headers, with one exception
below. Hosting still caches the responses at the edge, because it honours the
`Cache-Control` that Cloud Run sends:

- `/content/media/*` is `public, max-age=31536000, immutable` (filenames are
  content hashed, so this is safe).
- `/_next/static/*` is immutable, set by Next.
- Prerendered pages carry Next's own `s-maxage=31536000`, a full year, with no
  `stale-while-revalidate`. This one is not safe the way the two above are:
  the HTML references `/_next/static/<buildId>/...`, and `buildId` changes
  every build, so year-old HTML asks for chunks the current origin does not
  have.

  **Unverified, and it must be tested before anyone relies on it:** whether
  deploying a new Hosting release evicts already-cached _rewrite_ responses.
  Firebase documents automatic CDN invalidation on redeploy for static Hosting
  content, and separately documents that backend-served content is not cached
  unless `Cache-Control` opts in. It does not say that a release purges
  responses already cached under an origin `s-maxage`. Until that is measured,
  treat the eviction path as unknown rather than as a recovery plan. See
  "Rolling back" below.

So the second request for an article image is served from an edge POP and never
reaches Cloud Run, which is the whole point.

### The one exception: `/__/*`

Firebase reserves the `/__/*` namespace and resolves it before any rewrite, so
`**` cannot capture it. `/__/auth/handler`, `/__/auth/iframe.js` and
`/__/firebase/init.json` are served by Firebase, not by Cloud Run, and
therefore carry Google's headers rather than `next.config.js#headers()`. That is
accepted: they are Google's own auth endpoints, and `init.json` exposes only
the `NEXT_PUBLIC_*` values already compiled into the client bundle.

That precedence is also load-bearing in the good direction.
`context/helpers.js#providerSignIn` loads the popup resolver's iframe from
`<project>.firebaseapp.com/__/auth/iframe`, and that host is about to start
serving this app through the `**` rewrite. Google sign-in keeps working only
because the reserved namespace wins. The cutover checklist verifies it.

## Deploying

`cloud-build.yaml` runs `firebase deploy --only hosting` after the Cloud Run
deploy, so the rewrite target always exists before Hosting starts pointing at
it.

## Prerequisites the build does not create for you

The Cloud Build service account needs `roles/firebasehosting.admin` in addition
to the `roles/firebaserules.admin` the rules deploy already requires. Without
it the build deploys Cloud Run and then fails on the last step with
`Failed to get Firebase project <id>`, which reads like a missing project but
is a missing role. The rules step keeps working because
`roles/firebaserules.admin` already carries the project-read permission every
Firebase predefined role includes.

```bash
PROJECT=<project-id>
NUMBER=$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member="serviceAccount:${NUMBER}@cloudbuild.gserviceaccount.com" \
  --role=roles/firebasehosting.admin
```

Hosting also needs a site to exist on the project. `firebase deploy --only
hosting` does not create one. Confirm with
`firebase hosting:sites:list --project <project-id>`, and create the default
site in the Firebase console if the list is empty.

`roles/firebasehosting.admin` is more than the deploy needs. It also permits
creating and deleting sites and attaching custom domains, so anyone who can
trigger a build or edit `cloud-build.yaml` could repoint the production domain
once DNS moves. It is the documented grant because it is one command and works
today. To tighten it, create a custom role carrying only
`firebase.projects.get`, `firebasehosting.sites.get`,
`firebasehosting.sites.update`, `firebasehosting.versions.{create,get,update}`,
`firebasehosting.files.{create,list}` and
`firebasehosting.releases.{create,get,list}`, and grant that instead. Omit
every `firebasehosting.domains.*` and `sites.create`/`sites.delete`. If it is
short a permission the CLI names the missing one, so one build settles it.

## This is inert until DNS moves

Adding the config does not put Hosting in front of anything. `sciteens.com`
currently resolves to Cloud Run through a domain mapping. Until the domain is
attached to Firebase Hosting instead, Hosting only answers on its own
`*.web.app` and `*.firebaseapp.com` addresses and production traffic keeps
going straight to Cloud Run.

To cut over:

1. Deploy this branch so the Hosting config and the rewrite exist.
2. Diff the headers between origin and edge rather than spot-checking one. Any
   difference is Hosting rewriting an origin header, and must be understood
   before DNS moves:

   ```bash
   for H in strict-transport-security content-security-policy \
            x-frame-options permissions-policy referrer-policy cache-control; do
     echo "== $H"
     curl -sI https://<cloud-run-url>/articles      | grep -i "^$H:"
     curl -sI https://<project-id>.web.app/articles | grep -i "^$H:"
   done
   ```

   HSTS is the value most likely to be overwritten. The origin sends
   `max-age=63072000; includeSubDomains; preload`; a silent downgrade would
   disqualify the domain from the preload list. Repeat the diff for a
   `/_next/static/<buildId>/...` path, which is not locale prefixed, so whether
   the header rules reach it is worth confirming empirically. Whatever those
   responses carry is frozen at the edge by `immutable`.

3. Confirm the reserved namespace still beats the `**` rewrite, or Google
   sign-in breaks with `auth/internal-error`:
   `curl -sI https://<project-id>.firebaseapp.com/__/auth/iframe` must not
   return the Next 404 page and must not carry our CSP.
4. Measure the cache-eviction behaviour the rollback plan depends on, while
   nothing is at stake. Request `/articles` on the Hosting host until `age`
   climbs, note the `buildId` in the HTML, deploy a Hosting release, then
   request it again. If `age` resets and the `buildId` changes, a release does
   evict rewrite responses. If it does not, record that and cap the HTML
   `s-maxage` before cutover, because there is then no purge path.
5. Check that a repeat request for an image is edge-cached: request
   `/content/media/<file>.webp` twice and look for `cache-control:
..., immutable` plus an `x-cache` or `age` header on the second response.
6. Confirm the shared cache does not answer `/` from a stored copy that
   ignores the request language. This is the check that turns the reasoning
   behind `localeDetection: false` in `next-i18next.config.js` into a
   measurement, so run it even though detection is off:

   ```bash
   for AL in en es hi fr; do
     curl -sI -H "Accept-Language: $AL" https://<project-id>.web.app/ \
       | grep -iE '^(HTTP|location|cache-control|vary|age)'
   done
   ```

   Every language must get the same status. A `307` for one language and a
   `200` for another under one url means a header-varying response is being
   shared, and detection must stay off.

7. **Settle the production hostname before attaching the domain.** The
   repository disagrees with itself: `AGENTS.md` and the root `README.md` say
   `sciteens.com`, while `next-sitemap.js#siteUrl` and `lib/ogImage.js#SITE_URL`
   hardcode `https://sciteens.org`. Those two feed every `rel=canonical`, the
   sitemap and `robots.txt`. Attaching a custom domain that disagrees with them
   publishes a live site whose every page names a different origin as
   canonical, which is how a site deindexes itself. Pick one, make all four
   agree, and pass `NEXT_PUBLIC_SITE_URL` as a build arg in `cloud-build.yaml`
   if it has to vary per environment. Do not skip to step 8 with this open.
8. Add the custom domain in the Firebase Hosting console and follow its DNS
   instructions.
9. Remove the old Cloud Run domain mapping once DNS has propagated.

Keep the Cloud Run service `--allow-unauthenticated`. Hosting reaches it as an
anonymous caller.

## Rolling back

A Cloud Run rollback alone is not sufficient once Hosting is live, and this is
the sharpest edge in this design.

`gcloud run services update-traffic website --to-revision=<previous>` does not
touch Hosting. The edge can still be holding prerendered HTML from the newer
build, and that HTML references `/_next/static/<buildId>/...` paths the older
revision cannot serve, so pages render unhydrated with 404s on every chunk.

Until step 4 of the cutover has actually been measured, treat the recovery as
unproven. Run `npx firebase-tools deploy --only hosting --project <id>` after
any traffic change made outside a full build: it is idempotent, the release
content never varies, and it is the only lever available. If that measurement
shows a release does not evict rewrite responses, then cap the HTML `s-maxage`
in `next.config.js#headers()` so a bad state expires on its own, and scope the
rule so it does not also match `/_next/static/*` (Next already sets
`Cache-Control` there, and two values on one response is its own bug).

## Verifying the config locally

`firebase emulators:start --only hosting` parses this block and reports the
rewrite. The emulator cannot proxy to a real Cloud Run service, so a request
returns an error rather than the app; the check is only that the config is
well formed.
