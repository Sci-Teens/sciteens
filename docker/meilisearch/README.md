# Meilisearch (self-hosted, Cloud Run)

Self-hosted Meilisearch for the SciTeens `projects` search index, replacing
the Algolia Firebase Extension. Runs as a Cloud Run v2 service reachable on
its public `run.app` URL — access control is Meilisearch's own
`MEILI_MASTER_KEY` / scoped-key auth, not Cloud Run IAM (see
`infra/meilisearch/README.md`'s "Access control" section for why those two
auth layers can't be stacked). No Serverless VPC Access connector or Direct
VPC egress, so there's no fixed idle VPC cost. Data survives restarts via
periodic snapshots pushed to a GCS bucket and restored on boot,
authenticated purely with the Cloud Run instance's attached service account
(metadata-server OAuth token) — no service account key files, no gcloud SDK
in the image.

Persistence is request-driven: a small Go reverse proxy (`proxy/`) owns the
public port, forwards all traffic to Meilisearch on loopback, and serves
`POST /__snapshot_now__`, which synchronously creates a snapshot, waits for
the task, and uploads it to `gs://$MEILI_SNAPSHOT_BUCKET/latest.snapshot`
before responding. Cloud Scheduler (`infra/meilisearch`) calls that endpoint
every 15 minutes with an OIDC token for the runtime service account (the
master key also works, for manual ops). Doing all snapshot work inside an
in-flight request is what lets the service run scale-to-zero under
request-based billing — a background loop gets CPU-starved between requests
and its uploads fail (verified in production with the old
`snapshot-sync.sh` design, since removed). Boot restores
`latest.snapshot` from GCS if present.

## Build

```sh
docker build -t meilisearch -f docker/meilisearch/Dockerfile docker/meilisearch
```

## Push (example — adjust registry/project)

```sh
docker tag meilisearch us-east1-docker.pkg.dev/<PROJECT_ID>/<REPO>/meilisearch:v1.48.2
docker push us-east1-docker.pkg.dev/<PROJECT_ID>/<REPO>/meilisearch:v1.48.2
```

## Runtime environment variables

| Variable                | Required | Default                 | Notes                                                                                                                                                           |
| ----------------------- | -------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MEILI_MASTER_KEY`      | yes      | —                       | Meilisearch's own auth key; also accepted as a bearer token on `/__snapshot_now__` for manual snapshot runs.                                                    |
| `MEILI_SNAPSHOT_BUCKET` | no       | _(unset)_               | GCS bucket name, **no** `gs://` prefix. When unset/empty, restore-on-boot is skipped and `/__snapshot_now__` returns 503 — useful for local runs.               |
| `SCHEDULER_SA_EMAIL`    | no       | _(unset)_               | Email the proxy requires on the Cloud Scheduler OIDC token for `/__snapshot_now__`. When unset, only master-key auth works on that endpoint.                    |
| `PORT`                  | no       | `7700`                  | Public port the proxy binds. Cloud Run injects this automatically.                                                                                              |
| `MEILI_PORT`            | no       | `7701`                  | Loopback port Meilisearch itself binds (`--http-addr 127.0.0.1:$MEILI_PORT`); the proxy forwards everything except `/__snapshot_now__` here.                    |
| `MEILI_SNAP_DIR`        | no       | `/meili_data/snapshots` | Directory the proxy scans for the newest `.snapshot` file to upload. entrypoint.sh sets it to match Meilisearch's `--snapshot-dir`; no need to set it yourself. |

On Cloud Run, grant the service's runtime service account `roles/storage.objectAdmin`
(or a narrower custom role covering get/insert on the one snapshot object)
on `MEILI_SNAPSHOT_BUCKET` — the metadata-server token entrypoint.sh and
the proxy fetch is scoped to that service account automatically, no
extra wiring needed in the image. The metadata endpoint used is
`http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token`
— note **`service-accounts`, plural**; the singular form 404s and silently
disables both restore-on-boot and backup-on-schedule (this shipped broken
once already — verified against the real metadata server, not assumed).

## Local run (no GCS, bind-mounted data dir)

```sh
mkdir -p /tmp/meili_data
docker run --rm -p 7700:7700 \
  -e MEILI_MASTER_KEY=dev-only-master-key \
  -e MEILI_SNAPSHOT_BUCKET= \
  -v /tmp/meili_data:/meili_data \
  meilisearch
```

Leaving `MEILI_SNAPSHOT_BUCKET` empty makes `entrypoint.sh` skip the
snapshot restore-on-boot step, so the container works standalone with only
local disk persistence via the bind mount — nothing ever calls out to GCS.
