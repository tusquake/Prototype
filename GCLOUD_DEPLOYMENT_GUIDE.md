# Google Cloud Platform (GCP) Enterprise Deployment Guide

This guide provides a complete, production-grade, end-to-end command set to provision and deploy the **FinSOP Platform** infrastructure from scratch using the Google Cloud SDK (`gcloud` CLI) in Google Cloud Shell.

The infrastructure features a zero-trust custom VPC, private-only Cloud SQL (PostgreSQL 16) with zero public IP exposure, Secret Manager integration, Serverless VPC Access Connector, Artifact Registry, Cloud Run backend, GCS static frontend with Cloud CDN, and Cloud Armor WAF security.

---

## 🏗️ Architecture Overview

```
                                USER / BROWSER
                                      │
                                      ▼
                         Cloud DNS (app.finsop.com)
                                      │
                                      ▼
             Global External Application Load Balancer (HTTPS / TLS 443)
                                      │
                                      ▼
                 Cloud Armor WAF (OWASP SQLi, XSS, Rate Limiting)
                                      │
        ┌─────────────────────────────┴─────────────────────────────┐
        │ (Path: /*)                                                │ (Path: /finsop/v1/*)
        ▼                                                           ▼
Google Cloud Storage (GCS) Bucket                   Serverless NEG / Cloud Run Backend
(Static Web Hosting + Cloud CDN Edge)               (Spring Boot 3 REST API Engine)
        │                                                           │
        │ (React SPA Assets)                                        │ (VPC Connector: 10.8.0.0/28)
        │                                                           ▼
        └────────────────────────────────────────> Cloud SQL PostgreSQL 16 Instance
                                                   (Private IP: 10.x.x.x, 1 vCPU / 3.75GB, SSD)
```

---

## Phase 1: Environment Setup & API Activation

Run these commands first in Google Cloud Shell to export infrastructure variables, configure project context, and enable all required GCP service APIs.

```bash
# 1. Export Regional & Infrastructure Variables
export PROJECT_ID="finance-sop-portal"
export REGION="asia-south1"
export VPC_NAME="fin-sop-vpc"
export SUBNET_NAME="fin-sop-subnet"
export DB_INSTANCE_NAME="fin-sop-postgres"
export DB_NAME="fin_sop_db"
export DB_USER="sop_app_user"

# 2. Set Project Context
gcloud config set project $PROJECT_ID

# 3. Enable Required GCP APIs
gcloud services enable compute.googleapis.com \
                       servicenetworking.googleapis.com \
                       sqladmin.googleapis.com \
                       secretmanager.googleapis.com \
                       vpcaccess.googleapis.com \
                       artifactregistry.googleapis.com \
                       run.googleapis.com \
                       storage-component.googleapis.com \
                       cloudscheduler.googleapis.com \
                       cloudbuild.googleapis.com \
                       --project=$PROJECT_ID
```

---

## Phase 2: Custom Network & Serverless Connectivity

Creates the isolated custom VPC network, subnets, private service peering IP range for Cloud SQL, Serverless VPC Access Connector for Cloud Run, and internal firewall rules.

```bash
# 1. Create Custom VPC (Zero-trust, no auto-subnets)
gcloud compute networks create $VPC_NAME \
    --subnet-mode=custom \
    --bgp-routing-mode=regional

# 2. Create Private Subnet in asia-south1
gcloud compute networks subnets create $SUBNET_NAME \
    --network=$VPC_NAME \
    --region=$REGION \
    --range=10.0.0.0/20 \
    --enable-private-ip-google-access

# 3. Reserve Internal IP Range for Cloud SQL Private Peering
gcloud compute addresses create google-managed-services-$VPC_NAME \
    --global \
    --purpose=VPC_PEERING \
    --prefix-length=16 \
    --description="PEERING-SERVICENETWORKING-RANGE" \
    --network=$VPC_NAME

# 4. Connect Private VPC Peering to Google Managed Services
gcloud compute networks peerings connect \
    --service=servicenetworking.googleapis.com \
    --ranges=google-managed-services-$VPC_NAME \
    --network=$VPC_NAME \
    --project=$PROJECT_ID

# 5. Create Serverless VPC Access Connector (For Cloud Run -> Cloud SQL)
gcloud compute networks vpc-access connectors create fin-sop-vpc-connector \
    --region=$REGION \
    --network=$VPC_NAME \
    --range=10.8.0.0/28 \
    --min-instances=2 \
    --max-instances=10 \
    --machine-type=e2-micro

# 6. Create Internal Firewall Rule
gcloud compute firewall-rules create allow-internal-fin-sop \
    --network=$VPC_NAME \
    --allow=tcp:8080,tcp:5432,icmp \
    --source-ranges=10.0.0.0/20,10.8.0.0/28 \
    --description="Allow internal traffic between Cloud Run VPC Connector and Cloud SQL"
```

