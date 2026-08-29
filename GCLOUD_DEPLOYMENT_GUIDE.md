# RAVAND FinOps — Google Cloud Platform (GCP) Deployment Guide

This guide provides end-to-end instructions for deploying the RAVAND FinOps platform to Google Cloud Platform using serverless Cloud Run for the Spring Boot backend, Google Cloud Storage (GCS) static website hosting with Cloud CDN for the React SPA frontend, Cloud SQL PostgreSQL, GCP Secret Manager, Cloud Armor WAF, and Global Application Load Balancing.

---

## Production Target Architecture

```
                          USER / BROWSER
                                │
                                ▼
                   Cloud DNS (app.ravand.com)
                                │
                                ▼
       Global External Application Load Balancer (HTTPS / TLS 443)
                                │
                                ▼
           Cloud Armor WAF (OWASP SQLi, XSS, Rate Limiting)
                                │
       ┌────────────────────────┴────────────────────────┐
       │ (Path: /*)                                      │ (Path: /finsop/v1/*)
       ▼                                                 ▼
Google Cloud Storage (GCS) Bucket                Serverless NEG / Cloud Run Backend
(Static Web Hosting + Cloud CDN Edge)            (Spring Boot 3 REST API Engine)
       │                                                 │
       │ (React SPA Assets)                              │ (VPC Private Access)
       │                                                 ▼
       └───────────────────────────────────> Cloud SQL PostgreSQL 15 Instance
                                             (Private IP Only, High Availability, PITR)
```

---

## Prerequisites & Environment Setup

### Required Tools & Permissions
1. **Google Cloud SDK (`gcloud` CLI)**: Installed and authenticated (`gcloud auth login`).
2. **GCP Project**: Active project with Billing enabled.
3. **IAM Permissions**: `Editor` or `Owner` privileges on the target GCP project.

### Step 1: Initialize Project Configuration
Set environment variables for the deployment session:

```bash
export PROJECT_ID="ravand-finops-prod"
export REGION="us-central1"
export DB_PASS="SecureCloudSqlPassword2026!"
export BUCKET_NAME="app.ravand.com"

gcloud config set project $PROJECT_ID
```

### Step 2: Enable Required GCP APIs
Enable required API services:

```bash
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  storage-component.googleapis.com \
  compute.googleapis.com \
  vpcaccess.googleapis.com \
  servicenetworking.googleapis.com \
  cloudscheduler.googleapis.com \
  cloudbuild.googleapis.com
```

---

## Step 3: Configure Private Networking & Cloud SQL

### 1. Create Private Service Networking Connection
Restrict Cloud SQL database traffic to the internal GCP Virtual Private Cloud (VPC):

```bash
# Create Private IP Range
gcloud compute addresses create ravand-vpc-peering-range \
    --global \
    --purpose=VPC_PEERING \
    --prefix-length=16 \
    --description="Peering range for Cloud SQL Private IP" \
    --network=default

# Create Private Services Peering Connection
gcloud services peering connect \
    --service=servicenetworking.googleapis.com \
    --ranges=ravand-vpc-peering-range \
    --network=default
```

### 2. Provision Cloud SQL PostgreSQL Instance
Create a managed PostgreSQL 15 instance with high availability and point-in-time recovery:

```bash
gcloud sql instances create ravand-postgres-prod \
    --database-version=POSTGRES_15 \
    --tier=db-custom-2-7680 \
    --region=$REGION \
    --network=default \
    --no-assign-ip \
    --enable-point-in-time-recovery \
    --retained-backups-count=7 \
    --backup-start-time=02:00

# Set Root Database Password
gcloud sql users set-password postgres \
    --instance=ravand-postgres-prod \
    --password=$DB_PASS

# Create Application Database
gcloud sql databases create finsop_db \
    --instance=ravand-postgres-prod
```

---

## Step 4: Configure GCP Secret Manager

Store confidential database passwords securely in Secret Manager rather than environment files:

