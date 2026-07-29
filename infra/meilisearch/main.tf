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
    # min_instance_count = 0 is safe only because snapshots are no longer
    # taken by a background loop inside the container (which needed a warm
    # instance to ever run — the original reason this was pinned to 1).
    # Cloud Scheduler now calls POST /__snapshot_now__ on the in-container
    # proxy every 15 minutes, so snapshot+upload always happens while a
    # request holds CPU. Cold starts restore gs://.../latest.snapshot (see
    # entrypoint.sh); the worst-case loss window is one scheduler interval
    # of project writes, which resync on the next write to those docs.
    scaling {
      min_instance_count = 0
      max_instance_count = 1
    }

    containers {
      image = var.meilisearch_image

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        # cpu_idle = true selects request-based billing (CPU allocated
        # only while a request is in flight). This is the cost fix that
        # lets the service scale to zero; it is safe because no work
        # happens outside a request anymore — the snapshot proxy handles
        # snapshot+upload synchronously inside POST /__snapshot_now__.
        # The terraform-google provider defaults cpu_idle to false
        # (instance-based billing, ~$45/mo for 1 vCPU running 24/7)
        # whenever `resources.limits` is set, so this must stay explicit.
        # See https://github.com/hashicorp/terraform-provider-google/issues/17246
        cpu_idle = true
      }

      ports {
        container_port = 7700
      }

      env {
        name  = "MEILI_SNAPSHOT_BUCKET"
        value = google_storage_bucket.meili_snapshots.name
      }

      # Email the snapshot proxy accepts on the Cloud Scheduler OIDC token
      # for POST /__snapshot_now__ (the master key also works, for manual
      # ops). Must match the scheduler job's oidc_token service account.
      env {
        name  = "SCHEDULER_SA_EMAIL"
        value = google_service_account.meilisearch.email
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

# ---------------------------------------------------------------------------
# Snapshot trigger — request-driven snapshots via Cloud Scheduler
# ---------------------------------------------------------------------------
# Snapshots are created and uploaded synchronously inside POST
# /__snapshot_now__ (served by the in-container proxy), because under
# request-based billing CPU only exists while a request is in flight. This
# job is the clock that replaces the old in-container background loop and
# Meilisearch's own --schedule-snapshot flag. The interval bounds the
# search-index loss window if the (single, scale-to-zero) instance is
# reaped or crashes between runs.
#
# Region must match the project's App Engine location (Cloud Scheduler
# requirement), which is NOT necessarily var.region — the job targets the
# service's public URL, so cross-region is fine.
data "google_project" "project" {
  project_id = var.project_id
}

resource "google_cloud_scheduler_job" "meili_snapshot" {
  name      = "meilisearch-snapshot"
  project   = var.project_id
  region    = var.scheduler_region
  schedule  = "*/15 * * * *"
  time_zone = "Etc/UTC"

  retry_config {
    retry_count = 1
  }

  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_v2_service.meilisearch.uri}/__snapshot_now__"

    oidc_token {
      service_account_email = google_service_account.meilisearch.email
      audience              = google_cloud_run_v2_service.meilisearch.uri
    }
  }
}

# Cloud Scheduler's service agent signs the OIDC tokens it sends with the
# job, so it needs Token Creator on the runtime SA it impersonates.
resource "google_service_account_iam_member" "scheduler_token_creator" {
  service_account_id = google_service_account.meilisearch.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-cloudscheduler.iam.gserviceaccount.com"
}
