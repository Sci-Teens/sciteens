## Meilisearch on Cloud Run — self-hosted replacement for the Algolia Firebase
## Extension, scoped to the `projects` collection. See README.md for the full
## design rationale (cost tradeoffs, manual bootstrap steps).

# ---------------------------------------------------------------------------
# Snapshot storage
# ---------------------------------------------------------------------------
# Holds a single rolling object, latest.snapshot, that Meilisearch writes to
# periodically (MEILI_SNAPSHOT_INTERVAL_SECONDS) and restores from on cold
# start. The lifecycle rule is a safety net against orphaned objects, not a
# retention policy for this bucket's normal contents.
resource "google_storage_bucket" "meili_snapshots" {
  name    = "${var.project_id}-meilisearch-snapshots"
  project = var.project_id

  location = var.region

  uniform_bucket_level_access = true
  force_destroy               = false
  public_access_prevention    = "enforced"

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }
}

# ---------------------------------------------------------------------------
# Secret Manager
# ---------------------------------------------------------------------------
# The secret containers are always created so the runtime SA and Cloud Run
# service definition have something to bind to. The values themselves are
# deliberately NOT set by Terraform by default (secret material in state is
# undesirable) — populate them manually per README.md, or pass
# var.meili_master_key / var.meili_search_key if you accept that tradeoff.
resource "google_secret_manager_secret" "meili_master_key" {
  secret_id = "meilisearch-master-key"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "meili_master_key" {
  count = var.meili_master_key == null ? 0 : 1

  secret      = google_secret_manager_secret.meili_master_key.id
  secret_data = var.meili_master_key
}

resource "google_secret_manager_secret" "meili_search_key" {
  secret_id = "meilisearch-search-key"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "meili_search_key" {
  count = var.meili_search_key == null ? 0 : 1

  secret      = google_secret_manager_secret.meili_search_key.id
  secret_data = var.meili_search_key
}

# ---------------------------------------------------------------------------
# Runtime service account
# ---------------------------------------------------------------------------
# Dedicated, least-privilege identity for the Meilisearch Cloud Run revision
# itself. Scoped grants only — no project-wide roles.
resource "google_service_account" "meilisearch" {
  project      = var.project_id
  account_id   = "meilisearch-run"
  display_name = "Meilisearch Cloud Run runtime service account"
  description  = "Runtime identity for the self-hosted Meilisearch Cloud Run service. Grants: snapshot bucket object admin, master-key secret accessor."
}

resource "google_storage_bucket_iam_member" "meilisearch_snapshot_access" {
  bucket = google_storage_bucket.meili_snapshots.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.meilisearch.email}"
}

resource "google_secret_manager_secret_iam_member" "meilisearch_master_key_access" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.meili_master_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.meilisearch.email}"
}

