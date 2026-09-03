# ============================================================
# Phase 3 — Frontend GCS Bucket with Public Access
# Matches gcloud commands:
#   gcloud storage buckets create gs://fin-sop-frontend-bucket ...
#   gcloud storage buckets add-iam-policy-binding ... --member="allUsers" --role="roles/storage.objectViewer"
# ============================================================

# GCS Bucket for React SPA static assets
resource "google_storage_bucket" "frontend" {
  name                        = var.bucket_name
  location                    = var.region
  force_destroy               = false
  uniform_bucket_level_access = true

  website {
    main_page_suffix = "index.html"
    not_found_page   = "index.html" # SPA fallback for React Router
  }

  cors {
    origin          = ["https://${var.domain_name}"]
    method          = ["GET", "HEAD"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
}

# Public read IAM binding — allows Cloud CDN to serve objects
# Matches: gcloud storage buckets add-iam-policy-binding ... --member="allUsers" --role="roles/storage.objectViewer"
resource "google_storage_bucket_iam_member" "public_viewer" {
  bucket = google_storage_bucket.frontend.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}
