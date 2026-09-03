# ============================================================
# Phase 2 — IAM Service Account & Artifact Registry
# Matches gcloud commands:
#   gcloud iam service-accounts create finance-sop-portal-sa ...
#   gcloud secrets add-iam-policy-binding fin-sop-db-password ...
#   gcloud artifacts repositories create fin-sop-repo ...
# ============================================================

# Dedicated IAM Service Account for the Cloud Run backend
resource "google_service_account" "backend_sa" {
  account_id   = "finance-sop-portal-sa"
  display_name = "FinSOP Backend Service Account"
  project      = var.project_id
}

# Grant Secret Manager secretAccessor role to the service account
resource "google_secret_manager_secret_iam_member" "sa_secret_access" {
  secret_id = google_secret_manager_secret.db_password.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.backend_sa.email}"
}

# Grant Cloud SQL Client role for Cloud Run -> Cloud SQL connectivity
resource "google_project_iam_member" "sa_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.backend_sa.email}"
}

# Grant Artifact Registry Reader role so Cloud Run can pull images
resource "google_project_iam_member" "sa_artifact_reader" {
  project = var.project_id
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.backend_sa.email}"
}

# Artifact Registry Docker repository for container images
resource "google_artifact_registry_repository" "backend_repo" {
  repository_id = "fin-sop-repo"
  format        = "DOCKER"
  location      = var.region
  description   = "FinSOP Backend Docker Image Repository"

  depends_on = [google_project_service.apis]
}