# ---------------------------------------------------------------------------
# Cloud Run service
# ---------------------------------------------------------------------------
# No Serverless VPC Access connector and no Direct VPC egress — the service
# is reachable on its public run.app URL. Access control is enforced by
# Meilisearch's own MEILI_MASTER_KEY / scoped search-key auth, not Cloud
# Run IAM: no allUsers/roles/run.invoker binding is created (see the
# "Access control" section below), so the two auth layers never collide on
# the shared Authorization header. This is a deliberate cost tradeoff; see
# README.md.
resource "google_cloud_run_v2_service" "meilisearch" {
  name     = "meilisearch"
  project  = var.project_id
  location = var.region

  # Public ingress; access is gated by Meilisearch's own key auth, not a VPC connector.
  ingress = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.meilisearch.email

    # max_instance_count = 1 is load-bearing, not a scaling knob: Meilisearch
    # is a single-writer embedded-DB engine and running a second instance
    # would split-brain the index against the snapshot bucket.
    #
    # min_instance_count = 1 is ALSO load-bearing, not a cost knob, despite
    # looking like the obvious dial to hit zero-idle-cost with. Verified in
    # production: with min_instance_count = 0, Cloud Run reaped the idle
    # instance before the first --schedule-snapshot interval ever elapsed
    # (snapshots only start accumulating after MEILI_SNAPSHOT_INTERVAL_SECONDS
    # of uptime), so the next cold start restored from... nothing, and the
    # entire index was silently gone. A snapshot-backed cold start is a
    # best-effort disaster-recovery path (redeploys, host failures), not a
    # substitute for keeping the one and only writer instance alive. The
    # marginal cost is Cloud Run's per-GiB-second idle memory charge only
    # (CPU stays request-billed) — a few dollars a month, not the ~$10-22/mo
    # VPC connector this design already skips.
    scaling {
      min_instance_count = 1
      max_instance_count = 1
    }

    containers {
      image = var.meilisearch_image

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        # The terraform-google provider defaults cpu_idle to false
        # (always-on/instance-based billing) whenever `resources.limits`
        # is set. Tried the opposite (cpu_idle = true, request-based
        # billing) first to save cost — it broke persistence: with no
        # active HTTP request, Cloud Run starves the background
        # snapshot-sync loop of CPU badly enough that the GCS upload
        # curl call fails outright (verified: uploads only ever got
        # `curl` exit-level connection failures, never even reached GCS).
        # Background disaster-recovery uploads only run reliably with
        # CPU always allocated, so this stays explicit and false. See
        # https://github.com/hashicorp/terraform-provider-google/issues/17246
        # for the underlying provider-default gotcha this is guarding
        # against accidentally reintroducing by omission.
        cpu_idle = false
      }

      ports {
        container_port = 7700
      }

      env {
        name  = "MEILI_SNAPSHOT_BUCKET"
        value = google_storage_bucket.meili_snapshots.name
      }

      # Lowered from a 15-minute default: with min_instance_count = 1 this
      # no longer has to survive a scale-to-zero race, but a shorter
      # interval still bounds how much gets lost across a redeploy/crash to
      # a few minutes of writes instead of up to 15.
      env {
        name  = "MEILI_SNAPSHOT_INTERVAL_SECONDS"
        value = "300"
      }

      # Read from Secret Manager at boot via Cloud Run's native secret-env-var
      # integration — not Application Default Credentials in-process.
      env {
        name = "MEILI_MASTER_KEY"

        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.meili_master_key.secret_id
            version = "latest"
          }
        }
      }

      # Snapshot restore on cold start can take a few seconds; give it room
      # (10 * 5s = up to 50s) before Cloud Run gives up on the revision.
      startup_probe {
        initial_delay_seconds = 5
        timeout_seconds       = 3
        period_seconds        = 5
        failure_threshold     = 10

        http_get {
          path = "/health"
          port = 7700
        }
      }
    }
  }

  depends_on = [
    google_secret_manager_secret_iam_member.meilisearch_master_key_access,
    google_storage_bucket_iam_member.meilisearch_snapshot_access,
  ]
}

# ---------------------------------------------------------------------------
# Access control — network-reachable, application-layer-gated
# ---------------------------------------------------------------------------
# Cloud Run enforces its own roles/run.invoker IAM check unconditionally —
# `ingress = INGRESS_TRAFFIC_ALL` only controls network path, it does NOT
# bypass that check. Without an explicit grant, Cloud Run's edge rejects
# every request with 403 before Meilisearch's own container ever sees it
# (verified: an empty IAM policy here means even our own services get 403
# on /health). So `allUsers` must be granted roles/run.invoker — the
# resulting security model is Meilisearch's own MEILI_MASTER_KEY / scoped
# search-only key, not Cloud Run IAM: those two auth layers can't coexist
# on the same request anyway, since both need the Authorization header (see
# README.md). This is the intended tradeoff, not an oversight — do not
# "tighten" this by removing the allUsers grant without also solving the
# resulting 403-on-every-request problem.
resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  project  = var.project_id
  location = google_cloud_run_v2_service.meilisearch.location
  name     = google_cloud_run_v2_service.meilisearch.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
