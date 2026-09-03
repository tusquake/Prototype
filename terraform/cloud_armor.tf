# ============================================================
# Phase 4 — Cloud Armor WAF Security Policy
# Matches gcloud commands:
#   gcloud compute security-policies create fin-sop-waf-policy ...
#   gcloud compute security-policies rules create 1000 \
#     --action="rate-based-ban" \
#     --rate-limit-threshold-count=100 \
#     --rate-limit-threshold-interval-sec=60 \
#     --ban-duration-sec=300 \
#     --exceed-action="deny-429" \
#     --enforce-on-key="IP"
# ============================================================

resource "google_compute_security_policy" "waf" {
  name        = "fin-sop-waf-policy"
  description = "WAF security policy for FinSOP Portal"

  # Default rule: allow all traffic not matched by other rules
  rule {
    action   = "allow"
    priority = 2147483647
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Default allow rule"
  }

  # Rate-limiting ban rule (priority 1000)
  # If an IP exceeds 100 requests/60s → ban for 300s → return 429
  rule {
    action   = "rate_based_ban"
    priority = 1000
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"] # Matches --expression="true" (all IPs)
      }
    }
    description = "Rate-based ban: 100 req/min per IP, 5min ban, HTTP 429"

    rate_limit_options {
      rate_limit_threshold {
        count        = 100 # --rate-limit-threshold-count=100
        interval_sec = 60  # --rate-limit-threshold-interval-sec=60
      }
      ban_duration_sec = 300 # --ban-duration-sec=300
      conform_action   = "allow"
      exceed_action    = "deny(429)" # --exceed-action="deny-429"
      enforce_on_key   = "IP"        # --enforce-on-key="IP"
    }
  }
}