---

## Phase 3: Provision Cloud SQL PostgreSQL 16

Provisions a High Availability Cloud SQL instance attached only to your private VPC with Secret Manager Integration for database password vaulting.

```bash
# 1. Generate Database Password and Store in Secret Manager
DB_PASSWORD=$(openssl rand -base64 24)

echo -n "$DB_PASSWORD" | gcloud secrets create fin-sop-db-password \
    --replication-policy="automatic" \
    --data-file=-

# 2. Provision Regional HA Cloud SQL PostgreSQL 16 Instance
gcloud sql instances create $DB_INSTANCE_NAME \
    --database-version=POSTGRES_16 \
    --edition=ENTERPRISE \
    --tier=db-custom-1-3840 \
    --region=$REGION \
    --availability-type=REGIONAL \
    --network=$VPC_NAME \
    --no-assign-ip \
    --storage-type=SSD \
    --storage-size=10GB \
    --storage-auto-increase \
    --backup-start-time=02:00 \
    --enable-point-in-time-recovery \
    --retained-backups-count=14 \
    --retained-transaction-log-days=7 \
    --deletion-protection \
    --database-flags=max_connections=100,log_checkpoints=on,log_connections=on,log_disconnections=on,statement_timeout=10000

# 3. Create Application Database
gcloud sql databases create $DB_NAME --instance=$DB_INSTANCE_NAME

# 4. Create Database Application User
gcloud sql users create $DB_USER --instance=$DB_INSTANCE_NAME --password=$DB_PASSWORD
```

---

## Phase 4: Artifact Registry Setup & Container Build

Creates the private Artifact Registry container repository and builds/pushes the Spring Boot backend container image.

```bash
# 1. Create Docker Repository in Artifact Registry
gcloud artifacts repositories create fin-sop-repo \
    --repository-format=docker \
    --location=$REGION \
    --description="Docker repository for FinSOP microservices"

# 2. Build Container Image using Cloud Build (from backend directory)
cd backend
gcloud builds submit --tag $REGION-docker.pkg.dev/$PROJECT_ID/fin-sop-repo/fin-sop-backend:latest .
cd ..
```

---

## Phase 5: Cloud Run Deployment (Spring Boot Backend)

Deploys the Spring Boot backend container to Cloud Run connected via the Serverless VPC Connector to the private Cloud SQL instance.

```bash
# 1. Retrieve Private IP of Cloud SQL Instance
export DB_PRIVATE_IP=$(gcloud sql instances describe $DB_INSTANCE_NAME --format="value(ipAddresses[0].ipAddress)")

# 2. Deploy Backend Container to Cloud Run
gcloud run deploy fin-sop-backend \
    --image=$REGION-docker.pkg.dev/$PROJECT_ID/fin-sop-repo/fin-sop-backend:latest \
    --region=$REGION \
    --platform=managed \
    --no-allow-unauthenticated \
    --ingress=internal-and-cloud-load-balancing \
    --vpc-connector=fin-sop-vpc-connector \
    --vpc-egress=all-traffic \
    --min-instances=0 \
    --max-instances=5 \
    --cpu=1 \
    --memory=1Gi \
    --set-env-vars="SPRING_PROFILES_ACTIVE=prod,SPRING_DATASOURCE_URL=jdbc:postgresql://$DB_PRIVATE_IP:5432/$DB_NAME,SPRING_DATASOURCE_USERNAME=$DB_USER" \
    --set-secrets="SPRING_DATASOURCE_PASSWORD=fin-sop-db-password:latest"
```

---

## Phase 6: Frontend Deployment (GCS Bucket + Cloud CDN)

Deploys the React SPA frontend to a Google Cloud Storage bucket with static website hosting.

```bash
export FRONTEND_BUCKET="app-fin-sop-portal"

# 1. Create GCS Bucket with Uniform Access
gcloud storage buckets create gs://$FRONTEND_BUCKET \
    --location=$REGION \
    --uniform-bucket-level-access

# 2. Grant Public Read Access
gcloud storage buckets add-iam-policy-binding gs://$FRONTEND_BUCKET \
    --member=allUsers \
    --role=roles/storage.objectViewer

# 3. Configure Website Main & Fallback Index Pages
gcloud storage buckets update gs://$FRONTEND_BUCKET \
    --web-main-page-suffix=index.html \
    --web-error-page=index.html

# 4. Build and Upload Frontend Assets
cd frontend
npm install
npm run build
gcloud storage rsync -r -d dist/ gs://$FRONTEND_BUCKET/
cd ..
```

---

## Phase 7: Global Load Balancer & URL Routing

