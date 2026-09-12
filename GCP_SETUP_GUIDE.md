# GCP Infrastructure & Production Setup Guide

This document provides a step-by-step guide to setting up the **Google Cloud Platform (GCP)** infrastructure required for the **Production-Grade SOP Task Generation Architecture**.

---

## 📋 Required GCP APIs & Prerequisites

Before provisioning resources, enable the required GCP APIs in your GCP project:

```bash
# Set your GCP Project ID
export GCP_PROJECT_ID="your-gcp-project-id"
export GCP_REGION="us-central1"

gcloud config set project $GCP_PROJECT_ID

# Enable Required GCP APIs
gcloud services enable \
  cloudtasks.googleapis.com \
  cloudfunctions.googleapis.com \
  cloudscheduler.googleapis.com \
  run.googleapis.com \
  iam.googleapis.com \
  sqladmin.googleapis.com
```

---

## 🔑 Step 1: IAM Service Accounts Setup (Least Privilege)

Create dedicated, scoped service accounts for Cloud Tasks and Cloud Scheduler invokers:

```bash
# 1. Create Cloud Tasks Invoker Service Account
gcloud iam service-accounts create cloud-tasks-invoker \
  --display-name="Invoker used by Cloud Tasks to call sop-task-worker-fn"

# 2. Create Cloud Scheduler Invoker Service Account
gcloud iam service-accounts create cloud-scheduler-invoker \
  --display-name="Invoker used by Cloud Scheduler to call reconciler-fn"
```

---

## 📬 Step 2: GCP Cloud Tasks Queue Provisioning

Create the dedicated Cloud Tasks queue configured for retry backoff and concurrency control:

```bash
# Create Cloud Tasks Queue
gcloud tasks queues create sop-task-queue \
  --location=$GCP_REGION \
  --max-dispatches-per-second=100 \
  --max-concurrent-dispatches=50 \
  --max-attempts=5 \
  --min-backoff=5s \
  --max-backoff=60s
```

---

## ⚡ Step 3: Cloud Functions Deployment (`--no-allow-unauthenticated`)

Deploy the micro-worker function and reconciliation function as private 2nd-gen Cloud Functions:

### A. Deploy `sop-task-worker-fn` (128MB RAM)
```bash
cd gcp-functions/sop-task-worker-fn

gcloud functions deploy sop-task-worker-fn \
  --gen2 \
  --runtime=nodejs20 \
  --region=$GCP_REGION \
  --source=. \
  --entry-point=handleTaskExecution \
  --memory=128Mi \
  --timeout=15s \
  --no-allow-unauthenticated \
  --set-env-vars DB_HOST="your-db-host",DB_NAME="finsop_db",DB_USER="finsop_user",DB_PASS="finsop_password"

# Capture Function URL
export WORKER_FN_URL=$(gcloud functions describe sop-task-worker-fn --region=$GCP_REGION --format="value(serviceConfig.uri)")

# Grant Invoker IAM Role to Cloud Tasks Service Account
gcloud run services add-iam-policy-binding sop-task-worker-fn \
  --region=$GCP_REGION \
  --member="serviceAccount:cloud-tasks-invoker@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.invoker"
```

### B. Deploy `reconciler-fn` (128MB RAM)
```bash
cd gcp-functions/reconciler-fn

gcloud functions deploy reconciler-fn \
  --gen2 \
  --runtime=nodejs20 \
  --region=$GCP_REGION \
  --source=. \
  --entry-point=handleReconciliation \
  --memory=128Mi \
  --timeout=30s \
  --no-allow-unauthenticated \
  --set-env-vars DB_HOST="your-db-host",DB_NAME="finsop_db",DB_USER="finsop_user",DB_PASS="finsop_password"

# Capture Function URL
export RECONCILER_FN_URL=$(gcloud functions describe reconciler-fn --region=$GCP_REGION --format="value(serviceConfig.uri)")

# Grant Invoker IAM Role to Cloud Scheduler Service Account
gcloud run services add-iam-policy-binding reconciler-fn \
  --region=$GCP_REGION \
  --member="serviceAccount:cloud-scheduler-invoker@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.invoker"
```

---

## ⏰ Step 4: GCP Cloud Scheduler Reconciliation Job Setup

Create the sparse 6-hour reconciliation trigger in Cloud Scheduler using OIDC authentication:

```bash
gcloud scheduler jobs create http sop-reconciler-6h \
  --location=$GCP_REGION \
  --schedule="0 */6 * * *" \
  --uri="$RECONCILER_FN_URL" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --oidc-service-account-email="cloud-scheduler-invoker@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --oidc-token-audience="$RECONCILER_FN_URL"
```

---

## 🏗️ Step 5: Terraform Infrastructure-as-Code Snippet

If your team uses Terraform, add this configuration block to your infrastructure repository:

```hcl
# main.tf

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

# Cloud Tasks Queue
resource "google_cloud_tasks_queue" "sop_task_queue" {
  name     = "sop-task-queue"
  location = var.gcp_region

  rate_limits {
    max_dispatches_per_second = 100
    max_concurrent_dispatches = 50
  }

  retry_config {
    max_attempts = 5
    min_backoff  = "5s"
    max_backoff  = "60s"
  }
}

# Service Account for Cloud Tasks
resource "google_service_account" "cloud_tasks_invoker" {
  account_id   = "cloud-tasks-invoker"
  display_name = "Invoker used by Cloud Tasks"
}

# IAM Binding allowing Cloud Tasks to invoke Worker Function
resource "google_cloud_run_service_iam_member" "worker_invoker" {
  location = var.gcp_region
  service  = google_cloudfunctions2_function.sop_task_worker.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.cloud_tasks_invoker.email}"
}
```

---

## 🔍 Verification & Security Audit Commands

1. **Verify Private Access (Unauthenticated Probes Should Fail)**:
   ```bash
   curl -i -X POST "$WORKER_FN_URL"
   # Expected Output: HTTP 403 Forbidden (GCP IAM Blocked)
   ```

2. **Verify Cloud Tasks Queue Health**:
   ```bash
   gcloud tasks queues describe sop-task-queue --location=$GCP_REGION
   ```

3. **Verify Reconciler Job Schedule**:
   ```bash
   gcloud scheduler jobs describe sop-reconciler-6h --location=$GCP_REGION
   ```
