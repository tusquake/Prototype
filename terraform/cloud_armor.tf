resource "google_compute_security_policy" "waf" {
  name        = "fin-sop-waf-policy"
  description = "WAF security policy for FinSOP Portal"

  rule {
    action      = "allow"
    priority    = 2147483647
    description = "Default allow rule"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
  }

  rule {
    action      = "rate_based_ban"
    priority    = 1000
    description = "Rate-based ban: 100 req/min per IP, 5min ban, HTTP 429"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }

    rate_limit_options {
      rate_limit_threshold {
        count        = 100
        interval_sec = 60
      }
      ban_duration_sec = 300
      conform_action   = "allow"
      exceed_action    = "deny(429)"
      enforce_on_key   = "IP"
    }
  }
}
