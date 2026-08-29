# RAVAND FinOps — Docker Execution & Containerization Guide

This guide provides instructions for building, running, and managing the complete RAVAND FinOps platform on any standalone device using Docker and Docker Compose.

---

## Architecture Specification

The containerized stack consists of three orchestrated services:

```
                          USER BROWSER / CLIENT
                                    |
                                    v
            frontend (Nginx Container) — http://localhost:3010
                                    |
                                    v (Internal Docker Network)
                                    |
            backend (Spring Boot Container) — http://localhost:8080/finsop/v1
                                    |
                                    v (Internal Docker Network)
                                    |
            postgres (PostgreSQL 15 Container) — localhost:5432
```

| Service | Technology | Port Mapping | Container Name | Description |
| :--- | :--- | :--- | :--- | :--- |
| `postgres` | PostgreSQL 15 Alpine | `5432:5432` | `finsop-postgres` | Relational database engine with persistent volume storage |
| `backend` | Spring Boot 3.2 / Java 17 | `8080:8080` | `finsop-backend` | REST API server with Flyway database migration runner |
| `frontend` | React 18 / Vite / Nginx | `3010:80` | `finsop-frontend` | Static SPA hosting and API reverse proxy |

---

## Prerequisites

Before running the application, ensure your target device meets the following requirements:

1. **Docker Engine**: Version 20.10.0 or higher
2. **Docker Compose**: Version 2.0.0 or higher (or `docker compose` plugin)
3. **Hardware Resources**:
   - RAM: Minimum 4 GB available memory
   - Disk Space: Minimum 5 GB free disk space

To verify Docker installation:
```bash
docker --version
docker compose version
```

---

## Quick Start Guide

### 1. Clone or Extract Application Files
Ensure you are in the directory containing `docker-compose.yml`:
```bash
cd prototyping
```

### 2. Build and Launch All Containers
Execute the following command to build images and launch all services in detached mode:
```bash
docker-compose up --build -d
```

Docker Compose will automatically:
1. Initialize the PostgreSQL container and wait for database readiness.
2. Build the multi-stage Spring Boot Java container and execute Flyway migrations.
3. Build the Nginx React frontend container and establish proxy routing.

### 3. Verify Container Status
Check that all three containers are running and healthy:
```bash
docker-compose ps
```

Expected output:
```
NAME              IMAGE              COMMAND                  SERVICE      CREATED          STATUS                    PORTS
finsop-postgres   postgres:15-alpine "docker-entrypoint.s..."   postgres     10 seconds ago   Up 10 seconds (healthy)   0.0.0.0:5432->5432/tcp
finsop-backend    finsop-backend     "sh -c 'java $JAVA_O..." backend      10 seconds ago   Up 10 seconds (healthy)   0.0.0.0:8080->8080/tcp
finsop-frontend   finsop-frontend    "/docker-entrypoint...." frontend     10 seconds ago   Up 10 seconds             0.0.0.0:3010->80/tcp
```

### 4. Access the Application
Open a web browser on your device and navigate to:
- **Frontend SPA Application**: `http://localhost:3010`
- **Backend API Health Check**: `http://localhost:8080/finsop/v1/health`
- **Backend API Direct Endpoint**: `http://localhost:8080/finsop/v1/tasks`

---

## Operational Commands

### Viewing Service Logs
To view realtime logs from all services:
```bash
docker-compose logs -f
```

To view logs for a specific service:
```bash
# View backend logs
docker-compose logs -f backend

# View database logs
docker-compose logs -f postgres

# View frontend proxy logs
docker-compose logs -f frontend
```

### Stopping Services
To stop running containers without destroying stored data:
```bash
docker-compose stop
```

To restart stopped containers:
```bash
docker-compose start
```

### Rebuilding a Single Service
If you modify source code in frontend or backend, rebuild only that service:
```bash
# Rebuild frontend only
docker-compose up -d --build frontend

# Rebuild backend only
docker-compose up -d --build backend
```

### Complete Teardown & Data Reset
To stop all containers, remove networks, and purge persistent database volumes:
```bash
docker-compose down -v
```

---

## Configuration & Environment Variables

You can customize runtime behavior by creating a `.env` file in the same directory as `docker-compose.yml`:

```env
POSTGRES_DB=finsop_db
POSTGRES_USER=finsop_user
POSTGRES_PASSWORD=finsop_password
BACKEND_PORT=8080
FRONTEND_PORT=3010
SPRING_PROFILES_ACTIVE=prod
```

---

## Troubleshooting & Common Issues

| Symptom | Probable Cause | Resolution |
| :--- | :--- | :--- |
| `port is already allocated` | Port 3010, 8080, or 5432 is in use by another application | Change the host port mapping in `docker-compose.yml` (e.g. `"3011:80"`). |
| Backend container fails health check | Database initialization delayed | Run `docker-compose logs backend` to inspect Flyway migration status. Restart via `docker-compose restart backend`. |
| Frontend shows blank page | Reverse proxy target mismatch | Ensure Nginx container can reach `backend:8080` over the Docker internal bridge network. |
| Out of Memory (OOM) Killed | Insufficient JVM heap allocation | Increase Docker Desktop RAM limit to 4GB+ or adjust `JAVA_OPTS="-Xms128m -Xmx256m"` in `backend/Dockerfile`. |
