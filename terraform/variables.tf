variable "project_id" {
  description = "GCP Project ID for FinSOP Platform infrastructure"
  type        = string
  default     = "finsop-gcp-project"
}

variable "region" {
  description = "GCP Region for Cloud Tasks, Cloud Functions, and Cloud Scheduler deployment"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Deployment environment (prod, staging, dev)"
  type        = string
  default     = "prod"
}

variable "cloud_tasks_queue_name" {
  description = "Name of the Google Cloud Tasks Queue for scheduled task execution"
  type        = string
  default     = "finsop-scheduled-tasks-queue"
}

variable "db_host" {
  description = "Cloud SQL PostgreSQL database host IP or connection name"
  type        = string
  default     = "10.0.0.5"
}

variable "db_port" {
  description = "Cloud SQL PostgreSQL port"
  type        = number
  default     = 5432
}

variable "db_name" {
  description = "Cloud SQL PostgreSQL database name"
  type        = string
  default     = "finsop_db"
}

variable "db_user" {
  description = "Cloud SQL PostgreSQL username"
  type        = string
  default     = "finsop_user"
}

variable "db_password" {
  description = "Cloud SQL PostgreSQL password"
  type        = string
  sensitive   = true
  default     = "finsop_password"
}

variable "checkpoint_horizon_days" {
  description = "Maximum Cloud Tasks dispatch horizon in days (safety limit before checkpoint hop)"
  type        = number
  default     = 25
}