```bash
# Create Database Password Secret Vault
gcloud secrets create ravand-db-password-prod \
    --replication-policy="automatic"

# Add Secret Version
echo -n "$DB_PASS" | gcloud secrets versions add ravand-db-password-prod --data-file=-
```

---

## Step 5: Provision Serverless VPC Connector

Create a Serverless VPC Access connector allowing Cloud Run services to communicate with Cloud SQL on Private IP:

```bash
gcloud compute networks vpc-access connectors create ravand-vpc-connector \
    --region=$REGION \
    --range=10.8.0.0/28 \
    --network=default
```

---

## Step 6: Deploy Backend Microservice to Cloud Run

Deploy the Spring Boot backend container using Cloud Run source-based buildpacks:

```bash
# Get Cloud SQL Private IP Connection Name
export DB_CONNECTION_NAME=$(gcloud sql instances describe ravand-postgres-prod --format="value(connectionName)")
export PRIVATE_IP=$(gcloud sql instances describe ravand-postgres-prod --format="value(ipAddresses[0].ipAddress)")

# Deploy Backend Container
gcloud run deploy ravand-backend \
    --source ./backend \
    --region $REGION \
    --platform managed \
    --vpc-connector ravand-vpc-connector \
    --vpc-egress private-ranges-only \
    --allow-unauthenticated \
    --set-env-vars \
SPRING_PROFILES_ACTIVE=prod,\
SPRING_DATASOURCE_URL=jdbc:postgresql://$PRIVATE_IP:5432/finsop_db,\
SPRING_DATASOURCE_USERNAME=postgres,\
SPRING_JPA_HIBERNATE_DDL_AUTO=validate,\
SPRING_FLYWAY_ENABLED=true \
    --set-secrets SPRING_DATASOURCE_PASSWORD=ravand-db-password-prod:latest
```

Save the output backend URL (e.g. `https://ravand-backend-xyz-uc.a.run.app`).

---

## Step 7: Deploy React SPA Frontend to Google Cloud Storage (GCS) Bucket

Host the frontend static web assets in a Google Cloud Storage bucket configured for static web hosting and global Cloud CDN edge distribution.

### 1. Create Public GCS Bucket for Static Hosting
```bash
# Create GCS Bucket with Uniform Bucket-Level Access
gcloud storage buckets create gs://$BUCKET_NAME \
    --location=$REGION \
    --uniform-bucket-level-access

# Grant Public Read Permissions to allUsers
gcloud storage buckets add-iam-policy-binding gs://$BUCKET_NAME \
    --member=allUsers \
    --role=roles/storage.objectViewer

# Configure Bucket for Static Web Hosting (Index Page and Client-Side Routing Fallback)
gcloud storage buckets update gs://$BUCKET_NAME \
    --web-main-page-suffix=index.html \
    --web-error-page=index.html
```

### 2. Build and Upload Production SPA Bundle
```bash
# Navigate to frontend directory and build SPA bundle
cd frontend
npm install
npm run build

# Synchronize production build assets to GCS Bucket
gcloud storage rsync -r -d dist/ gs://$BUCKET_NAME/
cd ..
```

---

## Step 8: Configure Load Balancer URL Routing (GCS Bucket + Cloud Run Backend)

Create a Global HTTP(S) Load Balancer that routes frontend static assets (`/*`) to the GCS Bucket with Cloud CDN, and API requests (`/finsop/v1/*`) to the Cloud Run backend:

```bash
# 1. Create Backend Bucket for GCS with Cloud CDN Enabled
gcloud compute backend-buckets create ravand-frontend-backend-bucket \
    --gcs-bucket-name=$BUCKET_NAME \
    --enable-cdn

# 2. Create Serverless NEG for Cloud Run Backend
gcloud compute network-endpoint-groups create ravand-backend-neg \
    --region=$REGION \
    --network-endpoint-type=serverless \
    --cloud-run-service=ravand-backend

# 3. Create Backend Service for Cloud Run
gcloud compute backend-services create ravand-backend-service \
    --global

gcloud compute backend-services add-backend ravand-backend-service \
    --global \
    --network-endpoint-group=ravand-backend-neg \
    --network-endpoint-group-region=$REGION

# 4. Create URL Map Routing Requests
gcloud compute url-maps create ravand-global-url-map \
    --default-backend-bucket=ravand-frontend-backend-bucket

# Add Path Matcher for API Requests (/finsop/v1/* -> Cloud Run Backend Service)
gcloud compute url-maps add-path-matcher ravand-global-url-map \
    --path-matcher-name=api-matcher \
    --default-backend-bucket=ravand-frontend-backend-bucket \
    --backend-service-path-rules="/finsop/v1/*=ravand-backend-service"
```

---

## Step 9: Configure Edge Security & Web Application Firewall (WAF)

Create Cloud Armor security rules to protect application endpoints from OWASP Top 10 vulnerabilities and rate abuse:

```bash
# Create Security Policy
gcloud compute security-policies create ravand-waf-policy \
    --description="Cloud Armor WAF Policy for RAVAND FinOps"

# Rule 1: Prevent SQL Injection Attacks
gcloud compute security-policies rules create 1000 \
    --security-policy=ravand-waf-policy \
    --expression="evaluatePreconfiguredExpr('sqli-v33-stable')" \
    --action="deny(403)" \
    --description="Block SQL Injection"

# Rule 2: Prevent Cross-Site Scripting (XSS)
gcloud compute security-policies rules create 1001 \
    --security-policy=ravand-waf-policy \
    --expression="evaluatePreconfiguredExpr('xss-v33-stable')" \
    --action="deny(403)" \
    --description="Block XSS"

# Rule 3: Rate Limiting (Max 100 requests per minute per IP)
gcloud compute security-policies rules create 2000 \
    --security-policy=ravand-waf-policy \
    --action="rate-based-ban" \
    --rate-limit-threshold-count=100 \
    --rate-limit-threshold-interval-sec=60 \
    --ban-duration-sec=300 \
    --conform-action="allow" \
    --exceed-action="deny(429)" \
    --enforce-on-key="IP" \
    --description="Rate Limit 100 req/min"

# Attach WAF Security Policy to Backend Service
gcloud compute backend-services update ravand-backend-service \
    --global \
    --security-policy=ravand-waf-policy
```

---

## Step 10: Configure Automated Nightly Cron Scheduler

Create a GCP Cloud Scheduler job to invoke the backend's task scheduling engine nightly at midnight:

```bash
export BACKEND_URL=$(gcloud run services describe ravand-backend --region $REGION --format="value(status.url)")

gcloud scheduler jobs create http ravand-nightly-task-generator \
    --schedule="0 0 * * *" \
    --uri="$BACKEND_URL/finsop/v1/tasks/generate-scheduled" \
    --http-method=POST \
    --time-zone="UTC" \
    --description="Triggers automated compliance task cycle generation at midnight UTC"
```

---

## Step 11: Production Deployment Verification Checklist

Verify deployment health across all components:

| Component | Verification Command / Target | Expected Output |
| :--- | :--- | :--- |
| **Backend Health** | `curl $BACKEND_URL/finsop/v1/health` | `{"success":true,"data":{"status":"UP"}}` |
| **GCS Static Frontend** | `gcloud storage ls gs://$BUCKET_NAME/` | Index.html & assets listing |
| **Cloud SQL Status** | `gcloud sql instances describe ravand-postgres-prod --format="value(state)"` | `RUNNING` |
| **Cloud Run Backend** | `gcloud run services describe ravand-backend --region $REGION` | `Ready: True` |
| **WAF Status** | `gcloud compute security-policies describe ravand-waf-policy` | Active rules list |
| **Nightly Scheduler** | `gcloud scheduler jobs execute ravand-nightly-task-generator` | HTTP 200 OK |
