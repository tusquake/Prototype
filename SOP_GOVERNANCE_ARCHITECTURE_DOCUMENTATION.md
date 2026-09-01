# FinSOP Enterprise System Architecture & Governance Enhancements Documentation

## 📌 Executive Summary

This document provides a comprehensive technical overview of the enterprise-grade enhancements implemented in the **FinSOP Financial Operations & Compliance Tracker**. The system has been transformed into a closed-loop, secure, and fully audited standard operating procedure (SOP) governance engine.

---

## 🏗️ 1. Closed-Loop SOP Governance Flow

The SOP workflow follows a strict 4-phase lifecycle to ensure separation of duties between Admins, Creators, and Approvers:

```
[1. ADMIN ASSIGNMENT] ──► [2. CREATOR DRAFTING] ──► [3. APPROVER REVIEW] ──► [4. ACTIVE & SCHEDULER]
   Status: PENDING_CREATION   Status: PENDING_APPROVAL   Status: ACTIVE/REJECTED    Tasks Generated
```

### Key Workflow Phases & Rules:
1. **Admin Assignment (`PENDING_CREATION`)**:
   - Admin specifies **SOP Code**, **Corporate Entity**, **Process Category**, **Assigned Creator**, and **Assigned Approver**.
   - The assigned Creator receives a notification in their **Notification Bell** (`Notifications`).
2. **Creator Drafting (`PENDING_APPROVAL`)**:
   - Clicking the notification opens `CreateSOPModal` with **SOP Code**, **Entity**, and **Process Category** locked non-editable (set by Admin).
   - Creator inputs operational title, description, frequency, due day offset, and assigned Maker/Checker pools, then clicks **"Create & Send for Approval"**.
   - Creator's notification clears upon submission.
3. **Approver Review (`ACTIVE` / `REJECTED`)**:
   - The assigned Approver receives a green **"SOP Approval Required"** notification in their bell.
   - Clicking opens `SopDetailModal` with **Approve & Activate SOP** and **Reject SOP** action buttons.
   - **On Approval**: Status transitions to `ACTIVE`, Approver notification clears, and automated task scheduler engine triggers immediately.
   - **On Rejection**: Status transitions to `REJECTED`, revision notes are logged, and Creator receives a revision notification.

---

## 📜 2. SOP Event Tracking & Audit System (`sop_events`)

To track every state transition and administrative action, a dedicated audit trail database engine was implemented matching the task event system.

### Architecture & Components:
* **Database Table**: `sop_events`
* **JPA Entity**: `com.cloudkaptan.sop.entity.SopEvent`
  - Columns: `event_id` (PK), `sop_id` (FK), `actor_id` (FK), `action`, `from_status`, `to_status`, `comment`, `timestamp`.
* **Repository**: `com.cloudkaptan.sop.repository.SopEventRepository`
* **DTO**: `com.cloudkaptan.sop.dto.SopEventDto`
* **Service Integration**: `com.cloudkaptan.sop.service.SopService`
  - Records `SopEvent` entities during `assignSop`, `submitSop`, `actionSop` (Approve/Reject), `createSop`, and `updateSop`.
  - Maps complete event list into `SopDto.history`.
* **Frontend Timeline Modal**: `frontend/src/components/SopActivityLogModal.jsx`
  - Rendered via a **`🕒 Activity Log (<count>)`** header button inside `SopDetailModal` and `AssignedSopDetailsModal`.
  - Displays a complete 4-stage chronological timeline of all events (`ASSIGN_SOP`, `SUBMIT_DRAFT`, `APPROVE_SOP`, `REJECT_SOP`, `UPDATE_SOP`).

---

## 🔒 3. Enterprise Security & Architecture

### A. Rate Limiting Engine
* **Class**: `com.cloudkaptan.sop.config.security.RateLimitConfig`
* **Mechanism**: Implemented Bucket4j token bucket rate limiting on API endpoints (`/api/v1/**`).
* **Behavior**: Protects backend APIs against burst requests and denial of service attacks by limiting request rates per client IP address.

