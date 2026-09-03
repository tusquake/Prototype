# ============================================================
# Phase 4 — Global Load Balancer with Cloud CDN
# Matches gcloud commands:
#   gcloud compute network-endpoint-groups create fin-sop-backend-neg ...
#   gcloud compute backend-services create fin-sop-backend-service ...
#   gcloud compute backend-services update ... --security-policy=fin-sop-waf-policy
#   gcloud compute backend-services add-backend fin-sop-backend-service ...
#   gcloud compute backend-buckets create fin-sop-frontend-backend-bucket --enable-cdn
#   gcloud compute url-maps create fin-sop-load-balancer ...
#   gcloud compute url-maps add-path-matcher ... --backend-service-path-rules="/finsop/v1/*=..."
#   gcloud compute addresses create fin-sop-lb-ip --global
#   gcloud compute target-http-proxies create fin-sop-http-proxy ...
#   gcloud compute forwarding-rules create fin-sop-http-forwarding-rule ... --ports=80
# ============================================================

# ---- 1. Serverless NEG pointing to Cloud Run ----
resource "google_compute_region_network_endpoint_group" "backend_neg" {
  name                  = "fin-sop-backend-neg"
  network_endpoint_type = "SERVERLESS"
  region                = var.region

  cloud_run {
    service = google_cloud_run_v2_service.backend.name
  }
}

# ---- 2. Global Backend Service for Cloud Run ----
resource "google_compute_backend_service" "backend" {
  name                  = "fin-sop-backend-service"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  protocol              = "HTTPS"
  security_policy       = google_compute_security_policy.waf.id # Attaches Cloud Armor WAF

  backend {
    group = google_compute_region_network_endpoint_group.backend_neg.id
  }
}

# ---- 3. Backend Bucket for Frontend with Cloud CDN ----
# Matches: gcloud compute backend-buckets create ... --enable-cdn
resource "google_compute_backend_bucket" "frontend" {
  name        = "fin-sop-frontend-backend-bucket"
  bucket_name = google_storage_bucket.frontend.name
  enable_cdn  = true # Cloud CDN enabled for global edge caching
}

# ---- 4. URL Map — Path-Based Routing ----
# /* → Cloud CDN + GCS (frontend)
# /finsop/v1/* → Cloud Run (backend API)
resource "google_compute_url_map" "load_balancer" {
  name            = "fin-sop-load-balancer"
  default_service = google_compute_backend_bucket.frontend.id

  host_rule {
    hosts        = ["*"]
    path_matcher = "api-matcher"
  }

  path_matcher {
    name            = "api-matcher"
    default_service = google_compute_backend_bucket.frontend.id # Default: frontend

    path_rule {
      paths   = ["/finsop/v1/*"] # API routes → Cloud Run backend
      service = google_compute_backend_service.backend.id
    }
  }
}

# ---- 5. Global Static IP Address ----
# Matches: gcloud compute addresses create fin-sop-lb-ip --global
resource "google_compute_global_address" "lb_ip" {
  name = "fin-sop-lb-ip"
}

# ---- 6. Target HTTP Proxy (Port 80) ----
resource "google_compute_target_http_proxy" "http_proxy" {
  name    = "fin-sop-http-proxy"
  url_map = google_compute_url_map.load_balancer.id
}

# ---- 7. HTTP Forwarding Rule (Port 80) ----
# Matches: gcloud compute forwarding-rules create fin-sop-http-forwarding-rule --ports=80
resource "google_compute_global_forwarding_rule" "http" {
  name                  = "fin-sop-http-forwarding-rule"
  target                = google_compute_target_http_proxy.http_proxy.id
  port_range            = "80"
  ip_address            = google_compute_global_address.lb_ip.address
  load_balancing_scheme = "EXTERNAL_MANAGED"
}
