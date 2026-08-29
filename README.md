# RAVAND FinOps - Enterprise Finance SOP Management & Compliance Platform

RAVAND FinOps is a production-grade enterprise platform engineered for financial Standard Operating Procedure (SOP) management, statutory compliance tracking, and dual-control Maker-Checker governance across multi-entity corporate structures (CK India, CK US, CK UK, CK Australia).

The platform replaces manual spreadsheet-based compliance management with automated SOP definitions, version control, multi-frequency cycle generation (Monthly, Quarterly, Annual, Weekly, Daily), strict Segregation of Duties (SoD), immutable audit logging, and automated execution workflows.

---

## Technical Architecture & Infrastructure Specification

```
                          USER BROWSER / CLIENT
                                    │
                                    ▼
                 Cloud DNS (app.ravand.com / api.ravand.com)
                                    │
                                    ▼
       Global External Application Load Balancer (HTTPS / TLS 443)
                                    │
                                    ▼
     Cloud Armor WAF (OWASP Top 10, SQLi, XSS, Rate Limiting 100 req/min)
                                    │
                                    ▼
                       GCP API Gateway (/finsop/v1/...)
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       ▼                            ▼                            ▼
SOP Microservice           Task Execution Service        Access & Auth Service
(Spring Boot 3 / Java 17)  (Spring Boot 3 / Java 17)     (Node.js / Express / TS)
       │                            │                            │
       └────────────────────────────┼────────────────────────────┘
                                    │
                                    ▼
             Cloud SQL PostgreSQL / H2 Database (Flyway V1 & V2)
```

### Technology Stack

| Layer | Component | Description |
| :--- | :--- | :--- |
| **Frontend UI** | React 18, Vite, Vanilla CSS Modules | High-performance Single Page Application (SPA) with full-width top header bars, auto-vanishing floating toasts, custom select controls, mini-calendar date pickers, and table pagination. |
| **Backend Core** | Spring Boot 3.2, Java 17, Jakarta Persistence (JPA), Hibernate | Enterprise REST API server handling SOP CRUD, Maker-Checker state transitions, task scheduling, and audit logging. |
| **Microservices API Gateway** | Node.js, Express, TypeScript | Request routing, JWT validation, correlation tracking (`X-Correlation-ID`), rate limiting, and dev auth bypass handlers. |
| **Database & Migration** | PostgreSQL 15 / H2 Database, Flyway | Versioned database migrations (`V1__init_schema.sql`, `V2__seed_dummy_sops_and_tasks.sql`) maintaining constraint integrity and pre-seeding 60 compliance tasks and 60 audit logs. |
| **Security & Edge** | GCP Cloud Armor, Secret Manager, Cloud Run | WAF security rules, encrypted secret vaults, IAM least-privilege service accounts, and serverless Cloud Run container hosting. |

---

## Core Application Modules & Capabilities

### 1. SOP Management & Versioning Engine
- **Full CRUD Capabilities**: Complete lifecycle management allowing authorized users (Admin / SOP Creators) to Create, View, Edit, and Delete Standard Operating Procedures.
- **Automated Version Control**: Modifying SOP parameters (title, frequency, due day offset, maker/checker assignments) increments the SOP version counter (`v1` -> `v2`), preserving historical operational records.
- **Pool Assignments**: Defines default Maker and Checker user pools for each SOP, facilitating dynamic task distribution across corporate entities.
- **Detailed SOP Modal**: Provides structured viewing of corporate entity, process category, frequency rules, due day offsets, and operational instructions.

### 2. Dual-Control Maker-Checker Governance
- **Segregation of Duties (SoD)**: Enforces dual-control governance. A Maker cannot approve their own submitted task.
- **State Machine Workflow**:
  - `OPEN`: Task generated and waiting for Maker execution.
  - `PENDING_REVIEW`: Task submitted by Maker with supporting comments; locked for Checker review.
  - `APPROVED`: Task reviewed, validated, and finalized by Checker.
  - `REJECTED`: Task rejected by Checker with mandatory corrective feedback, returning it to `REJECTED` state for Maker revision.
