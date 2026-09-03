# Self-hosted Meilisearch for SciTeens `projects` search, running on Cloud Run v2.
#
# The official image already ships `tini` as PID 1 and the `meilisearch`
# binary at /bin/meilisearch, and already runs as root, so no extra base-OS
# user setup is required. We add `curl` (entrypoint talks to the GCS JSON
# API and the metadata server), our entrypoint script, and a small Go
# reverse proxy (proxy/) that fronts Meilisearch and exposes the
# request-driven snapshot endpoint Cloud Scheduler calls. Snapshots must be
# triggered by an in-flight HTTP request: under request-based billing Cloud
# Run starves background loops of CPU, so the old background
# snapshot-sync.sh design could not upload reliably.

FROM golang:1.24-alpine@sha256:8bee1901f1e530bfb4a7850aa7a479d17ae3a18beb6e09064ed54cfd245b7191 AS proxy-build
WORKDIR /src
COPY proxy/go.mod proxy/go.sum proxy/main.go ./
RUN go mod download && go mod tidy && CGO_ENABLED=0 go build -o /snapshot-proxy .

FROM getmeili/meilisearch:v1.48.2@sha256:544bdb7d1934e2dbeb02225b65f9b813221bc045d567c241a5be7319b50122b6

RUN apk add --no-cache curl

COPY --from=proxy-build /snapshot-proxy /snapshot-proxy
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh /snapshot-proxy

ENTRYPOINT ["/entrypoint.sh"]
