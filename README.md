# Finance SOP Platform (ck-internal-finance-sop)

This repository houses CloudKaptan's internal Finance SOP Platform built with Spring Boot (Java/GCP Cloud Run backend), React (Vite UI), PostgreSQL, and Google Cloud Storage / MinIO S3 Object Storage.

---

## 📚 Key Technical Documentation

- 📎 **[Document Upload & Download Signed URL Architecture (DOCUMENT_UPLOAD_README.md)](file:///e:/Prototype%20-%20Finance%20SOP%20platform/Prototype/DOCUMENT_UPLOAD_README.md)**
  - Serverless-optimized GCS V4 / MinIO S3 Signed URL workflow with zero backend byte streaming.
  - Strict Object-Level RBAC with Global Admin Exclusion Enforcement.
  - End-to-end testing guide with cURL commands and UI verification steps.

- 🏢 **[Organizational Hierarchy & Dynamic RBAC Architecture (ORGANIZATIONAL_HIERARCHY_README.md)](file:///e:/Prototype%20-%20Finance%20SOP%20platform/Prototype/ORGANIZATIONAL_HIERARCHY_README.md)**
  - Complete algorithm and flow explanation for write-access and read/write reporting hierarchies.
  - Segregation of duties (SoD) and dynamic Maker/Checker pool assignment logic.

---

## 🚀 Quick Start Guide

### Backend Development (Local Profile with MinIO Storage)
```bash
# Start MinIO Object Storage & PostgreSQL in Docker
docker-compose up -d

# Run Spring Boot Application
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