- **Task Action Modal**: Clean modal interface supporting submission, review, approval, and rejection actions with real-time validation.

### 3. Interactive Task Management & Advanced Filtering
- **Unified Date Range Picker**: Features quick presets (Today, Last 7 Days, This Week, This Month, This Quarter) alongside a built-in interactive mini-calendar grid for custom date range selections.
- **Multi-Vector Filtering**: Filter compliance tasks by Corporate Entity, SOP Process Category (Tax Compliance, Treasury & Cash Management, Financial Reporting, Fixed Assets, Payroll & Statutory), Task Status, Maker, and Checker.
- **Admin Task Deletion**: Provides Admin users with task deletion capabilities backed by modal confirmation dialogs.

### 4. Actionable My Inbox
- **Split Workspace**: Segregates action items into two distinct sections:
  - **Tasks to Approve**: Checker workspace displaying tasks awaiting review.
  - **Tasks to Complete**: Maker workspace displaying tasks in `OPEN` or `REJECTED` status.
- **Role-Aware Views**: Automatically tailors visible task sections according to the active user's assigned role (`ADMIN`, `MAKER`, `CHECKER`, `VIEWER`).

### 5. Immutable Audit Trail & Compliance Logging
- **Event Capture**: Records all compliance actions including `SUBMIT_TASK`, `APPROVE_TASK`, `REJECT_TASK`, `CREATE_SOP`, `UPDATE_SOP`, `DELETE_SOP`, and `DELETE_TASK`.
- **Metadata Context**: Captures actor full name, email address, action type, entity type, target entity ID, and UTC timestamp.
- **Detailed Audit Modal**: Displays comprehensive audit event metadata in a read-only compliance inspection drawer.

### 6. Modern User Experience & Design System
- **Full-Width Top Header Bar**: Anchored top navigation header with `#f8fafc` greyish card background and `#cbd5e1` bottom border spanning 100% of the viewport width.
- **Floating Auto-Vanishing Toast Notifications**: Asynchronous top-right toast alerts featuring a 3.5-second auto-dismissal timer for seamless feedback.
- **Table Pagination**: Standardized pagination bar (`Pagination.jsx`) maintaining clean page sizes across all views (Inbox: 5 items/page, Tasks: 10 items/page, Audit Logs: 10 items/page, SOPs: 10 items/page, Dashboard: 5 items/page).
- **Iconography**: Clean SVG icons for all action buttons (View eye icon, Edit pencil icon, Delete trash icon).

---

## Data Schema & Migration Architecture

The database schema is managed via Flyway versioned migration scripts:

### Schema Entities & Constraints

```sql
-- Standard Operating Procedures (SOPs)
CREATE TABLE sops (
    sop_id VARCHAR(64) PRIMARY KEY,
    sop_code VARCHAR(64) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    process_category VARCHAR(64) NOT NULL,
    entity_code VARCHAR(32) NOT NULL,
    frequency VARCHAR(32) NOT NULL,
    due_day_offset INT NOT NULL,
    version INT DEFAULT 1,
    status VARCHAR(32) DEFAULT 'ACTIVE'
);

-- Compliance Tasks
CREATE TABLE tasks (
    task_id VARCHAR(64) PRIMARY KEY,
    record_no VARCHAR(64) UNIQUE NOT NULL,
    sop_id VARCHAR(64) REFERENCES sops(sop_id),
    period_key VARCHAR(32) NOT NULL,
    entity_code VARCHAR(32) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL,
    CONSTRAINT uq_sop_period UNIQUE (sop_id, period_key)
);

-- Audit Event Log
CREATE TABLE audit_logs (
    audit_id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    actor_id VARCHAR(64) NOT NULL,
    actor_name VARCHAR(128),
    actor_email VARCHAR(128),
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL
);
```

---

## Getting Started & Local Development

### Prerequisites
- Node.js v18.x or higher
- JDK 17 or higher
- Apache Maven 3.8+

