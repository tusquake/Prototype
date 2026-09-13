# Terraform Infrastructure as Code (IaC) - GCP Cloud Scheduler & Cloud Tasks Architecture
# FinSOP Platform - Enterprise SOP Compliance Engine

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# 1. Enable Required GCP Service APIs
resource "google_project_service" "cloud_tasks_api" {
  project            = var.project_id
  service            = "cloudtasks.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloud_scheduler_api" {
  project            = var.project_id
  service            = "cloudscheduler.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloud_functions_api" {
  project            = var.project_id
  service            = "cloudfunctions.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloud_build_api" {
  project            = var.project_id
  service            = "cloudbuild.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "run_api" {
  project            = var.project_id
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

# 2. Service Accounts & IAM Roles
resource "google_service_account" "cloud_tasks_sa" {
  account_id   = "finsop-cloud-tasks-sa"
  display_name = "FinSOP Cloud Tasks Queue Executor Service Account"
}

resource "google_service_account" "worker_fn_sa" {
  account_id   = "finsop-worker-fn-sa"
  display_name = "FinSOP Task Worker Function Execution Service Account"
}

resource "google_service_account" "reconciler_sa" {
  account_id   = "finsop-reconciler-sa"
  display_name = "FinSOP 6-Hour Reconciler Function Service Account"
}

resource "google_project_iam_member" "worker_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.worker_fn_sa.email}"
}

resource "google_project_iam_member" "reconciler_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.reconciler_sa.email}"
}

resource "google_project_iam_member" "worker_tasks_enqueuer" {
  project = var.project_id
  role    = "roles/cloudtasks.enqueuer"
  member  = "serviceAccount:${google_service_account.worker_fn_sa.email}"
}

resource "google_project_iam_member" "reconciler_tasks_enqueuer" {
  project = var.project_id
  role    = "roles/cloudtasks.enqueuer"
  member  = "serviceAccount:${google_service_account.reconciler_sa.email}"
}

# 3. Google Cloud Tasks Queue
resource "google_cloud_tasks_queue" "task_queue" {
  name     = var.cloud_tasks_queue_name
  location = var.region

  rate_limits {
    max_dispatches_per_second = 100
    max_concurrent_dispatches = 50
  }

  retry_config {
    max_attempts       = 10
    min_backoff        = "1s"
    max_backoff        = "300s"
    max_doublings      = 5
    max_retry_duration = "3600s"
  }

  depends_on = [google_project_service.cloud_tasks_api]
}

# 4. Storage Bucket for Function Source Bundles
resource "google_storage_bucket" "function_source_bucket" {
  name                        = "${var.project_id}-fn-source-${var.environment}"
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = true
}

# Archive Worker Function Source
data "archive_file" "worker_source_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../gcp-functions/sop-task-worker-fn"
  output_path = "${path.module}/worker-source.zip"
}

resource "google_storage_bucket_object" "worker_zip_object" {
  name   = "worker-source-${data.archive_file.worker_source_zip.output_sha}.zip"
  bucket = google_storage_bucket.function_source_bucket.name
  source = data.archive_file.worker_source_zip.output_path
}

# Archive Reconciler Function Source
data "archive_file" "reconciler_source_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../gcp-functions/reconciler-fn"
  output_path = "${path.module}/reconciler-source.zip"
}

resource "google_storage_bucket_object" "reconciler_zip_object" {
  name   = "reconciler-source-${data.archive_file.reconciler_source_zip.output_sha}.zip"
  bucket = google_storage_bucket.function_source_bucket.name
  source = data.archive_file.reconciler_source_zip.output_path
}

# 5. Cloud Function v2: Task Worker Execution Function
resource "google_cloudfunctions2_function" "sop_task_worker_fn" {
  name        = "finsop-task-worker-fn"
  location    = var.region
  description = "Executes scheduled SOP task creation and enqueues next period execution hops"

  build_config {
    runtime     = "nodejs18"
    entry_point = "handleTaskExecution"
    source {
      storage_source {
        bucket = google_storage_bucket.function_source_bucket.name
        object = google_storage_bucket_object.worker_zip_object.name
      }
    }
  }

  service_config {
    max_instance_count = 20
    min_instance_count = 1
    available_memory   = "512Mi"
    timeout_seconds    = 60
    service_account_email = google_service_account.worker_fn_sa.email

    environment_variables = {
      DB_HOST     = var.db_host
      DB_PORT     = tostring(var.db_port)
      DB_NAME     = var.db_name
      DB_USER     = var.db_user
      DB_PASSWORD = var.db_password
      GCP_PROJECT = var.project_id
      GCP_REGION  = var.region
      QUEUE_NAME  = var.cloud_tasks_queue_name
    }
  }

  depends_on = [
    google_project_service.cloud_functions_api,
    google_project_service.run_api
  ]
}

# 6. Cloud Function v2: 6-Hour Sparse Reconciler Audit Function
resource "google_cloudfunctions2_function" "reconciler_fn" {
  name        = "finsop-reconciler-fn"
  location    = var.region
  description = "Scans for broken task event chains every 6 hours and auto-heals missing outbox entries"

  build_config {
    runtime     = "nodejs18"
    entry_point = "handleReconciliation"
    source {
      storage_source {
        bucket = google_storage_bucket.function_source_bucket.name
        object = google_storage_bucket_object.reconciler_zip_object.name
      }
    }
  }

  service_config {
    max_instance_count = 5
    min_instance_count = 0
    available_memory   = "256Mi"
    timeout_seconds    = 120
    service_account_email = google_service_account.reconciler_sa.email

    environment_variables = {
      DB_HOST     = var.db_host
      DB_PORT     = tostring(var.db_port)
      DB_NAME     = var.db_name
      DB_USER     = var.db_user
      DB_PASSWORD = var.db_password
    }
  }

  depends_on = [
    google_project_service.cloud_functions_api,
    google_project_service.run_api
  ]
}

# 7. Cloud Scheduler Job (Runs every 6 hours to trigger Reconciler Function)
resource "google_cloud_scheduler_job" "reconciler_scheduler" {
  name             = "finsop-sparse-reconciler-job"
  description      = "Triggers 6-hour sparse reconciler audit check for broken SOP version chains"
  schedule         = "0 */6 * * *"
  time_zone        = "UTC"
  attempt_deadline = "320s"

  http_target {
    http_method = "POST"
    uri         = google_cloudfunctions2_function.reconciler_fn.service_config[0].uri
    headers = {
      "Content-Type" = "application/json"
    }
    oidc_token {
      service_account_email = google_service_account.reconciler_sa.email
    }
  }

  depends_on = [
    google_project_service.cloud_scheduler_api,
    google_cloudfunctions2_function.reconciler_fn
  ]
}

# Allow Cloud Tasks to invoke Worker Function
resource "google_cloud_run_service_iam_member" "worker_invoker" {
  location = var.region
  service  = google_cloudfunctions2_function.sop_task_worker_fn.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.cloud_tasks_sa.email}"
}
