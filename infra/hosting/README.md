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

Proxying everything keeps one origin of truth for headers. Hosting still caches
the responses at the edge, because it honours the `Cache-Control` that Cloud Run
sends:

- `/content/media/*` is `public, max-age=31536000, immutable` (filenames are
  content hashed, so this is safe).
- `/_next/static/*` is immutable, set by Next.
- Prerendered pages carry Next's own `s-maxage`.

So the second request for an article image is served from an edge POP and never
reaches Cloud Run, which is the whole point.

## Deploying

`cloud-build.yaml` runs `firebase deploy --only hosting` after the Cloud Run
deploy, so the rewrite target always exists before Hosting starts pointing at
it.

The Cloud Build service account needs `roles/firebasehosting.admin` in addition
to the `roles/firebaserules.admin` the rules deploy already requires.

## This is inert until DNS moves

Adding the config does not put Hosting in front of anything. `sciteens.com`
currently resolves to Cloud Run through a domain mapping. Until the domain is
attached to Firebase Hosting instead, Hosting only answers on its own
`*.web.app` and `*.firebaseapp.com` addresses and production traffic keeps
going straight to Cloud Run.

To cut over:

1. Deploy this branch so the Hosting config and the rewrite exist.
2. Verify the Hosting URL serves the site:
   `curl -I https://<project-id>.web.app/articles`. Confirm a `200`, and
   confirm the CSP header is present (proving the response came through Cloud
   Run, not from Hosting's own static serving).
3. Check that a repeat request for an image is edge-cached: request
   `/content/media/<file>.webp` twice and look for `cache-control:
..., immutable` plus an `x-cache` or `age` header on the second response.
4. Add the custom domain in the Firebase Hosting console and follow its DNS
   instructions.
5. Remove the old Cloud Run domain mapping once DNS has propagated.

Keep the Cloud Run service `--allow-unauthenticated`. Hosting reaches it as an
anonymous caller.

## Verifying the config locally

`firebase emulators:start --only hosting` parses this block and reports the
rewrite. The emulator cannot proxy to a real Cloud Run service, so a request
returns an error rather than the app; the check is only that the config is
well formed.
