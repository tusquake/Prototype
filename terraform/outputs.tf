output "load_balancer_ip" {
  description = "Global static IP — set as DNS A record for finsop.cloudkaptan.com"
  value       = google_compute_global_address.lb_ip.address
}

output "cloud_run_url" {
  description = "Cloud Run service URL (accessible only via the Load Balancer)"
  value       = google_cloud_run_v2_service.backend.uri
}

output "cloud_sql_private_ip" {
  description = "Private IP of the Cloud SQL PostgreSQL instance"
  value       = google_sql_database_instance.postgres.private_ip_address
  sensitive   = true
}

output "frontend_bucket_url" {
  description = "GCS bucket URL for frontend static assets"
  value       = "gs://${google_storage_bucket.frontend.name}"
}

output "artifact_registry_repo" {
  description = "Artifact Registry Docker repo URI"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.backend_repo.repository_id}"
}

output "backend_service_account_email" {
  description = "IAM service account email used by Cloud Run"
  value       = google_service_account.backend_sa.email
}

output "task_documents_bucket_url" {
  description = "GCS bucket URL for task working paper documents & attachments"
  value       = "gs://${google_storage_bucket.task_documents.name}"
}

