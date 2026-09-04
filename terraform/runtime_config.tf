# ============================================================
# GCP Runtime Configurator Infrastructure
# Stores dynamic runtime variables and feature flags for Canary deployments
# ============================================================

resource "google_runtimeconfig_config" "finsop_config" {
  name        = "finsop-config"
  description = "Dynamic runtime configuration for FinSOP portal (Rate limits, Canary feature flags)"
}

resource "google_runtimeconfig_variable" "rate_limit_standard" {
  parent = google_runtimeconfig_config.finsop_config.name
  name   = "RATE_LIMIT_STANDARD_CAPACITY"
  text   = "100"
}

resource "google_runtimeconfig_variable" "rate_limit_auth" {
  parent = google_runtimeconfig_config.finsop_config.name
  name   = "RATE_LIMIT_AUTH_CAPACITY"
  text   = "10"
}

resource "google_runtimeconfig_variable" "canary_feature_enabled" {
  parent = google_runtimeconfig_config.finsop_config.name
  name   = "CANARY_FEATURE_ENABLED"
  text   = "false"
}
