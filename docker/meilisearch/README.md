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

Requires `resources.cpu_idle = false` (always-allocated CPU) on the Cloud
Run service and `min_instance_count >= 1` — both load-bearing, not tunables
(see `infra/meilisearch/README.md`'s Cost rationale): request-based
billing starves the background `snapshot-sync.sh` loop of CPU badly enough
that its GCS upload fails outright, and `min_instance_count = 0` risks the
instance being reaped before the first `--schedule-snapshot` interval ever
elapses, silently wiping the index on the next cold start.

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

| Variable                          | Required | Default   | Notes                                                                                                                                                                                        |
| --------------------------------- | -------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MEILI_MASTER_KEY`                | yes      | —         | Meilisearch's own auth key; passed straight through to the `meilisearch` binary via its normal env var.                                                                                      |
| `MEILI_SNAPSHOT_BUCKET`           | no       | _(unset)_ | GCS bucket name, **no** `gs://` prefix. When unset/empty, snapshot restore-on-boot and background sync are both skipped entirely (no errors) — useful for local runs.                        |
| `MEILI_SNAPSHOT_INTERVAL_SECONDS` | no       | `900`     | How often Meilisearch writes a fresh snapshot (`--schedule-snapshot`) and how often `snapshot-sync.sh` checks for a new one to upload. `infra/meilisearch` sets this to `300` in production. |
| `PORT`                            | no       | `7700`    | Cloud Run injects this automatically; only set it manually for local runs if you want a non-default port.                                                                                    |

On Cloud Run, grant the service's runtime service account `roles/storage.objectAdmin`
(or a narrower custom role covering get/insert on the one snapshot object)
on `MEILI_SNAPSHOT_BUCKET` — the metadata-server token entrypoint.sh and
snapshot-sync.sh fetch is scoped to that service account automatically, no
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

Leaving `MEILI_SNAPSHOT_BUCKET` empty makes `entrypoint.sh` skip both the
snapshot restore-on-boot step and the background `snapshot-sync.sh` loop, so
the container works standalone with only local disk persistence via the
bind mount — nothing ever calls out to GCS.
