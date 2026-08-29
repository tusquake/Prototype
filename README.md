# RAVAND FinOps — Enterprise Finance SOP Management & Compliance Platform

RAVAND FinOps is a production-grade enterprise platform built for financial Standard Operating Procedure (SOP) management, statutory compliance tracking, and dual-control Maker-Checker governance across multi-entity corporate structures. It replaces manual, error-prone spreadsheet-based compliance workflows with an automated, auditable, role-enforced system covering SOP definition, multi-frequency cycle scheduling, task execution, compliance scoring, and immutable event logging.

The system is designed for finance teams operating across multiple legal entities (CK India, CK US, CK UK, CK Australia) with varying statutory obligations — including GST return filing, advance tax estimation, payroll PF deposits, treasury wire reconciliations, and annual statutory filings under Companies House and the SEC.

---

## Table of Contents

- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Backend Architecture & Design Patterns](#backend-architecture--design-patterns)
- [Frontend Architecture & Component Library](#frontend-architecture--component-library)
- [Role-Based Access Control](#role-based-access-control)
- [Application Modules in Detail](#application-modules-in-detail)
  - [Compliance Dashboard](#1-compliance-dashboard)
  - [SOP Management & Versioning](#2-sop-management--versioning)
  - [Task Execution Workflow](#3-task-execution-workflow)
  - [My Inbox — Actionable Workspace](#4-my-inbox--actionable-workspace)
  - [Audit Trail & Event Logging](#5-audit-trail--event-logging)
- [Database Schema & Migration Strategy](#database-schema--migration-strategy)
- [Getting Started & Local Development](#getting-started--local-development)
- [Complete API Reference](#complete-api-reference)
- [Production Infrastructure](#production-infrastructure)
- [Future Enhancement Roadmap](#future-enhancement-roadmap)

---

## System Architecture

```
                          USER BROWSER / CLIENT
                                    |
                                    v
                 Cloud DNS (app.ravand.com / api.ravand.com)
                                    |
                                    v
       Global External Application Load Balancer (HTTPS / TLS 443)
                       [HTTP 80 -> 443 Permanent Redirect]
                                    |
                                    v
         Cloud Armor WAF (OWASP Top 10, SQLi, XSS, Rate Limiting 100 req/min, DDoS)
                                    |
                                    v
                 Serverless Network Endpoint Group (NEG)
                                    |
                                    v
                   GCP API Gateway — Node.js / Express / TypeScript
                   (/finsop/v1/...) [JWT Validation, X-Correlation-ID]
                                    |
         +--------------------------+---------------------------+
         |                          |                           |
         v                          v                           v
  SOP Microservice         Task Execution Service       Access & Auth Service
  Spring Boot 3 / Java 17  Spring Boot 3 / Java 17       Node.js / Express / TS
  [State Pattern, CRUD]    [State Machine Workflow,       [RBAC, Entity Perms]
  [Recurrence Strategy]    [Idempotent Scheduling]
         |                          |                           |
         +--------------------------+---------------------------+
                                    |
                                    v
             Cloud SQL PostgreSQL 15 / H2 (Local Dev)
             Flyway Versioned Migrations: V1, V1_1, V2
             [Automated Backups, PITR, Private IP, HA]
```

---

## Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite 5, Vanilla CSS Modules | SPA with CSS-scoped modular components |
| **Routing** | React Router DOM v6 | Client-side navigation with route-level permission guards |
| **Backend** | Spring Boot 3.2, Java 17, Jakarta EE | REST API with JPA, Hibernate ORM, Spring Events |
| **Database** | PostgreSQL 15 (prod) / H2 in-memory (dev) | Relational persistence with full ACID compliance |
| **Migrations** | Flyway | Versioned SQL migration scripts for schema and seed data |
| **Build Tools** | Apache Maven 3.8, npm / Vite | Dependency management and bundling |
| **API Gateway** | Node.js, Express, TypeScript | JWT verification, request routing, correlation IDs |
| **Security** | GCP Cloud Armor, Secret Manager, IAM | WAF rules, encrypted secrets, least-privilege accounts |
| **Infrastructure** | GCP Cloud Run, Cloud SQL, Cloud DNS | Serverless hosting, managed database, DNS management |
| **Scheduler** | Spring `@Scheduled`, GCP Cloud Scheduler | Cron-based nightly task generation engine |

---

## Backend Architecture & Design Patterns

The backend is architected with deliberate separation of concerns, applying classic Gang of Four design patterns to enforce correctness and extensibility.

### State Pattern — Task Lifecycle Enforcement

Task state transitions are enforced via the **State Pattern** (`TaskState` interface). Each task status is a discrete state class that implements the permitted transition methods. Attempting an illegal transition (e.g., approving an `OPEN` task that was never submitted, or a Maker approving their own submission) raises a typed `IllegalStateTransitionException` or `SeparationOfDutyViolationException` — never a generic error.

```
TaskState (interface)
    |-- OpenState          : permits submit(); blocks approve() and reject()
    |-- PendingReviewState : permits approve() and reject(); blocks submit()
    |-- ApprovedState      : terminal state; all transitions blocked
    |-- RejectedState      : permits resubmit via submit(); blocks approve() and reject()
```

The `TaskContext` class acts as the state machine context, delegating runtime calls to the current `TaskState` instance.

### Strategy Pattern — Multi-Frequency Recurrence Engine

SOP frequency schedules are computed via the **Strategy Pattern** (`RecurrenceStrategy` interface). Each frequency type is an isolated, independently testable strategy class.

```
RecurrenceStrategy (interface)
    |-- DailyRecurrenceStrategy      : periodKey = "DAILY-YYYY-MM-DD"
    |-- WeeklyRecurrenceStrategy     : periodKey = "WEEKLY-YYYY-WNN"
    |-- MonthlyRecurrenceStrategy    : periodKey = "MONTHLY-YYYY-MM"
    |-- QuarterlyRecurrenceStrategy  : periodKey = "QUARTERLY-YYYY-QN"
    |-- AnnualRecurrenceStrategy     : periodKey = "ANNUAL-YYYY"
```

The `RecurrenceStrategyFactory` resolves the appropriate strategy at runtime by `SopFrequency` enum. This makes adding a new frequency type (e.g., `BI_WEEKLY`) a zero-change to existing code.

### Idempotent Nightly Task Generation

The `TaskSchedulerService` runs on a configurable cron schedule (`app.task-scheduler.cron`, defaulting to midnight daily). For each `ACTIVE` SOP, it:

1. Resolves the strategy and computes the current `periodKey`.
2. Queries `taskRepository.existsBySop_SopIdAndPeriodKey(sopId, periodKey)`.
3. If no task exists for this period, creates one with status `OPEN` and saves it.
4. If a task already exists, the record is silently skipped — guaranteeing zero duplicates regardless of how many times the engine runs.

### Event-Driven Audit Architecture

All task state transitions publish a `TaskStatusChangedEvent` via Spring's `ApplicationEventPublisher`. The `TaskAuditTrailEventListener` consumes these events using `@TransactionalEventListener(phase = BEFORE_COMMIT)`, atomically persisting three records in the same transaction:

- A `TaskEvent` (full structured state transition history)
- A `TaskComment` (actor comment text, if provided)
- An `AuditLog` (compliance-grade log entry with correlation ID)

This event-driven approach decouples the workflow service from audit persistence and ensures audit records are never written unless the task state change itself commits successfully.

### Global Exception Handling

The `GlobalExceptionHandler` maps all domain exceptions to structured, RFC-7807-style API error responses:

| Exception Class | HTTP Status | Scenario |
| :--- | :--- | :--- |
| `ResourceNotFoundException` | 404 Not Found | Task or User ID not found in database |
| `SeparationOfDutyViolationException` | 409 Conflict | Maker attempting to approve their own submission |
| `IllegalStateTransitionException` | 409 Conflict | Invalid state transition (e.g., approving an OPEN task) |
| `UnauthorizedTaskActionException` | 403 Forbidden | Actor lacks role or entity permission for the action |

---

## Frontend Architecture & Component Library

The frontend is a modular React SPA with every component scoped to its own CSS Module file (zero global class leakage). All API calls are centralized in `services/api.js` targeting the `/finsop/v1` base path via Vite proxy.

### Component Library

| Component | File | Description |
| :--- | :--- | :--- |
| `Sidebar` | `Sidebar.jsx` | Fixed left navigation sidebar with role-aware tab visibility and active route highlighting |
| `EntityPills` | `EntityPills.jsx` | Multi-select corporate entity toggle pills (CK India, CK US, CK UK, CK Australia) used as the primary context filter on every page |
| `CustomSelect` | `CustomSelect.jsx` | Styled dropdown replacing native `<select>` with consistent design system styling |
| `MultiSelect` | `MultiSelect.jsx` | Checkbox-based multi-value dropdown selector for advanced filter toolbars |
| `AuditDateRangePicker` | `AuditDateRangePicker.jsx` | Full custom date range picker with a preset sidebar (Today, Last 7 Days, This Week, This Month, This Quarter) and an interactive mini-calendar grid. Zero dependency on native browser date dialogs. |
| `DateRangePicker` | `DateRangePicker.jsx` | Simplified date range picker for task list toolbar filters |
| `StatusBadge` | `StatusBadge.jsx` | Color-coded pill badge rendering task and SOP statuses (`OPEN`, `PENDING_REVIEW`, `APPROVED`, `REJECTED`, `OVERDUE`) |
| `TaskActionModal` | `TaskActionModal.jsx` | Full-screen modal for task submission, review, approval, and rejection. Enforces Segregation of Duties logic client-side before API calls. |
| `SopDetailModal` | `SopDetailModal.jsx` | Read-only structured detail drawer displaying SOP metadata, frequency rules, entity assignment, Maker/Checker pools, and version history |
| `AuditDetailModal` | `AuditDetailModal.jsx` | Read-only compliance inspection drawer for individual audit log events |
| `ConfirmationModal` | `ConfirmationModal.jsx` | Generic modal confirmation dialog for destructive actions (SOP deletion, task deletion) |
| `UserPickerModal` | `UserPickerModal.jsx` | Multi-user picker modal for selecting default Maker and Checker user pools during SOP creation and editing |
| `Pagination` | `Pagination.jsx` | Standardized pagination bar with previous/next navigation and current page indicator |
| `Toast` | `Toast.jsx` | Floating top-right notification toast with automatic 3.5-second dismissal timer |
| `TableSkeleton` | `TableSkeleton.jsx` | Animated shimmer skeleton loader rendered during async data fetching states |

---

## Role-Based Access Control

Access permissions are defined in `auth/rbac.js` and enforced at both the route level and the action level.

### Roles

| Role | Code | Description |
| :--- | :--- | :--- |
| Finance Admin | `ADMIN` | Full platform access. Can create, edit, delete SOPs, delete tasks, and view all audit logs. |
| Maker | `MAKER` | Executes and submits compliance tasks. Cannot approve or reject tasks. |
| Checker | `CHECKER` | Reviews, approves, and rejects submitted tasks. Cannot submit tasks as a Maker. |
| Maker-Checker | `MAKER_CHECKER` | Dual role. Can both execute tasks as Maker and review tasks as Checker (on different task records to maintain Segregation of Duties). |
| Viewer | `VIEWER` | Read-only access to Dashboard, Task List, and Audit Trail. No action capabilities. |

### Route-Level Permissions

| Route | ADMIN | MAKER | CHECKER | MAKER_CHECKER | VIEWER |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `/dashboard` | Yes | Yes | Yes | Yes | Yes |
| `/tasks` | Yes | Yes | Yes | Yes | Yes |
| `/inbox` | Yes | Yes | Yes | Yes | No |
| `/sops` | Yes | No | No | No | Yes |
| `/audit` | Yes | Yes | Yes | Yes | Yes |

### Action-Level Permissions

UI buttons for task actions (Submit, Approve, Reject) are conditionally rendered based on the active user's role. If a user does not hold the required role, the corresponding action button is not visible — no visible rejection message is shown to avoid confusion. This is consistent with zero-disclosure security design principles: a user who does not see a button inherently understands they do not hold the required authorization.

---

## Application Modules in Detail

### 1. Compliance Dashboard

**Route:** `/dashboard`

The Dashboard provides an executive-level compliance scorecard across all corporate entities for the current authenticated user.

**Metrics Cards:**
- **Total Tracked Tasks**: Aggregate count of all active compliance task records across selected entities.
- **Approved This Cycle**: Count of tasks reaching `APPROVED` status in the current reporting cycle.
- **Pending Review**: Count of tasks currently in `PENDING_REVIEW` state awaiting Checker action.
- **Overdue Tasks**: Count of tasks whose `dueDate` has passed and which are not yet in `APPROVED` status.

**Compliance Scorecard by Entity**: A structured breakdown table showing, for each corporate entity, the total task count, approved count, pending count, and a computed compliance percentage score.

**Overdue Task Watchlist**: A paginated table (5 records per page) listing all overdue tasks with record number, SOP title, entity, assigned Maker, assigned Checker, due date, and days overdue. Overdue tasks are highlighted with a red `OVERDUE` status badge.

**Entity Context Filter**: Corporate entity toggle pills at the top of the page dynamically filter all metrics and lists in real time without a page reload. A minimum of one entity must remain selected at all times.

**Loading States**: While API data is being fetched, all metric values and table rows are replaced with animated shimmer skeleton loaders, preventing layout shift.

---

### 2. SOP Management & Versioning

**Route:** `/sops`  
**Access:** `ADMIN` (full CRUD), `VIEWER` (read-only)

The SOP Management module is the master data layer of the platform. It defines the compliance calendar for each corporate entity.

**SOP List Table** (10 records per page):

| Column | Description |
| :--- | :--- |
| SOP Code | Human-readable unique identifier (e.g., `SOP-TAX-IN-001`) |
| Title | Descriptive name of the compliance obligation |
| Process Category | One of: Tax Compliance, Treasury & Cash Management, Financial Reporting, Fixed Assets, Payroll & Statutory |
| Entity | Corporate entity this SOP applies to |
| Frequency | Schedule frequency: Daily, Weekly, Monthly, Quarterly, Annual |
| Default Maker | Primary person responsible for task execution |
| Default Checker | Primary person responsible for task review and approval |
| Version | Integer version counter incremented on every structural edit |
| Status | `ACTIVE` or `INACTIVE` |
| Actions | View (eye icon), Edit (pencil icon, Admin only), Delete (trash icon, Admin only) |

**SOP Detail Modal (View):**
Opens a structured read-only drawer displaying all SOP fields including process category, frequency, due day offset, multi-user Maker pool, multi-user Checker pool, full operational description, and current version.

**Create / Edit SOP Form (Admin):**
A full inline form supporting:
- SOP Code (unique identifier)
- Title and operational description
- Process Category (dropdown)
- Corporate Entity (dropdown: CK India, CK US, CK UK, CK Australia)
- Frequency (dropdown: Daily, Weekly, Monthly, Quarterly, Annual)
- Due Day Offset (integer: number of days after period start that the task is due)
- Default Maker Pool (multi-user picker modal)
- Default Checker Pool (multi-user picker modal)

On save, the backend increments the `version` field atomically. All form validation errors are displayed inline. Success and error responses are surfaced as auto-vanishing toast notifications — no inline alert banners.

**SOP Deletion (Admin):**
Deletion is guarded by a `ConfirmationModal` requiring explicit confirmation before issuing the `DELETE /finsop/v1/sops/{id}` request. A success toast is shown upon completion.

**Filter Toolbar:**
- Corporate entity toggle pills for context filtering
- Process Category dropdown filter

---

### 3. Task Execution Workflow

**Route:** `/tasks`  
**Access:** All roles

The Task List is the operational execution layer. It displays all compliance tasks across the selected entities and allows Makers to submit tasks, Checkers to approve or reject them, and Admins to delete records.

**Filter Toolbar (7 independent dimensions):**

| Filter | Type | Options |
| :--- | :--- | :--- |
| Corporate Entity | Toggle Pills | CK India, CK US, CK UK, CK Australia |
| Due Date Range | Custom Date Picker | Preset: Today, Last 7 Days, This Week, This Month, This Quarter. Custom: interactive mini-calendar range |
| Process Category | Dropdown | Tax Compliance, Treasury & Cash Management, Financial Reporting, Fixed Assets, Payroll & Statutory |
| Status | Dropdown | Open, Pending Review, Approved, Rejected |
| Maker | Dropdown | Filtered list of active Maker users |
| Checker | Dropdown | Filtered list of active Checker users |

**Task Table** (10 records per page):

| Column | Description |
| :--- | :--- |
| Record No | Unique system-generated task reference (e.g., `SOP-TAX-IN-001-MONTHLY-2026-08`) |
| SOP | Title of the parent Standard Operating Procedure |
| Entity | Corporate entity this task belongs to |
| Period | The compliance cycle this task covers |
| Maker | Assigned Maker user name |
| Checker | Assigned Checker user name |
| Due Date | Statutory due date for task completion |
| Status | `StatusBadge` component rendering `OPEN`, `PENDING_REVIEW`, `APPROVED`, `REJECTED`, or `OVERDUE` |
| Actions | View eye-icon button. Admin delete button (Admin only). |

**Task Action Modal:**
Clicking the View button opens a full modal tailored to the current user's role and the task's current state:
- **Maker, task is OPEN**: Shows the task detail and a "Submit Task" form with a mandatory comment field. Submitting transitions the task to `PENDING_REVIEW`.
- **Checker, task is PENDING_REVIEW**: Shows submitted details, Maker's comment, and "Approve" and "Reject" buttons. Rejecting requires a mandatory corrective comment.
- **Segregation of Duties enforcement**: If the logged-in user is the task's Maker, the Approve/Reject buttons are hidden even if the user holds a Checker role. The backend independently validates this constraint and raises `SeparationOfDutyViolationException` as a second enforcement layer.
- **APPROVED / REJECTED tasks**: Shown read-only with full history.

**Admin Task Deletion:**
Admin users see a Delete button on every task row. Deletion is guarded by a `ConfirmationModal` and results in a permanent record removal followed by a success toast.

---

### 4. My Inbox — Actionable Workspace

**Route:** `/inbox`  
**Access:** `ADMIN`, `MAKER`, `CHECKER`, `MAKER_CHECKER`

The Inbox provides a focused, action-only workspace showing only the tasks that require the current user's immediate attention. It eliminates the noise of the full task list.

**Section 1 — Tasks to Approve (Checker view, 5 per page):**
Displays tasks in `PENDING_REVIEW` state where the logged-in user is the assigned Checker. Shows Record No, SOP, Entity, Period, submitting Maker, Due Date, Status, and a Review button.

**Section 2 — Tasks to Complete (Maker view, 5 per page):**
Displays tasks in `OPEN` or `REJECTED` state where the logged-in user is the assigned Maker. Shows Record No, SOP, Entity, Period, assigned Checker, Due Date, Status, and a Review button.

Clicking Review on any task in either section opens the same `TaskActionModal` described above, contextually configured for the correct action type.

Both sections are independently paginated (5 records per page each). If a section has no tasks, a clean empty state message is displayed.

---

### 5. Audit Trail & Event Logging

**Route:** `/audit`  
**Access:** All roles

The Audit Trail provides a tamper-evident, append-only log of every compliance action taken on the platform.

**Event Types Logged:**

| Action Code | Description |
| :--- | :--- |
| `SUBMIT_TASK` | Maker submitted a task for Checker review |
| `APPROVE_TASK` | Checker approved a submitted task |
| `REJECT_TASK` | Checker rejected a submitted task with corrective comment |
| `CREATE_SOP` | Admin created a new Standard Operating Procedure |
| `UPDATE_SOP` | Admin edited an existing SOP, triggering a version increment |
| `DELETE_SOP` | Admin deleted a Master SOP record |
| `DELETE_TASK` | Admin permanently deleted a task execution record |

**Audit Log Table** (10 records per page):

| Column | Description |
| :--- | :--- |
| Timestamp | UTC timestamp of the event |
| Actor Name | Full name of the user who performed the action |
| Actor Email | Email address of the actor |
| Action | Formatted action type badge (Submit Task, Approve Task, Reject Task, Create SOP, etc.) |
| Entity | The target entity type and ID affected by the action |

**Filter Toolbar:**
- Corporate entity toggle pills
- Custom AuditDateRangePicker with preset sidebar and interactive mini-calendar
- Action type filter dropdown

**Audit Detail Modal:**
Clicking any audit record opens a read-only detail drawer displaying the full event record, including actor details, action type, target entity, and timestamp.

**Persistence Architecture:**
Audit log records are written atomically within the same database transaction as the triggering task state change, using Spring's `@TransactionalEventListener(phase = BEFORE_COMMIT)`. This guarantees that an audit record is never orphaned from its corresponding task state change, and that if the task update fails and rolls back, the audit entry is also rolled back.

---

## Database Schema & Migration Strategy

Schema changes are managed exclusively through Flyway versioned migration scripts located in `src/main/resources/db/migration/`.

| Migration File | Purpose |
| :--- | :--- |
| `V1__init_schema.sql` | Creates all tables: `corporate_entities`, `users`, `sops`, `tasks`, `task_events`, `task_comments`, `audit_logs`. Defines all foreign key constraints, unique constraints, and enum-type check constraints. Seeds the five corporate users and four corporate entities. |
| `V1_1__audit_triggers.sql` | Adds database-level audit triggers to automatically capture `updated_at` timestamps on all mutable tables. |
| `V2__seed_dummy_sops_and_tasks.sql` | Seeds 15 realistic Master SOP definitions across all four corporate entities and five process categories. Seeds 60 compliance task instances across multiple statuses and periods, with 60 corresponding audit log entries. |

### Key Schema Design Decisions

**Idempotency Constraint:** The `tasks` table has a composite unique constraint `UNIQUE (sop_id, period_key)`. This is the database-level idempotency guarantee: the nightly scheduler can run any number of times without ever producing a duplicate task for the same SOP and period combination.

**Optimistic Locking:** The `tasks` entity carries a `@Version` field (`version INT`). Spring Data JPA uses this to detect concurrent modifications. If two Checkers attempt to approve the same task simultaneously, the second attempt throws an `OptimisticLockingFailureException` rather than silently overwriting, ensuring exactly-once state transition semantics.

**Task Event Log:** In addition to the `audit_logs` table, a separate `task_events` table stores the full before/after status transition for every task action (`from_status`, `to_status`, `actor_id`, `action`, `occurred_at`). This enables reconstructing the complete lifecycle history of any individual task.

---

## Getting Started & Local Development

### Prerequisites

- Node.js v18.x or higher
- JDK 17 or higher (OpenJDK or Eclipse Temurin)
- Apache Maven 3.8+
- Git

### Step 1: Clone the Repository

```bash
git clone https://github.com/tusquake/Prototype.git
cd Prototype
```

### Step 2: Start the Spring Boot Backend

The backend runs on H2 in-memory database by default with the `local` profile. Flyway migrations execute automatically on startup, creating the schema and seeding all 60 compliance tasks.

```bash
cd prototyping/backend
mvn spring-boot:run
```

The API server will be available at `http://localhost:8080/finsop/v1`.

### Step 3: Start the Vite Frontend Development Server

```bash
cd prototyping/frontend
npm install
npm run dev -- --port 3010
```

The React application will be available at `http://localhost:3010`.

### Step 4: Verify Production Build (optional)

```bash
cd prototyping/frontend
npm run build
```

This command compiles the production-optimized Vite bundle. A successful build with zero errors confirms the frontend codebase is free of compilation issues.

### Step 5: Full-Stack Local Start (Convenience Script)

```powershell
.\scripts\dev-start.ps1
```

---

## Complete API Reference

All endpoints are served under base path `/finsop/v1`.

### SOP Endpoints

| Method | Path | Auth Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/sops` | All | Retrieve list of SOPs filtered by entity codes |
| `POST` | `/sops` | Admin | Create a new Master SOP definition |
| `PUT` | `/sops/{id}` | Admin | Update SOP parameters and auto-increment version |
| `DELETE` | `/sops/{id}` | Admin | Delete (deactivate) a Master SOP |
| `GET` | `/sops/{id}` | All | Retrieve single SOP by ID |

### Task Endpoints

| Method | Path | Auth Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/tasks` | All | Retrieve tasks filtered by entity, status, maker, checker, date range |
| `PUT` | `/tasks/{id}/submit` | Maker | Submit an OPEN task for Checker review (transitions to PENDING_REVIEW) |
| `PUT` | `/tasks/{id}/approve` | Checker | Approve a PENDING_REVIEW task (transitions to APPROVED) |
| `PUT` | `/tasks/{id}/reject` | Checker | Reject a PENDING_REVIEW task with mandatory comment (transitions to REJECTED) |
| `DELETE` | `/tasks/{id}` | Admin | Permanently delete a task record |

### Dashboard Endpoints

| Method | Path | Auth Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/dashboard/summary` | All | Retrieve compliance metrics, entity scorecard, and overdue watchlist |

### Audit Log Endpoints

| Method | Path | Auth Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/audit-logs` | All | Retrieve immutable audit event log with entity and date filters |

### User Endpoints

| Method | Path | Auth Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/users` | All | Retrieve list of platform users for Maker/Checker assignment dropdowns |

### Health Check

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Returns `{"status":"UP"}`. Used by Cloud Run liveness and readiness probes. |

### Standard API Response Envelope

All responses are wrapped in a consistent `ApiResponse<T>` envelope:

```json
{
  "success": true,
  "data": { },
  "error": null,
  "timestamp": "2026-08-29T03:55:00Z"
}
```

Error responses follow the same envelope with `success: false` and a populated `error` object containing a `code` and `message`.

---

## Production Infrastructure

The production deployment targets Google Cloud Platform using direct source-based Cloud Run deployment (no local Docker builds required).

| Component | Service | Configuration |
| :--- | :--- | :--- |
| **Frontend Hosting** | GCP Cloud Run | Vite build served via Nginx container. Auto-scales to zero. |
| **Backend Services** | GCP Cloud Run | Spring Boot containers deployed via `gcloud run deploy --source`. |
| **Database** | GCP Cloud SQL (PostgreSQL 15) | Private IP only, no public internet exposure. 7-day PITR. Daily automated backups. |
| **Secret Management** | GCP Secret Manager | Database credentials, OAuth client secrets. Zero hardcoded secrets in source or containers. |
| **Edge Security** | GCP Cloud Armor | OWASP Top 10 managed ruleset, SQLi filter, XSS filter, rate limiting (100 req/min per IP). |
| **TLS Termination** | GCP Global Load Balancer | Google-managed TLS certificates. HTTP 80 permanent redirect to HTTPS 443. |
| **DNS** | GCP Cloud DNS | Authoritative DNS for `app.ravand.com` and `api.ravand.com`. |
| **Networking** | GCP VPC Private Services Access | Cloud SQL accessible only on private IP from Cloud Run services. |
| **Cron Jobs** | GCP Cloud Scheduler | Nightly midnight trigger (`0 0 * * *`) invoking the task generation engine. |

For detailed step-by-step deployment commands, see [docs/manual-gcloud-deployment.md](docs/manual-gcloud-deployment.md).

---

## Future Enhancement Roadmap

The following architectural improvements and functional modules are planned for upcoming releases. Items are ordered from highest-impact to longest-horizon.

---

### 1. Evidence Document Upload via GCP Cloud Storage Signed URLs

**Problem:** Makers currently submit tasks with text comments only. Statutory compliance obligations frequently require uploading supporting proof documents: GST acknowledgement receipts, PF challan confirmations, bank wire statements, balance sheet reconciliation workpapers, and tax authority portal screenshots.

**Proposed Architecture:**
- The backend issues a time-limited GCP Cloud Storage V4 Signed URL on behalf of the Maker (valid for 15 minutes, scoped to a single file path).
- The browser uploads the document directly to GCS over HTTPS without the binary payload transiting through the backend server, eliminating server-side memory pressure and upload size constraints.
- The backend stores the GCS object path, SHA-256 file hash, MIME type, and uploader identity in the `task_comments` or a new `task_attachments` table.
- A backend-side Cloud Storage event trigger (via Pub/Sub) verifies the upload completion and marks the attachment as confirmed.

**Benefits:** No file size limitations, no backend memory overhead, full GCS versioning and access control, immutable document trail.

---

### 2. Asynchronous Notification Pipeline via Google Cloud Pub/Sub

**Problem:** The platform currently has no outbound notification capability. Makers are unaware when a task is rejected. Checkers have no proactive alert when a task enters `PENDING_REVIEW`. Finance Managers have no overdue escalation signal.

**Proposed Architecture:**
- The `TaskNotificationEventListener` (currently a stub) publishes structured `ComplianceEvent` messages to a GCP Pub/Sub topic (`ravand-compliance-events`) on every task state transition.
- A dedicated Node.js Notification Worker Service (Cloud Run) subscribes to the topic and fan-outs delivery:
  - **Email**: SendGrid API for formal HTML notification emails with task summary links.
  - **Slack**: Incoming Webhook to the relevant entity's finance Slack channel.
  - **Microsoft Teams**: Adaptive Card messages via Teams webhook for enterprise environments.
- Dead-letter topic (`ravand-compliance-events-dlq`) captures failed delivery attempts for retry and monitoring.

**Event Payload Examples:**
- `TASK_SUBMITTED`: Notify assigned Checker that a task requires review.
- `TASK_APPROVED`: Notify Maker that their submission was accepted.
- `TASK_REJECTED`: Notify Maker with the Checker's corrective comment.
- `TASK_OVERDUE`: Notify Maker, Checker, and Finance Manager that a task has missed its due date.

---

### 3. Automated SLA Breach Monitoring & Multi-Level Escalation Engine

**Problem:** Overdue tasks are visible in the Dashboard watchlist only to users who actively log in to the platform. High-priority statutory filings (advance tax, annual returns) need proactive escalation before the breach, not after.

**Proposed Architecture:**
- A dedicated Spring Boot `SlaMonitoringService` runs on a configurable schedule (e.g., every 6 hours via `@Scheduled`).
- For each task approaching or past its `dueDate`, it computes urgency levels:
  - **Yellow Alert**: Task due within 48 hours and still in `OPEN` status.
  - **Red Alert**: Task past due date and not in `APPROVED` status.
  - **Escalation**: Task is 24+ hours overdue and no action has been taken since the last Red Alert.
- Escalation events are published to Pub/Sub and routed to Finance Directors and Compliance Officers (distinct notification subscriber group).
- Timezone-awareness: due dates are evaluated in the corporate entity's local timezone (IST for CK India, EST for CK US, GMT for CK UK, AEST for CK Australia) to prevent false positives for cross-timezone teams.

---

### 4. Full Google OAuth 2.0 / OpenID Connect Authentication with IAP

**Problem:** The current frontend uses a developer email-based role lookup for demonstration purposes. Production deployment requires verified, auditable identity via an enterprise Identity Provider.

**Proposed Architecture:**
- **GCP Identity-Aware Proxy (IAP)**: Place Cloud Run services behind IAP to enforce that only authenticated Google Workspace accounts within the `cloudkaptan.com` domain can access backend endpoints. Unauthenticated requests are automatically challenged before reaching the application layer.
- **Frontend OIDC Flow**: Implement the full Google OAuth 2.0 authorization code flow in the React SPA. Store the OIDC ID token in `sessionStorage` and attach it as a `Bearer` token on every API request.
- **Backend JWT Verification**: The API Gateway validates the `sub` claim of the Google ID token against the user registry to resolve the RBAC role. Token expiry, signature verification, and audience checks are enforced on every request.
- **Session Invalidation**: Logout clears the session token locally and invokes Google's token revocation endpoint.

---

### 5. Optimistic UI Updates & Real-Time Inbox Synchronization via Server-Sent Events

**Problem:** The inbox requires a manual page refresh to reflect actions taken by other users. In environments where multiple Checkers share a task pool, a task approved by one Checker remains visible to others until they refresh.

**Proposed Architecture:**
- The backend exposes a `GET /finsop/v1/events/inbox` endpoint implementing the Server-Sent Events (SSE) protocol.
- Each connected browser client receives a real-time event stream scoped to the current user's task assignments.
- When a task transitions state (any actor), the event listener pushes a `TaskStatusChangedEvent` over SSE to all connected clients with pending inbox items.
- The React frontend uses the native `EventSource` API to maintain the SSE connection and updates the inbox state in memory without a full refetch.
- **Optimistic UI**: Task action submissions apply state changes locally in the React component state before the API call completes, providing instant perceived responsiveness. On API failure, the state is rolled back and an error toast is displayed.

---

### 6. AI-Powered Compliance Anomaly Detection & Document OCR Parsing

**Problem:** Manual Checker review does not have computational assistance for detecting anomalous submission patterns or verifying that uploaded documents match the declared task values.

**Proposed Architecture:**
- The existing `ravand-ai-service` (Python / FastAPI stub) is expanded into a production microservice.
- **OCR Document Parsing**: On evidence upload completion (Pub/Sub trigger from GCS), the AI service extracts text from PDF and image documents using Google Cloud Document AI. For GST returns (GSTR-3B), it extracts declared tax liability values and cross-references them against task metadata.
- **Submission Pattern Anomaly Detection**: A simple statistical model flags tasks submitted outside normal operating hours (e.g., midnight on a Sunday for a task assigned to a Mumbai-based user in IST) or tasks completed in suspiciously short durations (e.g., a complex quarterly reconciliation completed in under 2 minutes).
- **Risk Scoring**: Each task submission is assigned a risk score (Low / Medium / High). High-risk tasks are surfaced to Admin and Checker users with a warning indicator in the Task Action Modal.
- **Non-Blocking Architecture**: All AI processing runs asynchronously via Pub/Sub. The task submission workflow is never delayed or blocked by AI processing times.

---

### 7. Multi-Entity User Access Matrix & Fine-Grained Entity Permissions

**Problem:** Current RBAC controls grant Makers and Checkers access to all corporate entities. In a multi-jurisdiction finance team, a CK India payroll specialist should not be able to view or action CK US treasury tasks.

**Proposed Architecture:**
- Extend the `users` table with a `UserEntityPermission` join table: `(user_id, entity_code, role)`.
- All API queries include a server-side entity filter resolving the intersection of the requested entities and the authenticated user's permitted entity codes.
- The SOP Management module restricts the entity dropdown during SOP creation to only those entities the admin has jurisdiction over.
- The frontend `EntityPills` component reflects only the user's permitted entities, not the global entity list.

---

### 8. SOP Version Diffing & Compliance Change Management

**Problem:** When an SOP is edited (e.g., due day offset changed, Checker pool updated), there is no mechanism for the compliance team to understand what changed, when, and by whom, beyond seeing the incremented version number.

**Proposed Architecture:**
- Store a full JSON snapshot of the SOP object in a `sop_versions` table on every `PUT /sops/{id}` call.
- Build a Version Diff Viewer in the SOP Management UI allowing admins to select any two version snapshots and view a field-by-field diff (highlighting changed values in red/green).
- Version history is displayed in the SOP Detail Modal as a reverse-chronological timeline.
- Newly generated tasks carry the `sopVersion` at the time of their creation, enabling future auditors to confirm which SOP definition governed a given compliance task.

---

### 9. Scheduled Compliance Reports & PDF Export

**Problem:** Finance Directors require monthly compliance status summaries for board-level reporting, currently satisfied only by manual screenshot extraction from the dashboard.

**Proposed Architecture:**
- A `ReportSchedulerService` runs on a configurable monthly cron (e.g., first business day of each month).
- Reports are generated server-side using a Java PDF library (Apache PDFBox or JasperReports), containing: entity-level compliance scorecard, overdue task listing, SLA breach statistics, and Maker/Checker performance metrics.
- Generated PDFs are stored in GCS and their access URLs are delivered to Finance Director email addresses via the Pub/Sub notification pipeline.
- On-demand report generation is also available via a `POST /finsop/v1/reports/generate` API endpoint, with the PDF URL returned asynchronously via webhook or email.

---

### 10. Terraform Infrastructure-as-Code for Full GCP Environment Provisioning

**Problem:** The current production deployment relies on manual `gcloud` CLI commands (documented in `docs/manual-gcloud-deployment.md`). This creates risk of configuration drift, undocumented changes, and non-repeatable environment setup.

**Proposed Architecture:**
- Migrate all GCP resource definitions (VPC, Cloud SQL, Cloud Run services, Cloud Armor policies, Load Balancer, DNS records, IAM bindings, Secret Manager secrets) into declarative Terraform HCL configurations under `/infra/terraform/`.
- Separate Terraform workspaces for `dev`, `staging`, and `prod` environments, each with environment-specific variable files.
- CI/CD pipeline runs `terraform plan` on pull request and `terraform apply` on merge to the target environment branch, providing peer-reviewed infrastructure changes.
- Terraform state stored in GCS backend bucket with state locking via Cloud Storage object locks.

---

## Repository Structure

```
/
|-- prototyping/
|   |-- backend/                        Spring Boot 3 backend service
|   |   |-- src/main/java/com/cloudkaptan/sop/
|   |   |   |-- config/                 CORS, Security configuration
|   |   |   |-- controller/             REST controllers: SOP, Task, Audit, Dashboard, Health, User
|   |   |   |-- domain/
|   |   |   |   |-- enums/              EntityCode, SopFrequency, SopStatus, TaskStatus, UserRole
|   |   |   |   |-- state/              State Pattern: TaskState, TaskContext, OpenState, PendingReviewState, ApprovedState, RejectedState
|   |   |   |   |-- strategy/          Strategy Pattern: RecurrenceStrategy, 5 frequency implementations, RecurrenceStrategyFactory
|   |   |   |-- dto/                    Request/Response DTOs with builder pattern
|   |   |   |-- entity/                 JPA entities: Sop, Task, User, AuditLog, TaskEvent, TaskComment, CorporateEntity
|   |   |   |-- event/                  TaskStatusChangedEvent (Spring application event)
|   |   |   |-- exception/              GlobalExceptionHandler + 4 typed domain exceptions
|   |   |   |-- listener/               TaskAuditTrailEventListener, TaskNotificationEventListener
|   |   |   |-- repository/            Spring Data JPA repositories + TaskInboxView projection
|   |   |   |-- service/               SopService, TaskWorkflowService, TaskSchedulerService, DashboardService, AuditLogService, UserService
|   |   |-- src/main/resources/
|   |   |   |-- application.yml         Base configuration
|   |   |   |-- application-local.yml   H2 dev profile
|   |   |   |-- application-prod.yml    PostgreSQL prod profile
|   |   |   |-- db/migration/           V1, V1_1, V2 Flyway SQL scripts
|   |   |-- pom.xml                     Maven build descriptor
|   |
|   |-- frontend/                       Vite + React 18 SPA
|   |   |-- src/
|   |   |   |-- auth/                   auth.js (session), rbac.js (permissions)
|   |   |   |-- components/             29 reusable UI components (see Component Library)
|   |   |   |-- pages/                  Dashboard, Tasks, Inbox, Sops, AuditLogs, Login, Callback
|   |   |   |-- services/               api.js (all API calls, mock data)
|   |   |   |-- App.jsx                 Route definitions and auth guard
|   |   |   |-- main.jsx                React application entry point
|   |   |   |-- index.css               Global design tokens and reset
|   |   |   |-- rbacConfig.js           Legacy role config
|   |   |-- vite.config.js              Vite dev server proxy and build config
|   |   |-- package.json
|   |
|   |-- scripts/                        Data seeding and utility scripts
|
|-- services/                           GCP microservice stubs (API Gateway, Access, Notification, AI)
|-- docs/                               Manual deployment guide, architecture documentation
|-- scripts/                            Deploy, destroy, seed shell scripts
|-- README.md                           This document
```
