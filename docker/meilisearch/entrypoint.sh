#!/bin/sh
# Entrypoint for the SciTeens Meilisearch Cloud Run image.
#
# 1. Restores the latest snapshot from GCS (if MEILI_SNAPSHOT_BUCKET is set
#    and an object already exists there) so search survives scale-to-zero
#    cold starts.
# 2. Starts the snapshot proxy in the background: it owns the public port
#    ($PORT), reverse-proxies everything to Meilisearch on loopback, and
#    serves POST /__snapshot_now__ (snapshot + GCS upload, synchronously)
#    for Cloud Scheduler. Doing snapshot work inside a request is what lets
#    this service run under request-based billing with min instances = 0.
# 3. execs meilisearch itself, keeping it tini's direct child so shutdown
#    signals reach it normally.
set -eu

DATA_DIR=/meili_data
SNAP_DIR="$DATA_DIR/snapshots"
mkdir -p "$SNAP_DIR"

MEILI_SNAPSHOT_BUCKET="${MEILI_SNAPSHOT_BUCKET:-}"
MEILI_PORT="${MEILI_PORT:-7701}"
PORT="${PORT:-7700}"

METADATA_TOKEN_URL="http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token"

# Fetches an OAuth access token for the Cloud Run service's attached service
# account from the GCE/Cloud Run metadata server. No credentials file needed.
fetch_gcs_token() {
    curl -sf -H "Metadata-Flavor: Google" "$METADATA_TOKEN_URL" \
        | sed -n 's/.*"access_token" *: *"\([^"]*\)".*/\1/p'
}

IMPORT_FLAG=""

if [ -n "$MEILI_SNAPSHOT_BUCKET" ]; then
    echo "entrypoint: checking for an existing snapshot at gs://${MEILI_SNAPSHOT_BUCKET}/latest.snapshot"

    TOKEN="$(fetch_gcs_token)"
    if [ -n "$TOKEN" ]; then
        DL_URL="https://storage.googleapis.com/${MEILI_SNAPSHOT_BUCKET}/latest.snapshot"
        HTTP_STATUS="$(curl -s -o "$SNAP_DIR/latest.snapshot" -w '%{http_code}' \
            -H "Authorization: Bearer ${TOKEN}" \
            "$DL_URL" || echo "000")"

        if [ "$HTTP_STATUS" = "200" ] && [ -s "$SNAP_DIR/latest.snapshot" ]; then
            echo "entrypoint: restored snapshot from gs://${MEILI_SNAPSHOT_BUCKET}/latest.snapshot"
            IMPORT_FLAG="--import-snapshot $SNAP_DIR/latest.snapshot --ignore-missing-snapshot"
        else
            echo "entrypoint: notice: no snapshot found in bucket (http ${HTTP_STATUS}), starting with a fresh index"
            rm -f "$SNAP_DIR/latest.snapshot"
        fi
    else
        echo "entrypoint: notice: could not obtain a GCS auth token from the metadata server, starting with a fresh index"
    fi
else
    echo "entrypoint: notice: MEILI_SNAPSHOT_BUCKET not set, skipping snapshot restore (local/dev mode)"
fi

echo "entrypoint: starting snapshot proxy on :${PORT}"
MEILI_SNAP_DIR="$SNAP_DIR" /snapshot-proxy &

exec /bin/meilisearch \
    --http-addr "127.0.0.1:${MEILI_PORT}" \
    --db-path "$DATA_DIR/data.ms" \
    --snapshot-dir "$SNAP_DIR" \
    --env production \
    --no-analytics \
    $IMPORT_FLAG
