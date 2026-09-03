project_id    = "finance-sop-portal"
region        = "asia-south1"
bucket_name   = "fin-sop-frontend-bucket"
domain_name   = "finsop.cloudkaptan.com"
db_name       = "fin_sop_db"
db_user       = "sop_app_user"
backend_image = "asia-south1-docker.pkg.dev/finance-sop-portal/fin-sop-repo/fin-sop-backend"

# Set db_password via environment variable instead of committing it here:
#   export TF_VAR_db_password="your_secure_password"
