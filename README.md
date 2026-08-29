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
| **Frontend SPA** | React 18, Vite 5, Vanilla CSS Modules, GCS Bucket | Modular SPA hosted on Google Cloud Storage (GCS) Bucket with Cloud CDN edge distribution, featuring full-width top header strips, floating toasts, custom select dropdowns, mini-calendar date pickers, and table pagination. |
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

## Detailed Future Enhancements & Architectural Roadmap

The following detailed architectural enhancements and functional modules are specified for upcoming platform releases:

---

### 1. Evidence Document Upload via GCP Cloud Storage V4 Signed URLs

**Problem Statement:**  
Compliance tasks currently allow text comments during submission. However, statutory obligations (such as GST return filings, PF deposit confirmations, quarterly income tax payments, and treasury bank wire reconciliations) require verifiable documentary evidence. Uploading large binary files (PDFs, Excel workpapers, image receipts) directly through the application server creates memory bottlenecks, upload timeout risks, and high server bandwidth costs.

**Proposed Architecture & Flow:**

```
Browser / React SPA                  Spring Boot Backend                  Google Cloud Storage (GCS)
       |                                      |                                       |
       |--- 1. Request Signed Upload URL ---->|                                       |
       |    (taskId, fileName, mimeType)      |-- 2. Generate V4 Signed URL --------->|
       |<-- 3. Return Signed URL & Hash ------|   (Expires in 15 mins, scoped PUT)   |
       |                                                                              |
       |------------------------ 4. Direct HTTPS PUT (Binary Payload) --------------->|
       |<----------------------- 5. HTTP 200 OK (GCS Confirmation) -------------------|
       |                                                                              |
       |--- 6. Confirm Upload Metadata ------>|                                       |
       |    (gcsPath, sha256Hash, fileSize)   |-- 7. Persist Task Attachment Record  |
```

**Technical Specifications:**
- **Signed URL Generation**: The backend uses `Storage.signUrl()` from the Google Cloud Client Library to generate a short-lived (15-minute validity) V4 Signed URL restricted to HTTP `PUT` requests for a specific object path (`gs://ravand-compliance-evidence/{entity_code}/{year}/{taskId}/{fileName}`).
- **SHA-256 Checksum Verification**: The browser computes a SHA-256 hash of the binary file prior to upload and sends the hash header (`x-goog-hash: sha256=...`) to GCS. GCS validates file integrity upon upload completion.
- **Database Schema Extension**:
  ```sql
  CREATE TABLE task_attachments (
      attachment_id VARCHAR(64) PRIMARY KEY,
      task_id VARCHAR(64) REFERENCES tasks(task_id),
      file_name VARCHAR(255) NOT NULL,
      gcs_path VARCHAR(512) NOT NULL,
      file_size_bytes BIGINT NOT NULL,
      mime_type VARCHAR(128) NOT NULL,
      sha256_hash VARCHAR(64) NOT NULL,
      uploaded_by VARCHAR(64) REFERENCES users(user_id),
      uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  ```
- **Compliance Benefit**: Ensures 100% tamper-proof storage of statutory compliance proof without burdening application memory.

---

### 2. Asynchronous Notification Pipeline via Google Cloud Pub/Sub

**Problem Statement:**  
Platform workflows currently rely on active user polling. When a task is rejected by a Checker, the Maker is unaware until they manually log in. When a task enters `PENDING_REVIEW`, the Checker receives no proactive notification. Critical statutory deadlines risk being missed due to communication gaps.

**Proposed Architecture & Pipeline:**

```
Spring Boot Task Engine               GCP Pub/Sub Topic                    Notification Worker (Node.js)
       |                                      |                                         |
       |-- Publish TaskStatusChangedEvent --->| (ravand-compliance-events)              |
       |   (taskId, action, actor, status)    |                                         |
                                              |================ Push Subscription =====>|
                                                                                        |-- SendGrid Email
                                                                                        |-- Slack Webhook
                                                                                        |-- MS Teams Card
```