Sets up a Global External Application Load Balancer routing SPA traffic (`/*`) to GCS with Cloud CDN and API calls (`/finsop/v1/*`) to Cloud Run.

```bash
# 1. Create Backend Bucket for GCS with Cloud CDN
gcloud compute backend-buckets create fin-sop-frontend-backend-bucket \
    --gcs-bucket-name=$FRONTEND_BUCKET \
    --enable-cdn

# 2. Create Serverless Network Endpoint Group (NEG) for Cloud Run
gcloud compute network-endpoint-groups create fin-sop-backend-neg \
    --region=$REGION \
    --network-endpoint-type=serverless \
    --cloud-run-service=fin-sop-backend

# 3. Create Global Backend Service for Cloud Run
gcloud compute backend-services create fin-sop-backend-service \
    --global

gcloud compute backend-services add-backend fin-sop-backend-service \
    --global \
    --network-endpoint-group=fin-sop-backend-neg \
    --network-endpoint-group-region=$REGION

# 4. Create URL Map Routing Rules
gcloud compute url-maps create fin-sop-global-url-map \
    --default-backend-bucket=fin-sop-frontend-backend-bucket

gcloud compute url-maps add-path-matcher fin-sop-global-url-map \
    --path-matcher-name=api-matcher \
    --default-backend-bucket=fin-sop-frontend-backend-bucket \
    --backend-service-path-rules="/finsop/v1/*=fin-sop-backend-service"
```

---

## Phase 8: Cloud Armor WAF Edge Security

Creates Cloud Armor security rules protecting application endpoints against OWASP vulnerabilities and rate abuse.

```bash
# 1. Create Security Policy
gcloud compute security-policies create fin-sop-waf-policy \
    --description="Cloud Armor WAF Policy for FinSOP Platform"

# 2. Rule 1000: Block SQL Injection (SQLi)
gcloud compute security-policies rules create 1000 \
    --security-policy=fin-sop-waf-policy \
    --expression="evaluatePreconfiguredExpr('sqli-v33-stable')" \
    --action="deny(403)" \
    --description="Block SQL Injection"

# 3. Rule 1001: Block Cross-Site Scripting (XSS)
gcloud compute security-policies rules create 1001 \
    --security-policy=fin-sop-waf-policy \
    --expression="evaluatePreconfiguredExpr('xss-v33-stable')" \
    --action="deny(403)" \
    --description="Block XSS"

# 4. Rule 2000: Rate Limiting (100 req/min per IP)
gcloud compute security-policies rules create 2000 \
    --security-policy=fin-sop-waf-policy \
    --action="rate-based-ban" \
    --rate-limit-threshold-count=100 \
    --rate-limit-threshold-interval-sec=60 \
    --ban-duration-sec=300 \
    --conform-action="allow" \
    --exceed-action="deny(429)" \
    --enforce-on-key="IP" \
    --description="Rate Limit 100 req/min"

# 5. Attach WAF Policy to Backend Service
gcloud compute backend-services update fin-sop-backend-service \
    --global \
    --security-policy=fin-sop-waf-policy
```

---

## Phase 9: Automated Nightly Task Scheduler

Creates a GCP Cloud Scheduler job to trigger automated compliance task cycle generation at midnight UTC.

```bash
export BACKEND_SERVICE_URL=$(gcloud run services describe fin-sop-backend --region=$REGION --format="value(status.url)")

gcloud scheduler jobs create http fin-sop-nightly-task-generator \
    --schedule="0 0 * * *" \
    --uri="$BACKEND_SERVICE_URL/finsop/v1/tasks/generate-scheduled" \
    --http-method=POST \
    --time-zone="UTC" \
    --description="Triggers automated compliance task cycle generation at midnight UTC"
```

---

## 🔍 Verification & Diagnostics

| Verification Target | Command | Expected Result |
| :--- | :--- | :--- |
| **Backend Actuator Health** | `curl $BACKEND_SERVICE_URL/actuator/health` | `{"status":"UP"}` |
| **Cloud SQL Status** | `gcloud sql instances describe $DB_INSTANCE_NAME --format="value(state)"` | `RUNNING` |
| **Cloud Run Status** | `gcloud run services describe fin-sop-backend --region=$REGION` | `Ready: True` |
| **VPC Connector Status** | `gcloud compute networks vpc-access connectors describe fin-sop-vpc-connector --region=$REGION` | `STATE: READY` |
| **Cloud Armor Rules** | `gcloud compute security-policies describe fin-sop-waf-policy` | Rule list 1000, 1001, 2000 |
| **Manual Cron Trigger** | `gcloud scheduler jobs execute fin-sop-nightly-task-generator` | `HTTP 200 OK` |
