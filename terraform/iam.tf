resource "google_service_account" "backend_sa" {
  account_id   = "finance-sop-portal-sa"
  display_name = "FinSOP Backend Service Account"
  project      = var.project_id
}

resource "google_secret_manager_secret_iam_member" "sa_secret_access" {
  secret_id = google_secret_manager_secret.db_password.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.backend_sa.email}"
}

resource "google_project_iam_member" "sa_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.backend_sa.email}"
}

resource "google_project_iam_member" "sa_artifact_reader" {
  project = var.project_id
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.backend_sa.email}"
}

resource "google_artifact_registry_repository" "backend_repo" {
  repository_id = "fin-sop-repo"
  format        = "DOCKER"
  location      = var.region
  description   = "FinSOP Backend Docker Image Repository"

  depends_on = [google_project_service.apis]
}
