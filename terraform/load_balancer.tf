resource "google_compute_region_network_endpoint_group" "backend_neg" {
  name                  = "fin-sop-backend-neg"
  network_endpoint_type = "SERVERLESS"
  region                = var.region

  cloud_run {
    service = google_cloud_run_v2_service.backend.name
  }
}

resource "google_compute_backend_service" "backend" {
  name                  = "fin-sop-backend-service"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  protocol              = "HTTPS"
  security_policy       = google_compute_security_policy.waf.id

  backend {
    group = google_compute_region_network_endpoint_group.backend_neg.id
  }
}

resource "google_compute_backend_bucket" "frontend" {
  name        = "fin-sop-frontend-backend-bucket"
  bucket_name = google_storage_bucket.frontend.name
  enable_cdn  = true
}

resource "google_compute_url_map" "load_balancer" {
  name            = "fin-sop-load-balancer"
  default_service = google_compute_backend_bucket.frontend.id

  host_rule {
    hosts        = ["*"]
    path_matcher = "api-matcher"
  }

  path_matcher {
    name            = "api-matcher"
    default_service = google_compute_backend_bucket.frontend.id

    path_rule {
      paths   = ["/finsop/v1/*"]
      service = google_compute_backend_service.backend.id
    }
  }
}

resource "google_compute_global_address" "lb_ip" {
  name = "fin-sop-lb-ip"
}

resource "google_compute_target_http_proxy" "http_proxy" {
  name    = "fin-sop-http-proxy"
  url_map = google_compute_url_map.load_balancer.id
}

resource "google_compute_global_forwarding_rule" "http" {
  name                  = "fin-sop-http-forwarding-rule"
  target                = google_compute_target_http_proxy.http_proxy.id
  port_range            = "80"
  ip_address            = google_compute_global_address.lb_ip.address
  load_balancing_scheme = "EXTERNAL_MANAGED"
}
