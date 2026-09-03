# ============================================================
# Phase 5 — Custom Domain & Managed HTTPS Setup
# Matches gcloud commands:
#   gcloud compute ssl-certificates create fin-sop-ssl-cert --domains=$DOMAIN_NAME
#   gcloud compute target-https-proxies create fin-sop-https-proxy ...
#   gcloud compute forwarding-rules create fin-sop-https-forwarding-rule --ports=443
# ============================================================

# Google-managed SSL Certificate for the custom domain
# Matches: gcloud compute ssl-certificates create fin-sop-ssl-cert --domains=$DOMAIN_NAME --global
resource "google_compute_managed_ssl_certificate" "ssl_cert" {
  name = "fin-sop-ssl-cert"

  managed {
    domains = [var.domain_name]
  }
}

# Target HTTPS Proxy — attaches SSL cert to the URL map
# Matches: gcloud compute target-https-proxies create fin-sop-https-proxy ...
resource "google_compute_target_https_proxy" "https_proxy" {
  name             = "fin-sop-https-proxy"
  url_map          = google_compute_url_map.load_balancer.id
  ssl_certificates = [google_compute_managed_ssl_certificate.ssl_cert.id]
}

# HTTPS Forwarding Rule (Port 443)
# Matches: gcloud compute forwarding-rules create fin-sop-https-forwarding-rule --ports=443
resource "google_compute_global_forwarding_rule" "https" {
  name                  = "fin-sop-https-forwarding-rule"
  target                = google_compute_target_https_proxy.https_proxy.id
  port_range            = "443"
  ip_address            = google_compute_global_address.lb_ip.address
  load_balancing_scheme = "EXTERNAL_MANAGED"
}
