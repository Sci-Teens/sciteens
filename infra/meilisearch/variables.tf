variable "project_id" {
  description = "Existing GCP project ID to deploy the Meilisearch Cloud Run service into. This module never creates a project."
  type        = string
}

variable "region" {
  description = "GCP region for the snapshot bucket and Cloud Run service. Must match the region used by the rest of the SciTeens infrastructure (see cloud-build.yaml)."
  type        = string
  default     = "us-east1"
}

variable "meilisearch_image" {
  description = "Fully-qualified container image reference for Meilisearch (e.g. gcr.io/PROJECT_ID/meilisearch:TAG), built from docker/meilisearch/Dockerfile and pushed by CI/an operator before running terraform apply. No default: apply fails until this is supplied."
  type        = string
}

variable "meili_master_key" {
  description = "Optional Meilisearch master key value to seed into Secret Manager on apply. Sensitive; NOT recommended for routine use since it lands in Terraform state. Leave null (default) and set the secret value out-of-band with `gcloud secrets versions add meilisearch-master-key --data-file=-` instead."
  type        = string
  sensitive   = true
  default     = null
}

variable "meili_search_key" {
  description = "Optional Meilisearch public search-only API key value to seed into Secret Manager on apply. Sensitive; NOT recommended for routine use since it lands in Terraform state. Leave null (default) and set the secret value out-of-band with `gcloud secrets versions add meilisearch-search-key --data-file=-` instead."
  type        = string
  sensitive   = true
  default     = null
}
