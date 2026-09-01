# FinSOP — Financial Operations & Compliance Tracker

> A production-grade enterprise SOP governance platform with Maker-Checker workflows, automated compliance scheduling, and full audit trail.

## 📁 Documentation Index

All project documentation lives in the [`docs/`](./docs/) folder:

| Document | Description |
| :--- | :--- |
| [📖 README.md](./docs/README.md) | Full platform overview, architecture, API reference, and setup guide |
| [🏗️ LLD_DESIGN.md](./docs/LLD_DESIGN.md) | Low-Level Design — class diagrams, design patterns, and service architecture |
| [🗄️ DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md) | Complete ER diagram, table schemas, and relationship guide |
| [🔒 SOP_GOVERNANCE_ARCHITECTURE_DOCUMENTATION.md](./docs/SOP_GOVERNANCE_ARCHITECTURE_DOCUMENTATION.md) | SOP governance workflow, audit trail, rate limiting, row-level security, and all code changes |
| [🐳 DOCKER_RUN_GUIDE.md](./docs/DOCKER_RUN_GUIDE.md) | Local Docker Compose setup and run instructions |
| [☁️ GCLOUD_DEPLOYMENT_GUIDE.md](./docs/GCLOUD_DEPLOYMENT_GUIDE.md) | Google Cloud Run deployment guide |

## 🚀 Quick Start

```bash
# Start with Docker Compose
docker compose up --build

# Or start backend manually
mvn spring-boot:run -f backend/pom.xml

# Start frontend
cd frontend && npm install && npm run dev
```

**Frontend:** http://localhost:3010  
**Backend API:** http://localhost:8080/api/v1