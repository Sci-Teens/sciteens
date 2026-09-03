# Meilisearch on Cloud Run

Terraform module that provisions a self-hosted [Meilisearch](https://www.meilisearch.com/)
instance on Cloud Run. It replaces the Algolia Firebase Extension for project
search and adds search for student opportunities.

The design is based on
[blog.simonireilly.com/posts/serverless-search](https://blog.simonireilly.com/posts/serverless-search/).
This module uses a live GCS-backed snapshot because both indexes change after
the container image is built.

This module only provisions infrastructure. It does not create the GCP
project, does not build/push the container image, and does not touch the
existing `website` Cloud Run service, Firebase Functions, or app code —
those are owned elsewhere in the repo (`cloud-build.yaml`, `functions/`,
`pages/`) and wire into the outputs below.

## Prerequisites

Production uses `directed-relic-266701`. Set the project before you run the
commands in this guide:

```sh
export PROJECT_ID=directed-relic-266701
```

Enable the required APIs:

```sh
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  storage.googleapis.com \
  --project "$PROJECT_ID"
```

## Build and push the image

The Dockerfile lives at `docker/meilisearch/Dockerfile` (owned separately).
Build and push it to GCR before running `terraform apply`, since
`meilisearch_image` has no default:

```sh
docker build -t "gcr.io/$PROJECT_ID/meilisearch:latest" docker/meilisearch/
docker push "gcr.io/$PROJECT_ID/meilisearch:latest"
```

## Apply

```sh
cd infra/meilisearch
terraform init
terraform apply \
  -var "project_id=$PROJECT_ID" \
  -var "meilisearch_image=gcr.io/$PROJECT_ID/meilisearch:latest"
```

No remote backend is configured — state lives in a local `terraform.tfstate`
next to these files (gitignored, never committed). Before a second person
runs `terraform apply` against the same project, either share that state
file out-of-band or configure a remote backend (e.g. a GCS bucket via
[`backend "gcs"`](https://developer.hashicorp.com/terraform/language/backend/gcs))
— otherwise Terraform won't see the resources the first apply already
created and will try to recreate them.

See [Access control](#access-control-network-reachable-application-layer-gated)
below for how requests to the resulting `run.app` URL are authenticated.

## One-time manual steps (not managed by Terraform)

**1. Set both master-key secrets.** Terraform creates
`meilisearch-master-key` for the Meilisearch service. Firebase Functions use
the separate `MEILI_MASTER_KEY` secret.

Generate one value and add it to the Meilisearch secret:

```sh
# Generate a master key, for example: openssl rand -base64 48
printf '%s' "$MEILI_MASTER_KEY" | gcloud secrets versions add meilisearch-master-key --data-file=- --project "$PROJECT_ID"
```

Run `firebase functions:secrets:set MEILI_MASTER_KEY --project "$PROJECT_ID"`.
At the prompt, enter the same value. This command creates or rotates the
function secret in the selected project.

Do not add a newline to either value. A newline becomes part of the key and
causes authentication to fail.

Create new Meilisearch and function revisions after the secret updates:

```sh
gcloud run services update meilisearch --region "$REGION" --project "$PROJECT_ID" \
  --update-labels=redeploy="$(date +%s)"
firebase deploy --project "$PROJECT_ID" \
  --only functions:newProject,functions:updateProject,functions:deleteProject,functions:syncOpportunitySearch
```

The next step creates the search-only key. You can seed the lowercase master
secret through Terraform, but that option puts the value in Terraform state.

**2. Bootstrap the indexes.** After the service starts, run
`scripts/setup-meilisearch.js`. The script creates the `projects` and
`opportunities` indexes and applies their settings.

The script also prints a search-only key for both indexes. Copy the printed
value into a shell variable, then add it to the website secret:

```sh
MEILI_SEARCH_KEY='<value printed by setup-meilisearch.js>'
printf '%s' "$MEILI_SEARCH_KEY" | gcloud secrets versions add meilisearch-search-key --data-file=- --project "$PROJECT_ID"
gcloud run services update website --region "$REGION" --project "$PROJECT_ID" \
  --update-secrets=MEILI_SEARCH_KEY=meilisearch-search-key:latest
```

The Cloud Run update creates a website revision that uses the new secret
version. Do not give the master key or the search key to the browser.

**3. Backfill after an indexer change.** The Firestore triggers only index a
document when it changes. Run the reindex script after a mapper or settings
change:

```sh
node scripts/reindex-meilisearch.js --execute
# Or backfill one index.
node scripts/reindex-meilisearch.js --execute --index opportunities
```

## Relevance tuning

Index settings for both indexes live in
`scripts/lib/meilisearchIndexSettings.js`. Project query settings live in
`lib/search.js`. Opportunity query settings live in
`lib/opportunitySearch.js`.

Measure project relevance with `scripts/eval-meilisearch-relevance.js` and
the fixtures in `scripts/lib/relevanceBattery.js`:

```sh
docker run --rm -p 7701:7700 -e MEILI_MASTER_KEY=devkey \
  getmeili/meilisearch:v1.48.2
MEILI_HOST=http://127.0.0.1:7701 MEILI_MASTER_KEY=devkey \
  node scripts/eval-meilisearch-relevance.js --baseline
```

It writes only to a scratch `projects-relevance-eval` index, deletes it
afterwards, and refuses to run against a host that looks deployed. `--baseline`
adds a run under the pre-tuning settings so a change reads as a delta.

| Configuration     | P@5   | Recall | MRR   |
| ----------------- | ----- | ------ | ----- |
| Original settings | 0.350 | 0.346  | 0.536 |
| Current settings  | 0.871 | 0.857  | 1.000 |

What the individual pieces bought:

- **`member_names` searchable, ranked above `abstract`.** Author queries
  returned nothing at all before, because `member_arr` was stored but never
  searched. The position matters as much as the presence: `attributeRank`
  reads `searchableAttributes` in order, so with names below `abstract` a
  project that merely cites someone outranks the one they authored.
- **Stop words.** "how does sleep affect performance" returned four "How
  Does ..." titles and not the sleep project at all; function words were
  outvoting the content words.
- **Synonyms.** "CO2", "comp sci" and "AI" each returned zero or one hit.
  Student abstracts spell terms out; searchers type the abbreviation.
- **`upvote_count:desc` below `exactness`, above `wordPosition`.** Orders
  equally-relevant hits by community rating rather than by the near-arbitrary
  "matched nearer the start of the field" signal, without letting a popular
  near-match outrank a literal one.
- **`rankingScoreThreshold: 0.2`.** Trims the tail where a long query matched
  one incidental word, plus typo-tolerant near-misses ("neural" reaching
  "neutral pH"). No relevant hit lost.

Scalar averages hide ordering bugs, so the battery also asserts two rank-1
expectations against documents planted for them, and the script exits
non-zero if either fails:

- "Priya Raman" must return the project she authored, not the one citing her.
- "robot" must return the exact match, not the more upvoted "Robotics" title.

Rejected on the evidence, recorded so they are not retried:

- **`matchingStrategy: "frequency"`** regressed P@5 to 0.746. It keeps the
  rarest query term, so "water pollution" dropped "water" and returned a
  light-pollution project.
- **`rankingScoreThreshold` above 0.2** started costing recall (0.786 at 0.3,
  0.714 at 0.4).
- **`photovoltaic -> solar`**, the reverse of a synonym that is kept one-way.
  It matched nothing the literal token had not already found and pulled
  "solar wind" space-science projects into a query about panels.

The corpus is synthetic and small, so treat the absolute numbers as a
regression baseline rather than a forecast for production. Re-run the battery
before changing any of this.

## Access control: network-reachable, application-layer-gated

This module grants `roles/run.invoker` to `allUsers` on the Cloud Run
service — not because invocation is meant to be public, but because Cloud
Run enforces its own IAM invoker check unconditionally (`ingress =
INGRESS_TRAFFIC_ALL` only controls network path, it does not bypass IAM);
without that grant, Cloud Run's edge rejects every request with `403`
before Meilisearch's own container ever sees it — including requests from
our own `website` service or Cloud Functions. Cloud Run's IAM auth and
Meilisearch's own app-level auth both consume the same
`Authorization: Bearer <token>` HTTP header (an ID token for Cloud Run IAM
vs. an API key for Meilisearch), so the two auth layers cannot be stacked
on the same request — gating invocation at the Cloud Run edge as well
would only ever collide with, never strengthen, Meilisearch's own auth,
which supports least-privilege scoped keys (search-only vs. read/write)
that Cloud Run service-level IAM cannot express.

The practical result: the service's `run.app` URL is network-reachable and
will respond to any caller, but every request still has to clear
Meilisearch's own auth — a valid `MEILI_MASTER_KEY` (full read/write) or a
scoped search-only key minted post-deploy — or it gets a `401` from the
application itself, not a `403` from Cloud Run's edge.

Treat `MEILI_MASTER_KEY` as a production secret. It permits writes to both
indexes. Only setup scripts, reindex scripts, and Cloud Functions can receive
it.

The website API routes use the scoped `MEILI_SEARCH_KEY`. The browser receives
search results, but it never receives either key.

## Cost rationale

This design skips a Serverless VPC Access connector and Direct VPC egress
entirely (~$10–22/mo saved in fixed idle cost for a connector that would
otherwise sit provisioned 24/7), relying instead on Meilisearch's own
application-layer key auth on a publicly-routable Cloud Run URL — an
explicit, documented tradeoff of network-layer isolation for cost, judged
acceptable here because Meilisearch never accepts unauthenticated requests
regardless of network reachability.

The service runs **scale-to-zero under request-based billing**
(`min_instance_count = 0`, `cpu_idle = true`). The steady-state cost is near
zero for the current search traffic. This combination was not always safe,
and the git history warns against a naive change:

- `min_instance_count = 0` with an in-container background snapshot loop
  silently wiped the index: Cloud Run reaped the idle instance before the
  first `--schedule-snapshot` interval elapsed, and the next cold start
  restored nothing.
- `cpu_idle = true` with that same background loop broke uploads: Cloud
  Run only allocates CPU while a request is in flight, and the loop's GCS
  upload was starved badly enough to fail on every cycle.

The fix that makes scale-to-zero safe is that **no work happens outside a
request anymore**. A proxy inside the container
(`docker/meilisearch/proxy/`) fronts Meilisearch and serves
`POST /__snapshot_now__`, which creates a snapshot, waits for the task,
and uploads it to GCS synchronously. `google_cloud_scheduler_job`
`meili_snapshot` calls that endpoint every 15 minutes with an OIDC token.
The proxy validates the configured audience and the runtime service-account
email. The master key works for manual runs. Cold starts restore
`gs://.../latest.snapshot` in entrypoint.sh. The residual data-loss window
is one scheduler interval of index writes. Firestore triggers in
`functions/search.js` resync a document the next time that document changes.

`max_instance_count = 1` remains load-bearing, not a tunable — Meilisearch
is a single-node embedded-DB engine and a second concurrent instance would
split-brain the index against the shared snapshot bucket.

If network-layer isolation later becomes a compliance requirement, the
fix is additive and does not require reintroducing the connector-cost
tradeoff: modern Cloud Run v2 supports [Direct VPC
egress](https://cloud.google.com/run/docs/configuring/vpc-direct-vpc) without
a Serverless VPC Access connector — set `network_interfaces` (VPC network +
subnetwork) directly on the `google_cloud_run_v2_service` template's
`vpc_access` block with `network_interfaces` and `egress = "ALL_TRAFFIC"` (or
`PRIVATE_RANGES_ONLY`), then flip `ingress` to `INGRESS_TRAFFIC_INTERNAL_ONLY`
or `INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER` to fully remove the public
`run.app` URL from the picture, layering network isolation on top of
Meilisearch's existing key auth as defense in depth.

## Outputs

| Output                              | Description                                                               |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `meilisearch_url`                   | The `run.app` HTTPS URL of the Meilisearch service.                       |
| `meilisearch_service_account_email` | Runtime SA email — reference when adding storage/secret grants elsewhere. |
| `snapshot_bucket_name`              | GCS bucket name holding `latest.snapshot`.                                |

## Resources created

- `google_storage_bucket.meili_snapshots` — snapshot storage, 30-day
  orphan-object cleanup, uniform bucket-level access, public access
  prevention enforced.
- `google_secret_manager_secret.meili_master_key` /
  `.meili_search_key` — empty secret containers (see manual steps above).
- `google_service_account.meilisearch` — least-privilege runtime identity
  for the Cloud Run service (bucket-scoped `storage.objectAdmin`,
  master-key-scoped `secretmanager.secretAccessor`).
- `google_cloud_run_v2_service.meilisearch` — the Meilisearch service
  itself, `min_instance_count = 0` and `cpu_idle = true` (see Cost
  rationale — safe only because snapshots are request-driven),
  `max_instance_count = 1` (load-bearing).
- `google_cloud_run_v2_service_iam_member.public_invoker` — grants
  `roles/run.invoker` to `allUsers`; see
  [Access control](#access-control-network-reachable-application-layer-gated)
  above for why this is required (and safe).
- `google_cloud_scheduler_job.meili_snapshot` — fires
  `POST /__snapshot_now__` every 15 minutes with a runtime-SA OIDC token;
  lives in `var.scheduler_region` (must match the project's App Engine
  location), targets the service's public URL cross-region.
- `google_service_account_iam_member.scheduler_token_creator` — lets Cloud
  Scheduler's service agent sign OIDC tokens as the runtime SA.
