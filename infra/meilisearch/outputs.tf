output "meilisearch_url" {
  description = "The default run.app HTTPS URL of the Meilisearch Cloud Run service. Network-reachable to any caller (no Cloud Run IAM invoker gate); every request must still carry a valid MEILI_MASTER_KEY or scoped search key to pass Meilisearch's own auth."
  value       = google_cloud_run_v2_service.meilisearch.uri
}

output "meilisearch_service_account_email" {
  description = "Email of the dedicated runtime service account used by the Meilisearch Cloud Run service."
  value       = google_service_account.meilisearch.email
}

output "snapshot_bucket_name" {
  description = "Name of the GCS bucket holding the rolling Meilisearch snapshot (latest.snapshot)."
  value       = google_storage_bucket.meili_snapshots.name
}
