# ============================================================
# Phase 1 — Secret Manager & Cloud SQL Database
# Matches gcloud commands:
#   printf "YOUR_DB_PASSWORD" | gcloud secrets create fin-sop-db-password --data-file=-
#   gcloud sql instances create fin-sop-postgres ...
#   gcloud sql databases create fin_sop_db ...
#   gcloud sql users create sop_app_user ...
# ============================================================

# Secret Manager secret — stores the DB password
resource "google_secret_manager_secret" "db_password" {
  secret_id = "fin-sop-db-password"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

# Store the actual secret value (db_password variable)
resource "google_secret_manager_secret_version" "db_password_version" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = var.db_password
}

# Private Cloud SQL PostgreSQL 15 instance
# --no-assign-ip enforced via ip_configuration.ipv4_enabled = false
resource "google_sql_database_instance" "postgres" {
  name             = "fin-sop-postgres"
  database_version = "POSTGRES_15"
  region           = var.region

  # Prevent accidental deletion in production
  deletion_protection = true

  settings {
    tier = "db-custom-1-4096" # 1 vCPU, 4GB RAM — matches --cpu=1 --memory=4GB

    ip_configuration {
      ipv4_enabled                                  = false # --no-assign-ip: no public IP
      private_network                               = google_compute_network.vpc.id
      enable_private_path_for_google_cloud_services = true
    }

    backup_configuration {
      enabled    = true
      start_time = "03:00" # 3 AM UTC daily backup
    }

    disk_autoresize = true
    disk_type       = "PD_SSD"
  }

  depends_on = [google_service_networking_connection.private_vpc_connection]
}

# Logical application database (fin_sop_db)
resource "google_sql_database" "app_db" {
  name     = var.db_name
  instance = google_sql_database_instance.postgres.name
}

# Application DB user (sop_app_user)
resource "google_sql_user" "app_user" {
  name     = var.db_user
  instance = google_sql_database_instance.postgres.name
  password = var.db_password
}
