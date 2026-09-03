variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "finance-sop-portal"
}

variable "region" {
  description = "GCP Region for all regional resources"
  type        = string
  default     = "asia-south1"
}

variable "bucket_name" {
  description = "GCS bucket name for React frontend static assets"
  type        = string
  default     = "fin-sop-frontend-bucket"
}

variable "domain_name" {
  description = "Custom domain name for the HTTPS SSL certificate"
  type        = string
  default     = "finsop.cloudkaptan.com"
}

variable "db_password" {
  description = "PostgreSQL application user password (stored in Secret Manager)"
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "PostgreSQL logical database name"
  type        = string
  default     = "fin_sop_db"
}

variable "db_user" {
  description = "PostgreSQL application user name"
  type        = string
  default     = "sop_app_user"
}

variable "backend_image" {
  description = "Full Docker image URI for the Spring Boot backend (pushed to Artifact Registry)"
  type        = string
  default     = "asia-south1-docker.pkg.dev/finance-sop-portal/fin-sop-repo/fin-sop-backend"
}
