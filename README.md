# RAVAND FinOps — Enterprise Finance SOP Management & Compliance Platform

RAVAND FinOps is a production-grade enterprise platform engineered for financial Standard Operating Procedure (SOP) management, statutory compliance tracking, and dual-control Maker-Checker governance across multi-entity corporate structures (CK India, CK US, CK UK, CK Australia).

The platform replaces manual spreadsheet-based compliance tracking with automated SOP definitions, version control, multi-frequency cycle generation (Monthly, Quarterly, Annual, Weekly, Daily), strict Segregation of Duties (SoD), immutable audit logging, and automated execution workflows.

---

## Technical Architecture & Specification

The platform is designed as a **production-ready modular monolith application** consisting of a Spring Boot 3 backend REST API engine and a React 18 Single Page Application (SPA) frontend.

```
                          USER BROWSER / CLIENT
                                    |
                                    v
            React 18 SPA Frontend (http://localhost:3010)
                                    |
                                    v  (Vite Reverse Proxy / API Gateway)
                                    |
          Spring Boot 3 REST API Engine (http://localhost:8080/finsop/v1)
                                    |
        +---------------------------+---------------------------+
        |                           |                           |
        v                           v                           v
  SOP Domain Engine        Task Execution Workflow       Audit & Event System
  [Full CRUD & Versioning]  [State Machine & SoD]         [Transactional Event Listener]
  [Recurrence Strategies]   [Idempotent Nightly Cron]     [Append-Only Logs & Comments]
        |                           |                           |
        +---------------------------+---------------------------+
                                    |
                                    v
             Relational Persistence (Cloud SQL PostgreSQL / H2)
             Flyway Migrations: V1__init_schema, V1_1, V2__seed
```

### Technology Stack

| Layer | Component | Description |
| :--- | :--- | :--- |
| **Frontend SPA** | React 18, Vite 5, Vanilla CSS Modules | Modular SPA featuring CSS-scoped styling, full-width top header strips, floating auto-dismissing toasts, custom select dropdowns, mini-calendar date pickers, and table pagination. |
| **Backend Core** | Spring Boot 3.2, Java 17, Jakarta EE, Hibernate ORM | Enterprise REST API engine implementing Gang of Four State and Strategy design patterns, Spring Application Events, and JPA persistence. |
| **Database & Migrations** | PostgreSQL 15 (prod) / H2 in-memory (local dev), Flyway | Versioned database schema migrations (`V1__init_schema.sql`, `V2__seed_dummy_sops_and_tasks.sql`) maintaining constraints and pre-populating 60 compliance tasks & 60 audit logs. |
| **Security & Access** | Spring Security, RBAC Engine | Role-Based Access Control enforcing `ADMIN`, `MAKER`, `CHECKER`, `MAKER_CHECKER`, and `VIEWER` permissions at route and method levels. |

---

## Backend Architecture & Core Design Patterns

The backend applies enterprise design patterns to guarantee data integrity, zero-duplicate scheduling, and strict Segregation of Duties (SoD).

### 1. State Pattern — Task Lifecycle Enforcement

Task state transitions are governed by the **State Pattern** (`TaskState` interface). Each task status is represented by a discrete state class enforcing permitted transitions:

```
TaskState (interface)
    |-- OpenState          : permits submit(); blocks approve() and reject()
    |-- PendingReviewState : permits approve() and reject(); blocks submit()
    |-- ApprovedState      : terminal state; all further transitions blocked
    |-- RejectedState      : permits resubmit via submit(); blocks approve() and reject()
```

- **Segregation of Duties (SoD)**: The `PendingReviewState` class validates that the user attempting approval or rejection is NOT the same user who submitted the task. If a Maker attempts to approve their own submission, a `SeparationOfDutyViolationException` is thrown.
- **State Machine Context**: The `TaskContext` class maintains runtime state references and delegates workflow calls.

### 2. Strategy Pattern — Multi-Frequency Recurrence Engine

SOP frequency schedules are computed using the **Strategy Pattern** (`RecurrenceStrategy` interface):

```
RecurrenceStrategy (interface)
    |-- DailyRecurrenceStrategy      : periodKey = "DAILY-YYYY-MM-DD"
    |-- WeeklyRecurrenceStrategy     : periodKey = "WEEKLY-YYYY-WNN"
    |-- MonthlyRecurrenceStrategy    : periodKey = "MONTHLY-YYYY-MM"
    |-- QuarterlyRecurrenceStrategy  : periodKey = "QUARTERLY-YYYY-QN"
    |-- AnnualRecurrenceStrategy     : periodKey = "ANNUAL-YYYY"
```

The `RecurrenceStrategyFactory` dynamically resolves the appropriate frequency calculator based on the SOP's `frequency` property.

### 3. Idempotent Scheduled Task Generation

