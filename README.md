# FinSOP Enterprise Platform
### Multi-Tenant Financial Compliance & SOP Automation Platform

The FinSOP Enterprise Platform is a multi-tenant compliance governance system engineered for financial enterprises. It automates Standard Operating Procedure (SOP) lifecycles, period-specific task scheduling, multi-tier maker/checker workflows, inline document verification, and strict Segregation of Duties (SoD).

---

## 1. Local Workspace Setup (Docker)

Complete local workspace setup of all system components (PostgreSQL, RabbitMQ, Spring Boot Backend, and React Frontend) using Docker.

### 1.1 Prerequisites
Ensure the following tools are installed on your host system:
* Docker Desktop (v20.10 or higher) with docker compose plugin
* Git

---

### 1.2 Execution Commands

Step 1: Clone the repository and navigate into the workspace directory:

    git clone https://github.com/CloudKaptan/ck-internal-finance-sop.git

Step 2: Build and start all containerized services:

    docker compose up -d --build

---

### 1.3 Verify Status

Check container status using:

    docker compose ps

Healthy containers:
* finsop-postgres (PostgreSQL 15 Database) - Port 5432
* finsop-rabbitmq (RabbitMQ Message Broker) - Ports 5672, 15672
* finsop-backend (Spring Boot REST Application) - Port 8080
* finsop-frontend (React + Nginx Application) - Port 3010

---

## 2. Application Endpoint Directory

| Service / Component | Endpoint URL | Details |
| :--- | :--- | :--- |
| Frontend Application | http://localhost:3010 | React UI with Team Member Dropdown |
| Backend API Health | http://localhost:8080/finsop/v1/health | System status endpoint |
| OpenAPI / Swagger Docs | http://localhost:8080/swagger-ui.html | Interactive API Documentation |
| RabbitMQ Console | http://localhost:15672 | User: finsop_rabbit \| Pass: finsop_rabbit_pass |
| PostgreSQL Database | localhost:5432 | DB: finsop_db \| User: finsop_user \| Pass: finsop_password |

---

## 3. Pre-configured Users & Roles

The platform includes the following pre-configured user accounts available in the application:

### 3.1 Primary Administrator
* Manoj Agarwal (`usr-manoj-042`) — Global System Admin (Access Control, SOP Approvals, Audit Logs)

### 3.2 Team Member Accounts (Dropdown Selection)
* Anirban Paul (`usr-anirban-001`)
* Annu Shaw (`usr-annu-002`)
* Avisek Shaw (`usr-avisek2-003`)
* Ayush Pandey (`usr-ayush-004`)
* Debajyoti Dattagupta (`usr-debajyo-005`)
* Isha Prasad (`usr-isha-006`)
* Kingshuk Roy (`usr-king-007`)
* Moitrayee Dutta (`usr-moit-008`)
* Nishan Mandal (`usr-nishan-009`)
* Rounok Das (`usr-rounok-010`)
* Sanjeev Kumar (`usr-sanjeev-011`)
* Sayantan Ghosh (`usr-sayant-012`)
* Shreya Singh (`usr-shreya-013`)

---

## 4. End-to-End Application Workflow

### Step 1: Grant SOP Creation Access
1. Access http://localhost:3010 and sign in as Manoj Agarwal (Admin).
2. Navigate to Access Control.
3. Select a Process Category (e.g., TAXATION, TREASURY, or ACCOUNTS_PAYABLE) and grant SOP Creation Permission to a team member (e.g., Tushar Seth).
4. The designated team member receives an in-app notification.

### Step 2: Create SOP Specification
1. Sign in as the designated Maker (e.g., Tushar Seth).
2. Click Create SOP from the dashboard or notification link.
3. Configure SOP parameters:
   * Title & Description (e.g., Monthly Tax Return Reconciliation & Filing)
   * Process Category (Select authorized category)
   * Frequency (DAILY, WEEKLY, MONTHLY, QUARTERLY, or ANNUAL)
   * Start Date & Due Date (YYYY-MM-DD)
   * Makers & Checkers assignment
4. Click Submit for Approval.

### Step 3: Approve SOP Specification & Task Triggering
1. Sign in as Manoj Agarwal (Admin).
2. Navigate to SOPs and select the pending specification.
3. Review parameters and click Approve & Activate.
4. Task Generation: If the start date matches current or past dates, the engine automatically creates the initial compliance task instance.

### Step 4: Task Execution & Evidence Attachment
1. Sign in as the assigned Maker (e.g., Tushar Seth).
2. Open the active task under Inbox or Tasks.
3. Upload supporting evidence files (PDF, PNG, JPG, XLSX).
4. Click Submit Task for Review.

### Step 5: Document Review & Task Sign-off
1. Sign in as the assigned Checker (e.g., Mainak Gupta or Vivek Raj).
2. Open the task under Tasks / Approvals.
3. Review evidence documents attached to the task.
4. Approve attached evidence documents and complete task sign-off.

---

## 5. Docker Operational Commands

### Stream All Container Logs

    docker compose logs -f

### Stream Backend Container Logs Only

    docker compose logs -f backend

### Stream Frontend Container Logs Only

    docker compose logs -f frontend

### Stop All Containers

    docker compose down

### Database Reset and Fresh Rebuild

    docker compose down -v
    docker compose up -d --build

### Rebuild Backend Service Only

    docker compose up -d --build backend

### Rebuild Frontend Service Only

    docker compose up -d --build frontend

---

## 6. Project Structure Overview

    Prototype/
    ├── docker-compose.yml          # Container orchestration configuration
    ├── README.md                   # System documentation and onboarding guide
    ├── backend/                    # Java 17 / Spring Boot 3.3 REST Application
    │   ├── Dockerfile              # Multi-stage Maven container build
    │   ├── pom.xml                 # Maven configuration and dependencies
    │   └── src/main/
    │       ├── java/com/cloudkaptan/sop/
    │       │   ├── config/         # Security, tenant context, and CORS setup
    │       │   ├── controller/     # REST Endpoints (SOP, Task, Documents, Access)
    │       │   ├── domain/         # State Machines, Domain Models, and Enums
    │       │   ├── dto/            # Data Transfer Objects
    │       │   ├── entity/         # JPA Entities
    │       │   ├── repository/     # Spring Data JPA Repositories
    │       │   └── service/        # Core Business Logic and Scheduler
    │       └── resources/
    │           ├── application-local.yml
    │           └── db/migration/postgresql/  # Database Migration Scripts
    └── frontend/                   # React 18 / Vite / Tailwind CSS Web Application
        ├── Dockerfile              # Multi-stage Nginx production container build
        ├── nginx.conf              # Nginx reverse proxy configuration
        ├── package.json            # Node.js dependencies
        └── src/
            ├── components/         # Modal dialogs and UI elements
            ├── pages/              # Main application views
            └── services/api.js     # REST API client service layer

---

## 7. Troubleshooting

### 7.1 Port Availability Conflicts
If ports 8080 or 3010 are already bound on your host:
* Stop conflicting host processes.
* Or update host port mappings in docker-compose.yml (e.g., change "3010:80" to "3011:80").

### 7.2 Database Restart
If backend startup times out awaiting database readiness on slower hardware:

    docker compose restart backend

### 7.3 Direct Database Access
To open an interactive SQL shell inside the PostgreSQL container:

    docker exec -it finsop-postgres psql -U finsop_user -d finsop_db