**Technical Specifications:**
- **Event Decoupling**: The Spring `TaskAuditTrailEventListener` publishes structured JSON events to the GCP Pub/Sub topic `ravand-compliance-events` upon transaction commit (`@TransactionalEventListener(phase = AFTER_COMMIT)`).
- **Pub/Sub Topic & Subscriptions**:
  - `ravand-compliance-events` (Main Event Topic)
  - `ravand-email-subscriber` (Push Subscription to Email Worker)
  - `ravand-slack-subscriber` (Push Subscription to Slack Worker)
  - `ravand-compliance-events-dlq` (Dead-Letter Queue for failed delivery attempts after 5 retries with exponential backoff)
- **Multi-Channel Delivery Routing**:
  - **Email (SendGrid)**: Formatted HTML emails with direct links to the relevant task in the application.
  - **Slack**: Incoming Webhook integration posting structured message cards to entity-specific channels (`#finops-india-compliance`, `#finops-us-compliance`).
  - **Microsoft Teams**: Adaptive Card JSON payloads containing task details, due date, and action buttons.

---

### 3. Automated SLA Breach Monitoring & Multi-Level Escalation Engine

**Problem Statement:**  
Static due dates are insufficient for high-stakes corporate compliance. If a statutory tax filing (e.g., Advance Tax or GSTR-3B) remains in `OPEN` status 24 hours before the due date, executive leadership requires immediate visibility to prevent statutory penalties and regulatory notices.

**Proposed Architecture & Escalation Matrix:**

```
                                TIME TO DUE DATE
+-------------------------------------------------------------------------------+
|  > 48 Hours            |  24 - 48 Hours           |  < 24 Hours / Overdue     |
|  GREEN (Normal)        |  YELLOW (Warning)        |  RED (Escalation)         |
|  Standard Dashboard    |  Maker & Checker Alert   |  Finance Director Alert   |
+-------------------------------------------------------------------------------+
```

**Technical Specifications:**
- **Timezone-Aware SLA Calculation**: The `SlaMonitoringService` runs every 4 hours via Spring `@Scheduled` or GCP Cloud Scheduler. It computes deadline proximity in the corporate entity's local timezone (IST for CK India, EST for CK US, GMT for CK UK, AEST for CK Australia).
- **Escalation Logic**:
  - **Level 1 (Yellow Alert - 48h prior)**: Sends reminder notification to assigned Maker and Checker pools.
  - **Level 2 (Orange Alert - 24h prior)**: Highlights task row in red on Dashboard and triggers daily summary notifications.
  - **Level 3 (Red Escalation - Past Due Date)**: Automatically reassigns task urgency, logs an SLA Breach Audit Event, and sends urgent escalation emails to the Finance Director and Chief Compliance Officer.
- **Database Schema Extension**:
  ```sql
  ALTER TABLE tasks ADD COLUMN sla_status VARCHAR(32) DEFAULT 'NORMAL';
  ALTER TABLE tasks ADD COLUMN escalation_level INT DEFAULT 0;
  ALTER TABLE tasks ADD COLUMN last_escalated_at TIMESTAMP;
  ```

---

### 4. Enterprise Single Sign-On (SSO) via Google OAuth 2.0 / OpenID Connect & GCP IAP

**Problem Statement:**  
The development prototype uses session-based role lookups. Enterprise production environments require integration with central Identity Providers (IdP) enforcing Multi-Factor Authentication (MFA), SAML 2.0 / OIDC protocols, and centralized access revocation.

**Proposed Architecture & Security Flow:**
- **GCP Identity-Aware Proxy (IAP)**: Sits at the HTTPS Load Balancer layer, verifying user identity before traffic reaches Cloud Run backend containers. Zero unauthenticated traffic enters the private network.
- **OIDC JWT Validation**: The backend Spring Security filter chain validates incoming Google OpenID Connect JWT tokens:
  ```java
  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
      http.oauth2ResourceServer(oauth2 -> oauth2
          .jwt(jwt -> jwt.decoder(jwtDecoder())));
      return http.build();
  }
  ```