The `TaskSchedulerService` runs on a daily midnight cron schedule (`app.task-scheduler.cron`). For each active SOP:
1. Calculates the current period key via its `RecurrenceStrategy`.
2. Checks `taskRepository.existsBySop_SopIdAndPeriodKey(sopId, periodKey)`.
3. If missing, generates a new task in `OPEN` state with statutory due date offsets.
4. Database unique constraint `UNIQUE (sop_id, period_key)` acts as a secondary failsafe guaranteeing zero duplicate tasks.

### 4. Event-Driven Audit & Event Logging

All workflow operations publish a `TaskStatusChangedEvent`. The `TaskAuditTrailEventListener` processes events during transaction commit (`@TransactionalEventListener(phase = BEFORE_COMMIT)`), persisting:
- `TaskEvent`: Lifecycle state transition record (`fromStatus`, `toStatus`, `actor`, timestamp).
- `TaskComment`: User comments submitted during review/rejection.
- `AuditLog`: Compliance audit log entry with correlation ID.

---

## Detailed API Reference & Mapping

Every backend REST endpoint is mapped below with its specific operational purpose, HTTP method, parameters, payload schemas, and target UI trigger.

### Base Path: `/finsop/v1`

---

### 1. SOP Management APIs (`/sops`)

#### `GET /finsop/v1/sops`
- **Purpose**: Retrieves all Master Standard Operating Procedure definitions, filtered optionally by corporate entity.
- **Query Parameters**:
  - `entities` (optional): List of entity codes (`CK_INDIA`, `CK_US`, `CK_UK`, `CK_AUSTRALIA`).
