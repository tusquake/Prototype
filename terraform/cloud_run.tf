# ============================================================
# Phase 2 — Cloud Run Backend Service
# Matches gcloud command:
#   gcloud run deploy fin-sop-backend \
#     --image=... \
#     --network=fin-sop-vpc \
#     --subnet=fin-sop-subnet \
#     --vpc-egress=all-traffic \
#     --ingress=internal-and-cloud-load-balancing \
#     --no-allow-unauthenticated \
#     --set-env-vars=DB_HOST=10.0.0.5,... \
#     --set-secrets=DB_PASS=fin-sop-db-password:latest
# ============================================================

resource "google_cloud_run_v2_service" "backend" {
  name     = "fin-sop-backend"
  location = var.region

  # ingress=internal-and-cloud-load-balancing
  ingress = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  template {
    service_account = google_service_account.backend_sa.email

    # Direct VPC egress: routes all traffic through the VPC subnet
    # Matches --network, --subnet, --vpc-egress=all-traffic
    vpc_access {
      network_interfaces {
        network    = google_compute_network.vpc.name
        subnetwork = google_compute_subnetwork.subnet.name
      }
      egress = "ALL_TRAFFIC"
    }

    containers {
      image = var.backend_image

      # Environment variables — matches --set-env-vars
      env {
        name  = "DB_HOST"
        value = google_sql_database_instance.postgres.private_ip_address
      }
      env {
        name  = "DB_PORT"
        value = "5432"
      }
      env {
        name  = "DB_NAME"
        value = var.db_name
      }
      env {
        name  = "DB_USER"
        value = var.db_user
      }

      # Secret injection — matches --set-secrets=DB_PASS=fin-sop-db-password:latest
      env {
        name = "DB_PASS"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password.secret_id
            version = "latest"
          }
        }
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      ports {
        container_port = 8080
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }
  }

  depends_on = [
    google_service_account.backend_sa,
    google_secret_manager_secret_version.db_password_version,
    google_sql_database_instance.postgres,
    google_artifact_registry_repository.backend_repo,
  ]
}

# --no-allow-unauthenticated: do NOT add allUsers invoker on the service itself.
# Cloud Run is invoked by the Load Balancer via the explicit IAM binding below.
# Matches: gcloud run services add-iam-policy-binding fin-sop-backend
#            --member="allUsers" --role="roles/run.invoker"
resource "google_cloud_run_v2_service_iam_member" "lb_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
