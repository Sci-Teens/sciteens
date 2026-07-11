#!/bin/sh
# Background loop started by entrypoint.sh. Watches SNAP_DIR (where
# meilisearch's own `--schedule-snapshot` flag drops timestamped .snapshot
# files) and pushes the newest one up to gs://$BUCKET/latest.snapshot,
# which is the fixed key entrypoint.sh restores from on the next cold start.
#
# Usage: snapshot-sync.sh <SNAP_DIR> <BUCKET> <INTERVAL_SECONDS>
#
# Dependency-free POSIX sh (busybox ash on Alpine) — no bashisms.
set -eu

SNAP_DIR="$1"
BUCKET="$2"
INTERVAL_SECONDS="$3"

MARKER_FILE="$SNAP_DIR/.last_synced"
METADATA_TOKEN_URL="http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token"

fetch_gcs_token() {
    curl -sf -H "Metadata-Flavor: Google" "$METADATA_TOKEN_URL" \
        | sed -n 's/.*"access_token" *: *"\([^"]*\)".*/\1/p'
}

log() {
    echo "snapshot-sync: $*"
}

while true; do
    sleep "$INTERVAL_SECONDS"

    # Newest *.snapshot file by mtime. If the glob matches nothing, `ls`
    # writes its error to stderr (discarded) and prints nothing to stdout,
    # so LATEST ends up empty — handled below without aborting the loop.
    LATEST="$(ls -t "$SNAP_DIR"/*.snapshot 2>/dev/null | head -n 1)"

    if [ -z "$LATEST" ]; then
        log "no snapshot files found yet in $SNAP_DIR, skipping this cycle"
        continue
    fi

    if [ -f "$MARKER_FILE" ] && [ "$(cat "$MARKER_FILE")" = "$LATEST" ]; then
        continue
    fi

    TOKEN="$(fetch_gcs_token)"
    if [ -z "$TOKEN" ]; then
        log "could not obtain a GCS auth token from the metadata server, will retry next cycle"
        continue
    fi

    UPLOAD_URL="https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o?uploadType=media&name=latest.snapshot"
    HTTP_STATUS="$(curl -s -o /dev/null -w '%{http_code}' \
        -X POST \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/octet-stream" \
        --data-binary "@${LATEST}" \
        "$UPLOAD_URL")"
    CURL_EXIT=$?
    if [ "$CURL_EXIT" -ne 0 ]; then
        HTTP_STATUS="000 (curl exit ${CURL_EXIT})"
    fi

    if [ "$HTTP_STATUS" = "200" ]; then
        log "uploaded $LATEST to gs://${BUCKET}/latest.snapshot"
        printf '%s' "$LATEST" > "$MARKER_FILE"
    else
        log "upload failed (http ${HTTP_STATUS}) for $LATEST, will retry next cycle (non-fatal)"
    fi
done