- **UI Trigger**: Invoked on page load in `Sops.jsx` and when toggling corporate entity pills.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "sopId": "11111111-1111-1111-1111-111111111111",
        "sopCode": "SOP-TAX-IN-001",
        "title": "Advance Tax Estimation & Filing",
        "description": "Quarterly estimation and payment of corporate advance tax",
        "processCategory": "Tax Compliance",
        "entityCode": "CK_INDIA",
        "entityName": "CK India",
        "frequency": "QUARTERLY",
        "dueDayOffset": 15,
        "version": 1,
        "defaultMakerNames": ["Tushar Seth", "Vivek Raj"],
        "defaultCheckerNames": ["Mainak Gupta", "Manoj Agarwal"]
      }
    ],
    "message": "Operations successful"
  }
  ```

#### `POST /finsop/v1/sops`
- **Purpose**: Creates a new Master Standard Operating Procedure. Restrictive to `ADMIN` role.
- **Request Body (`CreateSopRequest`)**:
  ```json
  {
    "sopCode": "SOP-GST-IN-004",
    "title": "Annual GST Return Filing (GSTR-9)",
    "description": "Annual reconciliation and filing of GST return",
    "processCategory": "Tax Compliance",
    "entityCode": "CK_INDIA",
    "frequency": "ANNUAL",
    "dueDayOffset": 31,
    "defaultMakerIds": ["usr-tushar"],
    "defaultCheckerIds": ["usr-mainak"]
  }
  ```
- **UI Trigger**: Invoked when submitting the Create SOP form in `Sops.jsx`.
- **Success Response (201 Created)**: Returns the created `SopDto` with initialized version 1.

#### `PUT /finsop/v1/sops/{id}`
- **Purpose**: Updates an existing Master SOP definition and automatically increments its version counter (`v1` -> `v2`). Restrictive to `ADMIN` role.
- **Path Parameter**: `id` (UUID of the SOP to modify).
- **Request Body**: `CreateSopRequest` payload containing updated fields.
- **UI Trigger**: Invoked when submitting changes in the Edit SOP modal in `Sops.jsx`.
- **Success Response (200 OK)**: Returns updated `SopDto` with incremented `version`.

#### `DELETE /finsop/v1/sops/{id}`
- **Purpose**: Archives or permanently removes a Master SOP definition. Restrictive to `ADMIN` role.
- **Path Parameter**: `id` (UUID of the target SOP).
- **UI Trigger**: Invoked after confirming deletion in the `ConfirmationModal` in `Sops.jsx`.
- **Success Response (200 OK)**: Returns confirmation message and removes record.

---

### 2. Task Execution Workflow APIs (`/tasks`)

#### `GET /finsop/v1/tasks`
- **Purpose**: Retrieves all compliance tasks filtered by entity, status, maker, checker, and date range.
- **Query Parameters**:
  - `entities`: List of entity codes.
  - `status` (optional): Filter by `OPEN`, `PENDING_REVIEW`, `APPROVED`, or `REJECTED`.
  - `makerId` (optional): Filter by assigned Maker user ID.
  - `checkerId` (optional): Filter by assigned Checker user ID.
- **UI Trigger**: Invoked in `Tasks.jsx` on page mount and whenever toolbar filters or date range pickers change.
- **Success Response (200 OK)**: Returns array of `TaskDto` objects including days overdue calculation.

#### `GET /finsop/v1/tasks/inbox`
- **Purpose**: Retrieves paginated action items specifically assigned to the active user for the Inbox workspace.
- **Query Parameters**:
  - `entities`: Filter entity codes.
  - `status`: `PENDING_REVIEW` (for Checker section) or `OPEN`/`REJECTED` (for Maker section).
  - `userId`: ID of the authenticated user.
  - `page`: Page index (0-indexed).
  - `size`: Items per page (default: 5).
- **UI Trigger**: Invoked in `Inbox.jsx` for populating "Tasks to Approve" and "Tasks to Complete" tables.
- **Success Response (200 OK)**: Returns Spring Data `Page<TaskInboxView>` projection.

#### `PUT /finsop/v1/tasks/{id}/submit`
- **Purpose**: Submits an `OPEN` or `REJECTED` task for review. Transitions state to `PENDING_REVIEW`. Restrictive to Maker role.
- **Path Parameter**: `id` (Task UUID).
- **Request Body (`TaskActionRequest`)**:
  ```json
  {
    "actorId": "usr-tushar",
    "comment": "Completed GST reconciliation. Supporting workpapers verified."
  }
  ```
- **UI Trigger**: Invoked when clicking "Submit Task" inside `TaskActionModal.jsx`.
- **Success Response (200 OK)**: Returns updated `TaskDto` in `PENDING_REVIEW` state.

#### `PUT /finsop/v1/tasks/{id}/approve`
- **Purpose**: Validates and approves a task in `PENDING_REVIEW` state. Transitions state to `APPROVED`. Restrictive to Checker role. Enforces SoD.
- **Path Parameter**: `id` (Task UUID).
- **Request Body (`TaskActionRequest`)**:
  ```json
  {
    "actorId": "usr-mainak",
    "comment": "Tax calculations and challan receipts verified. Approved."
  }
  ```
- **UI Trigger**: Invoked when clicking "Approve Task" inside `TaskActionModal.jsx`.
- **Success Response (200 OK)**: Returns updated `TaskDto` in `APPROVED` state.

#### `PUT /finsop/v1/tasks/{id}/reject`
- **Purpose**: Rejects a task in `PENDING_REVIEW` state with mandatory corrective feedback. Transitions state to `REJECTED`. Restrictive to Checker role.
- **Path Parameter**: `id` (Task UUID).
- **Request Body (`TaskActionRequest`)**:
  ```json
  {
    "actorId": "usr-mainak",
    "comment": "Challan deposit receipt missing. Please attach proof and resubmit."
  }
  ```
- **UI Trigger**: Invoked when clicking "Reject Task" inside `TaskActionModal.jsx`.
- **Success Response (200 OK)**: Returns updated `TaskDto` in `REJECTED` state.

#### `DELETE /finsop/v1/tasks/{id}`
- **Purpose**: Deletes a task instance. Restrictive to `ADMIN` role.
- **Path Parameter**: `id` (Task UUID).
- **UI Trigger**: Invoked when clicking Delete button in `Tasks.jsx` or `Inbox.jsx` table row.
- **Success Response (200 OK)**: Removes task record and publishes audit log entry.

---

### 3. Dashboard Metrics API (`/dashboard`)

#### `GET /finsop/v1/dashboard/summary`
- **Purpose**: Computes aggregate metrics, compliance scorecards per entity, and overdue watchlists.
- **Query Parameters**:
  - `entities`: Active entity filter codes.
  - `userId`: Authenticated user ID.
- **UI Trigger**: Invoked in `Dashboard.jsx` on mount and entity selection toggles.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "metrics": {
        "trackedTasks": 60,
        "approvedThisCycle": 28,
        "pendingReview": 14,
        "overdue": 8
      },
      "scorecard": [
        { "entityCode": "CK_INDIA", "entityName": "CK India", "totalTasks": 24, "approvedTasks": 12, "pendingTasks": 6, "compliancePercentage": 85.5 }
      ],
      "overdueList": [ ]
    }
  }
  ```

---

### 4. Audit Trail API (`/audit-logs`)

#### `GET /finsop/v1/audit-logs`
- **Purpose**: Fetches immutable audit log records.
- **UI Trigger**: Invoked in `AuditLogs.jsx` on page mount.
- **Success Response (200 OK)**: Returns array of `AuditLogDto` items sorted by timestamp descending.

---

### 5. Access & User APIs (`/access`)

#### `GET /finsop/v1/access/users`
- **Purpose**: Fetches active user profiles for Maker/Checker user picker dropdowns.
- **UI Trigger**: Invoked in `Sops.jsx` user selection modals and `Tasks.jsx` toolbar filters.

