resource "google_storage_bucket" "frontend" {
  name                        = var.bucket_name
  location                    = var.region
  force_destroy               = false
  uniform_bucket_level_access = true

  website {
    main_page_suffix = "index.html"
    not_found_page   = "index.html"
  }

  cors {
    origin          = ["https://${var.domain_name}"]
    method          = ["GET", "HEAD"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
}

resource "google_storage_bucket_iam_member" "public_viewer" {
  bucket = google_storage_bucket.frontend.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# GCS Storage Bucket for Task Working Papers & Document Attachments
resource "google_storage_bucket" "task_documents" {
  name                        = var.task_documents_bucket_name
  location                    = var.region
  force_destroy               = false
  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  cors {
    origin          = ["https://${var.domain_name}", "http://localhost:5173", "http://localhost:3010"]
    method          = ["GET", "POST", "PUT", "DELETE", "HEAD"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  lifecycle_rule {
    action {
      type = "AbortIncompleteMultipartUpload"
    }
    condition {
      age = 7
    }
  }
}