### B. Row-Level Security (RLS)
* **Annotation**: `@ApplyRowLevelSecurity`
* **Aspect**: `com.cloudkaptan.sop.config.security.RowLevelSecurityAspect`
* **Behavior**: Intercepts service calls to automatically restrict returned SOPs and compliance tasks based on the user's entity membership (`CK_INDIA`, `CK_US`, `CK_UK`, `CK_AUSTRALIA`).

---

## 📅 4. Recurring vs. One-Time Task Scheduling

### Scheduling Logic:
* **Recurring Schedule (`isRecurring = true`)**:
  - Task scheduler engine (`TaskSchedulerService.java`) automatically generates period tasks (e.g. `2026-M09`) based on compliance frequency (`MONTHLY`, `QUARTERLY`, `ANNUAL`, `DAILY`, `WEEKLY`).
* **One-Time Task (`isRecurring = false`)**:
  - Created once for a specific single-execution cycle.
  - **Frequency Relationship**: Frequency is **Not Applicable** (`N/A`).
  - In `CreateSOPModal.jsx`, when toggled to One-Time Execution, Frequency input is disabled and set to `N/A (One-Time Task)`.
  - In `SopDetailModal.jsx`, Frequency displays `N/A (One-Time Task)`.

---

## 🕒 5. Timezone & Timestamp Standardization

* **Backend**: All entity timestamps (`createdAt`, `updatedAt`, `timestamp`) use standard `java.time.OffsetDateTime` persisted in UTC.
* **Frontend**: Formatted consistently across modals and tables using ISO UTC strings (`YYYY-MM-DD HH:mm:ss UTC`).

---

## 📑 6. Complete File & Class Change Registry

| Layer | File / Class Path | Description of Changes |
| :--- | :--- | :--- |
| **Backend Entity** | `backend/.../entity/SopEvent.java` | **[NEW]** JPA entity for `sop_events` table tracking SOP audit events. |
| **Backend DTO** | `backend/.../dto/SopEventDto.java` | **[NEW]** Data transfer object for SOP timeline events. |
| **Backend DTO** | `backend/.../dto/SopDto.java` | **[MODIFY]** Added `List<SopEventDto> history` field. |
| **Backend Repo** | `backend/.../repository/SopEventRepository.java` | **[NEW]** Spring Data JPA repository for querying SOP events by `sopId` or `sopCode`. |
| **Backend Service**| `backend/.../service/SopService.java` | **[MODIFY]** Injected `SopEventRepository`, added `SopEvent` logging on lifecycle actions, mapped history in `mapToDto`. |
| **Backend Security**| `backend/.../config/security/RateLimitConfig.java` | **[NEW/MODIFY]** Rate limiting configuration using Bucket4j. |
| **Backend Security**| `backend/.../config/security/RowLevelSecurityAspect.java` | **[MODIFY]** Data scoping aspect enforcing entity restrictions via `@ApplyRowLevelSecurity`. |
| **Frontend Modal** | `frontend/src/components/SopActivityLogModal.jsx` | **[NEW]** Timeline modal for SOP audit trails and event milestones. |
| **Frontend Modal** | `frontend/src/components/CreateSOPModal.jsx` | **[MODIFY]** Updated button label to `"Create & Send for Approval"`, disabled Frequency for One-Time tasks, fixed toggle switch flex squishing. |
| **Frontend Modal** | `frontend/src/components/SopDetailModal.jsx` | **[MODIFY]** Added `Activity Log` header button, `SOP GOVERNANCE LIFECYCLE FLOW` stepper with user names, real creator description box. |
| **Frontend Modal** | `frontend/src/components/AssignedSopDetailsModal.jsx` | **[MODIFY]** Added `Activity Log` header button and Governance Stepper with user names. |
| **Frontend Page** | `frontend/src/pages/Sops.jsx` | **[MODIFY]** Wired Approver review flow, `open-sop-review` custom event listener, removed extra table row History button, fixed container scrollbar (`overflow: visible`). |
| **Frontend Nav** | `frontend/src/components/Sidebar.jsx` | **[MODIFY]** Updated notification bell to handle Creator (`PENDING_CREATION`) and Approver (`PENDING_APPROVAL`) tasks. |

---

*Documentation compiled successfully for FinSOP Enterprise Engine v1.0.*