- **Claim-to-Role Mapping**: Custom `JwtAuthenticationConverter` maps Google Workspace group memberships (e.g., `finops-admins@cloudkaptan.com`, `finops-checkers@cloudkaptan.com`) directly to Spring Security authorities (`ROLE_ADMIN`, `ROLE_CHECKER`).

---

### 5. Real-Time Inbox Synchronization via Server-Sent Events (SSE) & Optimistic UI Updates

**Problem Statement:**  
In multi-user enterprise environments, multiple Checkers may review tasks simultaneously. If Checker A approves a task, Checker B's screen still shows the task as `PENDING_REVIEW` until a manual page refresh, leading to duplicate work attempts.

**Proposed Architecture & Implementation:**
- **Server-Sent Events (SSE)**: The backend exposes an SSE event stream at `/finsop/v1/events/inbox/{userId}`.
  ```java
  @GetMapping(value = "/events/inbox/{userId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public SseEmitter streamInboxEvents(@PathVariable String userId) {
      SseEmitter emitter = new SseEmitter(30 * 60 * 1000L);
      sseService.registerEmitter(userId, emitter);
      return emitter;
  }
  ```
- **Client-Side EventSource**: The React SPA opens an `EventSource` connection on mount. When a `TASK_UPDATED` event is received, React Query / local component state automatically updates the Inbox task list without full page reloads.
- **Optimistic UI with Rollback**: When a user submits or approves a task, the UI immediately updates local state. If the API request subsequently fails, the state automatically rolls back and an error toast notification is displayed.

---

### 6. AI-Powered Compliance Anomaly Detection & Document OCR Parsing

**Problem Statement:**  
Checkers currently review submitted tasks and documents manually. There is no automated assistance to verify that tax liability numbers match uploaded GST receipts or to flag suspicious submission patterns (such as a complex annual filing completed in 30 seconds at 3 AM).

**Proposed Architecture & Machine Learning Pipeline:**

```
Uploaded Evidence PDF                Document AI OCR                     FastAPI AI Service
       |                                    |                                    |
       |--- 1. Trigger Async OCR ---------->|                                    |
       |                                    |--- 2. Extract Text & Key-Values ->|
                                                                                 |-- 3. Cross-Check Math
                                                                                 |-- 4. Detect Time Anomalies
                                                                                 |-- 5. Return Risk Score
```

**Technical Specifications:**
- **Google Cloud Document AI**: Uses Specialized Processors (Expense Processor, Tax Form Processor) to extract key-value pairs (Total Tax Paid, Filing Date, Taxpayer Identification Number) from uploaded PDF receipts.
- **Python FastAPI AI Microservice (`ravand-ai-service`)**:
  - **Value Matching Engine**: Compares extracted document values against task metadata. If declared GST liability in the task is $50,000 but the uploaded receipt confirms $40,000, an anomaly alert is raised.
  - **Execution Velocity Anomaly Model**: Flags task completions that deviate significantly from historical baseline completion times for that SOP category.
- **Risk Score Indicator**: Outputs a Risk Score (`LOW`, `MEDIUM`, `HIGH`) displayed on the `TaskActionModal` to assist Checker decision-making.

---

### 7. Multi-Entity User Access Matrix & Fine-Grained Entity Permissions

**Problem Statement:**  
Currently, user roles (`MAKER`, `CHECKER`) apply globally across all entities. In multinational organizations, a finance officer in India should be restricted to `CK_INDIA` compliance tasks and should not have visibility into `CK_US` or `CK_UK` statutory filings.

