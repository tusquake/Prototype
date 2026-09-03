resource "google_compute_managed_ssl_certificate" "ssl_cert" {
  name = "fin-sop-ssl-cert"

  managed {
    domains = [var.domain_name]
  }
}

resource "google_compute_target_https_proxy" "https_proxy" {
  name             = "fin-sop-https-proxy"
  url_map          = google_compute_url_map.load_balancer.id
  ssl_certificates = [google_compute_managed_ssl_certificate.ssl_cert.id]
}

resource "google_compute_global_forwarding_rule" "https" {
  name                  = "fin-sop-https-forwarding-rule"
  target                = google_compute_target_https_proxy.https_proxy.id
  port_range            = "443"
  ip_address            = google_compute_global_address.lb_ip.address
  load_balancing_scheme = "EXTERNAL_MANAGED"
}
