# Meilisearch on Cloud Run

Terraform module that provisions a self-hosted [Meilisearch](https://www.meilisearch.com/)
instance on Cloud Run to replace the Algolia Firebase Extension for searching
the `projects` Firestore collection (courses/programs are out of scope for
now). Modeled on
[blog.simonireilly.com/posts/serverless-search](https://blog.simonireilly.com/posts/serverless-search/),
with one change: instead of baking a dump into the Docker image at build
time (fine for a static blog), this module wires Meilisearch to a live
GCS-bucket-backed snapshot, since `projects` documents change continuously
via user activity.

This module only provisions infrastructure. It does not create the GCP
project, does not build/push the container image, and does not touch the
existing `website` Cloud Run service, Firebase Functions, or app code —
those are owned elsewhere in the repo (`cloud-build.yaml`, `functions/`,
`pages/`) and wire into the outputs below.

## Prerequisites

An existing GCP project with billing enabled. Enable the required APIs:

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

**1. Set the secret values.** Terraform creates the Secret Manager secret
containers (`meilisearch-master-key`, `meilisearch-search-key`) empty by
default, so secret material never lands in Terraform state. Populate them
once, out-of-band:

```sh
# Generate a master key, e.g.: openssl rand -base64 48
echo -n "$MEILI_MASTER_KEY" | gcloud secrets versions add meilisearch-master-key --data-file=- --project "$PROJECT_ID"
echo -n "$MEILI_SEARCH_KEY" | gcloud secrets versions add meilisearch-search-key --data-file=- --project "$PROJECT_ID"
```

`echo -n` matters — a trailing newline in the secret value silently becomes
part of the key and nothing will ever authenticate correctly against it.
Prefer `printf '%s' "$KEY" | gcloud secrets versions add ...` if there's any
doubt about your shell's `echo` behavior.

(If you instead pass `-var meili_master_key=...` / `-var meili_search_key=...`
to `terraform apply`, Terraform will create the first secret version for you
— accept the tradeoff that the value then lives in Terraform state.)

The first time you set `meilisearch-master-key`, force a new Cloud Run
revision so the container picks up the secret-backed env var — Terraform's
own apply won't do this automatically if only the secret _version_ changed
underneath an otherwise-unchanged service spec:

```sh
gcloud run services update meilisearch --region "$REGION" --project "$PROJECT_ID" \
  --update-labels=redeploy="$(date +%s)"
```

**2. Bootstrap the index.** Once the master key is set and the service is
running, populate the Meilisearch `projects` index from Firestore using
`scripts/setup-meilisearch.js` (owned separately in this repo). That script
is also the intended place to mint a scoped, search-only API key (Meilisearch
`POST /keys` with `actions: ["search"]`, `indexes: ["projects"]`) for
client-side/read-only callers, separate from the all-powerful master key.

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

Treat `MEILI_MASTER_KEY` with the same care as any other production secret:
it is the _only_ thing standing between the public internet and write access
to the `projects` index. Prefer distributing the scoped search-only key (not
the master key) to any client-side/browser code.

## Cost rationale

This design skips a Serverless VPC Access connector and Direct VPC egress
entirely (~$10–22/mo saved in fixed idle cost for a connector that would
otherwise sit provisioned 24/7), relying instead on Meilisearch's own
application-layer key auth on a publicly-routable Cloud Run URL — an
explicit, documented tradeoff of network-layer isolation for cost, judged
acceptable here because Meilisearch never accepts unauthenticated requests
regardless of network reachability.

`scaling.min_instance_count = 1` keeps a single warm instance running at
all times — **not** scale-to-zero, despite that looking like the obvious
next cost lever. Scale-to-zero was the original design and it was tried:
in production, an idle period let Cloud Run reap the `min_instance_count =
0` instance before its first `--schedule-snapshot` interval had even
elapsed, so the next cold start restored from no snapshot at all and
silently wiped the entire index. The GCS snapshot/restore path is disaster
recovery (redeploys, host failures), not a substitute for keeping the one
and only writer instance alive — Meilisearch is a single-node embedded-DB
engine with no replication, so "restart and hope the last snapshot was
recent enough" is not an acceptable steady-state behavior.

`resources.cpu_idle = false` (always-allocated CPU, instance-based billing)
was also tried the other way first — `cpu_idle = true` (request-based
billing, CPU throttled between requests) is markedly cheaper, but broke
persistence a second time: `docker/meilisearch/snapshot-sync.sh` runs as a
background loop with no incoming HTTP request to justify CPU allocation
under request-based billing, and Cloud Run starved it badly enough that
the GCS upload call failed outright on every cycle (verified in
production: `curl` never even completed the request). Background
disaster-recovery uploads only run reliably with CPU always allocated, so
`cpu_idle = false` stays explicit — the residual cost is a genuinely
continuous 1 vCPU / 512Mi instance (still no VPC connector, and
`max_instance_count = 1`, load-bearing not a tunable — a second concurrent
instance would split-brain the index against the shared snapshot bucket,
keeps request volume well inside Cloud Run's free tier of 2M requests/mo
for a low-traffic projects-search feature).

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
  itself, `min_instance_count = 1` and `cpu_idle = false` (see Cost
  rationale — both load-bearing, not tunables), `max_instance_count = 1`.
- `google_cloud_run_v2_service_iam_member.public_invoker` — grants
  `roles/run.invoker` to `allUsers`; see
  [Access control](#access-control-network-reachable-application-layer-gated)
  above for why this is required (and safe).
