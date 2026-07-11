\
# Self-hosted Meilisearch for SciTeens `projects` search, running on Cloud Run v2.
#
# The official image already ships `tini` as PID 1 and the `meilisearch`
# binary at /bin/meilisearch, and already runs as root, so no extra base-OS
# user setup is required. We only add `curl` (used to talk to the GCS JSON
# API and the Cloud Run/GCE metadata server for OAuth tokens) and our two
# entrypoint scripts. No gcloud SDK, no extra language runtime, no extra npm
# dependency footprint — everything is plain curl + busybox sh.
FROM getmeili/meilisearch:v1.48.2

RUN apk add --no-cache curl

COPY entrypoint.sh /entrypoint.sh
COPY snapshot-sync.sh /snapshot-sync.sh
RUN chmod +x /entrypoint.sh /snapshot-sync.sh

ENTRYPOINT ["/entrypoint.sh"]