**Proposed Architecture & Schema:**
- **Join Table Schema**:
  ```sql
  CREATE TABLE user_entity_permissions (
      permission_id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) REFERENCES users(user_id),
      entity_code VARCHAR(32) NOT NULL,
      role VARCHAR(32) NOT NULL,
      CONSTRAINT uq_user_entity_role UNIQUE (user_id, entity_code, role)
  );
  ```
- **Dynamic Data Filtering**: Spring Data JPA specifications dynamically inject entity permission predicates into all database queries based on the authenticated user's permission matrix:
  ```java
  public static Specification<Task> filterByPermittedEntities(List<EntityCode> userPermittedEntities) {
      return (root, query, cb) -> root.get("entity").in(userPermittedEntities);
  }
  ```

---

### 8. SOP Version Diffing & Change Audit History

**Problem Statement:**  
When an Admin edits an SOP (e.g., changing the due day offset from 15 to 20 days or altering default Checker assignments), the version counter increments, but compliance auditors cannot visually inspect what changed between `v1` and `v2`.

**Proposed Architecture:**
- **SOP Version Snapshot Table**:
  ```sql
  CREATE TABLE sop_version_snapshots (
      snapshot_id VARCHAR(64) PRIMARY KEY,
      sop_id VARCHAR(64) REFERENCES sops(sop_id),
      version INT NOT NULL,
      snapshot_json TEXT NOT NULL,
      created_by VARCHAR(64) REFERENCES users(user_id),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  ```
- **Visual Diff Viewer Component**: A React component rendering side-by-side JSON/field diffs, highlighting added, modified, or deleted SOP parameters in green and red.
- **Task-to-Version Association**: Each generated task stores `sop_version`, anchoring the exact SOP definition rules that governed that specific compliance cycle for legal auditability.

---

### 9. Automated Compliance Reporting & Board-Level PDF Export Engine

**Problem Statement:**  
Executive leadership and board members require periodic compliance audit reports (Monthly Compliance Summary, Annual Statutory Audit Book). Currently, compiling these reports requires manual data extraction and spreadsheet formatting.

**Proposed Architecture:**
- **Report Generation Engine**: A Spring Boot service utilizing Apache PDFBox or JasperReports to compile structured, publication-ready PDF documents.
- **Report Contents**:
  - Executive Compliance Summary (Completion rates, overdue trends per entity).
  - Detailed Statutory Task Audit Table (Record numbers, completion timestamps, Maker/Checker identities, approval comments).
  - SLA Breach & Exception Log.
- **Scheduled & On-Demand Delivery**:
  - Monthly cron schedule generating and emailing PDFs on the 1st of every month to the Board of Directors.
  - REST Endpoint `POST /finsop/v1/reports/export` generating on-demand downloadable PDFs for specific date ranges.

---

### 10. Infrastructure-as-Code (IaC) via Terraform & Automated CI/CD Pipeline

**Problem Statement:**  
Manual cloud infrastructure configuration introduces environment drift, security misconfigurations, and non-repeatable deployments across staging and production environments.

**Proposed Architecture & HCL Directory Structure:**
```
/infra/terraform/
|-- main.tf                   Main GCP Provider & Module declarations
|-- variables.tf              Environment input variables (project_id, region)
|-- outputs.tf                Output values (Cloud Run URL, Cloud SQL IP)
|-- modules/
    |-- vpc/                  Private VPC & Serverless Connector
    |-- cloud_sql/            PostgreSQL 15 HA Instance & Database
    |-- cloud_run/            Backend & Frontend Serverless Containers
    |-- cloud_armor/          WAF Security Policies & OWASP Rules
    |-- secret_manager/       Encrypted Secret Storage
```

- **CI/CD Automation (GitHub Actions)**:
  - **Pull Request Trigger**: Executes `terraform plan` and posts the spec diff as a pull request comment.
  - **Merge to Main Trigger**: Executes `terraform apply` to automatically update staging/production GCP infrastructure.
  - **State Lock Management**: Terraform state stored in Google Cloud Storage bucket with object versioning and locking enabled.
