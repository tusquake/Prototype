# ============================================================
# Phase 1 — Networking & Private Services Access
# Matches gcloud commands:
#   gcloud compute networks create fin-sop-vpc --subnet-mode=custom
#   gcloud compute networks subnets create fin-sop-subnet ...
#   gcloud compute addresses create fin-sop-db-ip-range ...
#   gcloud services vpc-peerings connect ...
# ============================================================

# Enable required GCP service APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "compute.googleapis.com",
    "servicenetworking.googleapis.com",
    "sqladmin.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "cloudarmor.googleapis.com",
  ])
  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

# Custom VPC Network (subnet-mode=custom)
resource "google_compute_network" "vpc" {
  name                    = "fin-sop-vpc"
  auto_create_subnetworks = false # Matches --subnet-mode=custom

  depends_on = [google_project_service.apis]
}

# Private Subnet (10.0.0.0/20, asia-south1)
resource "google_compute_subnetwork" "subnet" {
  name          = "fin-sop-subnet"
  network       = google_compute_network.vpc.id
  ip_cidr_range = "10.0.0.0/20"
  region        = var.region
}

# Private IP range allocation for Cloud SQL VPC Peering (prefix-length=24)
resource "google_compute_global_address" "db_ip_range" {
  name          = "fin-sop-db-ip-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 24
  description   = "For Cloud SQL"
  network       = google_compute_network.vpc.id
}

# Private Services Access VPC Peering (servicenetworking.googleapis.com)
resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.db_ip_range.name]

  depends_on = [google_project_service.apis]
}