#### `GET /finsop/v1/access/me`
- **Purpose**: Fetches authenticated user profile and assigned role (`ADMIN`, `MAKER`, `CHECKER`, `VIEWER`).
- **Query Parameter**: `email` (defaults to active session email).
- **UI Trigger**: Invoked on session initialization in `auth.js`.

---

### 6. System Health Check API (`/health`)

#### `GET /finsop/v1/health`
- **Purpose**: Liveness and readiness health monitoring.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "status": "UP",
      "service": "FinSOP Spring Boot Backend Engine",
      "timestamp": "2026-08-29T04:20:00Z"
    }
  }
  ```

---

## Core Application Modules & Capabilities

### 1. Compliance Dashboard (`/dashboard`)
- **Executive Metrics**: Summary cards displaying Tracked Tasks, Approved This Cycle, Pending Review, and Overdue Tasks.
- **Compliance Scorecard**: Entity-by-entity breakdown calculating real-time compliance completion percentages.
- **Overdue Watchlist**: Paginated table highlighting past-due tasks with days overdue counters.
- **Entity Context Filter**: `EntityPills.jsx` component toggling context across CK India, CK US, CK UK, and CK Australia.

### 2. Master SOP Management (`/sops`)
- **Lifecycle Management**: Full CRUD capabilities allowing authorized Admins to create, view, edit, and delete SOPs.
- **Automatic Versioning**: Editing an SOP increments its `version` counter (`v1` -> `v2`), preserving historical integrity.
- **Maker & Checker User Pools**: Assign default multi-user pools for Maker execution and Checker review.

### 3. Task Execution Workflow (`/tasks`)
- **Multi-Vector Toolbar**: 7-dimension filter toolbar (Entity, Status, Process Category, Maker, Checker, Date Range Picker).
- **Interactive Mini-Calendar Date Range Picker**: Custom component with preset sidebar (Today, 7 Days, Week, Month, Quarter) and interactive mini-calendar grid.
- **Action Modal**: Contextual modal enforcing SoD and handling submission, approval, and rejection with mandatory comments.

### 4. Actionable My Inbox (`/inbox`)
- **Split Workspaces**:
  - **Tasks to Approve**: Dedicated section for Checkers displaying `PENDING_REVIEW` items.
  - **Tasks to Complete**: Dedicated section for Makers displaying `OPEN` or `REJECTED` items.
- **Independent Pagination**: 5 items per page per section.

### 5. Immutable Audit Log (`/audit`)
- **Event History**: Log of all platform events (`SUBMIT_TASK`, `APPROVE_TASK`, `REJECT_TASK`, `CREATE_SOP`, `UPDATE_SOP`, `DELETE_SOP`, `DELETE_TASK`).
- **Audit Detail Drawer**: Read-only metadata viewer displaying actor name, email, action type, entity ID, and UTC timestamp.

### 6. Responsive UI & Design System
- **Full-Width Top Header Bar**: Top navigation bar with greyish card background (`#f8fafc`) and bottom border spanning 100% viewport width.
- **Auto-Dismissing Toast Notifications**: Top-right floating alerts featuring a 3.5-second auto-vanishing timer.
- **Action Button Icons**: Clean SVG icons (View eye icon, Edit pencil icon, Delete trash icon).

---

## Database Schema & Flyway Migrations

Database migrations are managed via Flyway SQL scripts located in `src/main/resources/db/migration/`:

```sql
-- Standard Operating Procedures
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

## Local Development Instructions

### 1. Start Spring Boot Backend
```bash
cd prototyping/backend
mvn spring-boot:run
```
Available at `http://localhost:8080/finsop/v1`.

### 2. Start Vite React Frontend
```bash
cd prototyping/frontend
npm install
npm run dev -- --port 3010
```
Available at `http://localhost:3010`.

---

## Future Enhancements Roadmap

1. **Evidence Document Upload via GCP Cloud Storage Signed URLs**: Upload PDF receipts directly to GCS buckets via V4 Signed URLs with SHA-256 integrity verification.
2. **Asynchronous Notification Pipeline via GCP Pub/Sub**: Publish event topics (`TASK_OVERDUE`, `SUBMISSION_PENDING`) for delivery via SendGrid Email, Slack Webhooks, and Microsoft Teams.
3. **Automated SLA Breach Monitoring & Escalation Engine**: Background scheduler computing urgency levels and escalating overdue tasks to Finance Directors.
4. **Full Google OAuth 2.0 / OpenID Connect with IAP**: Enforce identity verification via Google Workspace accounts.
5. **Real-Time Inbox Synchronization via Server-Sent Events (SSE)**: Live inbox updates pushed to active Checkers/Makers without page refreshes.
6. **AI Anomaly Detection & OCR Document Parsing**: Non-blocking Python service using Document AI to parse tax returns (GSTR-3B, Form 941, W2).
