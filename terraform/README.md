# FinSOP Portal — Terraform Infrastructure

This directory contains the complete Terraform configuration for the **FinSOP Portal** GCP production infrastructure. Every resource maps 1:1 to the `gcloud` CLI commands documented in [`GCP_DEPLOYMENT_README.md`](../GCP_DEPLOYMENT_README.md).

---

## 📁 File Structure

| File | What it provisions |
| :--- | :--- |
| `versions.tf` | Terraform & provider version pinning |
| `variables.tf` | All input variable declarations |
| `terraform.tfvars` | Variable values (committed — no secrets) |
| `networking.tf` | Custom VPC, subnet, PSA IP range, VPC Peering |
| `database.tf` | Secret Manager secret, Cloud SQL PostgreSQL 15, DB & user |
| `iam.tf` | Service account, Secret/SQL/Registry IAM roles, Artifact Registry repo |
| `cloud_run.tf` | Cloud Run service with VPC egress + secret injection + LB invoker binding |
| `storage.tf` | GCS frontend bucket + public viewer IAM binding |
| `cloud_armor.tf` | Cloud Armor WAF policy + rate-limit ban rule (100 req/min → 5-min ban) |
| `load_balancer.tf` | Serverless NEG, backend service, CDN bucket, URL map, static IP, HTTP proxy & forwarding rule |
| `https.tf` | Managed SSL certificate, HTTPS proxy, port 443 forwarding rule |
| `outputs.tf` | Key output values (LB IP, Cloud Run URL, Cloud SQL IP, etc.) |

---

## 🚀 Deployment Steps

### 1. Authenticate with GCP
```bash
gcloud auth application-default login
gcloud config set project finance-sop-portal
```

### 2. Set the DB password (never commit this)
```bash
export TF_VAR_db_password="your_secure_password"
```

### 3. Initialize Terraform
```bash
cd terraform
terraform init
```

### 4. Review the execution plan
```bash
terraform plan
```

### 5. Apply infrastructure
```bash
terraform apply
```

### 6. Build and push the backend Docker image
After `terraform apply`, push your backend image to Artifact Registry:
```bash
cd ../backend
gcloud builds submit --tag asia-south1-docker.pkg.dev/finance-sop-portal/fin-sop-repo/fin-sop-backend
```

### 7. Upload the React frontend
```bash
cd ../frontend
npm install && npm run build
gcloud storage cp -r dist/* gs://fin-sop-frontend-bucket/
```

### 8. Configure DNS
Add an **A record** for `finsop.cloudkaptan.com` pointing to the IP from Terraform output:
```bash
terraform output load_balancer_ip
```

---

## ⚠️ Important Notes

- **`db_password`** is declared as `sensitive = true` and must **never** be committed to version control. Always pass it via `TF_VAR_db_password` environment variable or a CI/CD secrets manager.
- **`deletion_protection = true`** is set on the Cloud SQL instance. To destroy it, first run `terraform apply` with `deletion_protection = false`, then `terraform destroy`.
- SSL certificate provisioning can take **10–30 minutes** after DNS propagates. Cloud Run and CDN will work on HTTP (port 80) immediately.
- The `backend_image` variable must point to an image that already exists in Artifact Registry before Cloud Run can deploy successfully. Build and push the image first, then run `terraform apply`.