### 1. Run Vite Frontend Development Server
```bash
cd prototyping/frontend
npm install
npm run dev -- --port 3010
```
Access the web frontend at `http://localhost:3010`.

### 2. Run Spring Boot Backend Server
```bash
cd prototyping/backend
mvn spring-boot:run
```
The REST API server will initialize on `http://localhost:8080/finsop/v1` with Flyway database migrations auto-populating seed records.

### 3. Verify Production Build
```bash
cd prototyping/frontend
npm run build
```
Executes Vite production bundle compilation with zero compilation errors across all modules.

---

## API Reference

| Endpoint | Method | Role | Description |
| :--- | :--- | :--- | :--- |
| `/finsop/v1/sops` | `GET` | All | Fetch filtered list of SOPs by corporate entity. |
| `/finsop/v1/sops` | `POST` | Admin | Create a new Master Standard Operating Procedure. |
| `/finsop/v1/sops/{id}` | `PUT` | Admin | Update existing SOP parameters and increment version. |
| `/finsop/v1/sops/{id}` | `DELETE` | Admin | Delete / archive Master SOP record. |
| `/finsop/v1/tasks` | `GET` | All | Fetch tasks matching entity, status, maker, checker, and date parameters. |
| `/finsop/v1/tasks/{id}/submit` | `PUT` | Maker | Submit compliance task for Checker pool review. |
| `/finsop/v1/tasks/{id}/approve` | `PUT` | Checker | Review and approve pending compliance task. |
| `/finsop/v1/tasks/{id}/reject` | `PUT` | Checker | Reject pending task with mandatory corrective comment. |
| `/finsop/v1/tasks/{id}` | `DELETE` | Admin | Permanently delete compliance task instance. |
| `/finsop/v1/audit-logs` | `GET` | All | Fetch immutable audit event logs for compliance verification. |

---

## Future Enhancements & System Roadmap

The following architectural enhancements and functional modules are scheduled for upcoming platform releases:

### 1. Evidence Document Upload via GCP Cloud Storage Signed URLs
- **V4 Signed URL Generation**: Enable Makers to upload supporting compliance proof (PDF tax receipts, bank settlement statements, payroll registers) directly from browser to Google Cloud Storage (GCS) buckets without routing large binaries through backend servers.
- **Document Metadata Verification**: Store SHA-256 file hashes and MIME types in task comments to guarantee document integrity.

### 2. Asynchronous Notification Pipeline via Google Cloud Pub/Sub
- **Event-Driven Messaging**: Publish compliance events (`TASK_OVERDUE`, `SUBMISSION_PENDING`, `REJECTION_NOTICE`) to GCP Pub/Sub topics.
- **Multi-Channel Delivery**: Worker consumers deliver real-time notifications via SendGrid Email, Slack Webhooks, and Microsoft Teams.

### 3. Automated SLA Monitoring & Escalation Engine
- **Deadline Tracking**: Background scheduler computing task breach risks based on entity timezones and statutory due dates.
- **Hierarchical Escalation**: Trigger automatic escalation notifications to Finance Directors if a task remains unactioned 24 hours prior to deadline.

### 4. Hardware Security Key (WebAuthn) & Multi-Factor Authentication
- **FIDO2 / WebAuthn Integration**: Require YubiKey or biometric authentication for high-risk financial approvals (e.g. wire transfers, statutory tax filings above threshold values).
- **Step-Up Authentication**: Prompt Makers and Checkers for secondary verification prior to task approval.

### 5. AI-Powered Compliance Anomaly Detection & OCR Document Parsing
- **FastAPI AI Microservice Integration**: Non-blocking Python service using Computer Vision and OCR to parse uploaded tax returns (GSTR-3B, Form 941, W2) and cross-reference numbers against task values.
- **Timestamp Anomaly Detection**: Flag submission patterns occurring outside normal operating hours or exhibiting suspicious execution velocities.

### 6. Real-Time Inbox Synchronization via WebSockets / Server-Sent Events (SSE)
- **Live Inbox Updates**: Implement Server-Sent Events (SSE) to push task status updates to active Checkers and Makers in real time without manual page refreshes.
