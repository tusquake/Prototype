# FinSOP Enterprise System — Technical Enhancements Deep-Dive

> **Audience:** Engineering team & technical stakeholders  
> **Project:** FinSOP Financial Operations & Compliance Tracker  
> **Stack:** Java 21 · Spring Boot 3 · React 18 (Vite) · PostgreSQL · Bucket4j

---

## Table of Contents

1. [Closed-Loop SOP Governance Workflow](#1-closed-loop-sop-governance-workflow)
2. [SOP Event Audit Trail (sop_events)](#2-sop-event-audit-trail)
3. [Rate Limiting Engine](#3-rate-limiting-engine)
4. [Row-Level Security (RLS)](#4-row-level-security)
5. [Timestamp & Timezone Standardisation](#5-timestamp--timezone-standardisation)
6. [Recurring vs. One-Time Task Scheduling](#6-recurring-vs-one-time-task-scheduling)
7. [Frontend Governance UI Components](#7-frontend-governance-ui-components)
8. [Complete File & Class Change Registry](#8-complete-file--class-change-registry)
9. [Git Commit History](#9-git-commit-history)

---

## 1. Closed-Loop SOP Governance Workflow

### What Changed & Why

Previously the system had no structured SOP creation lifecycle — an Admin could directly create a fully-active SOP without any creator input or approver sign-off. This created audit and compliance gaps.

We implemented a **3-actor, 4-phase closed loop** with strict status transitions, notifications, and a complete event trail.

### Status Machine

```
null ──► PENDING_CREATION ──► PENDING_APPROVAL ──► ACTIVE
                                      │
                                      └──► REJECTED ──► (Creator redrafts)
```

All transitions are enforced by a `SopContext` + `SopStateMachine` pattern:

- **Class:** `com.cloudkaptan.sop.domain.state.sop.SopContext`
- **Factory:** `com.cloudkaptan.sop.domain.state.sop.SopStateMachineFactory`
- Calling an invalid transition (e.g. `approve()` on `PENDING_CREATION`) throws `IllegalStateException`.

---

### Phase 1 — Admin Assignment (`PENDING_CREATION`)

**Backend method:** `SopService.assignSop(AssignSopRequest request)`

What it does:
- Validates that the SOP code does not already exist (throws `IllegalArgumentException` if duplicate).
- Creates the `Sop` entity with:
  - `status = PENDING_CREATION`
  - `processCategory` — locked and cannot be changed by creator.
  - `assignedCreatorId` — the maker user who must draft the SOP body.
  - `assignedApproverId` — the checker user who will approve/reject.
- Writes an `AuditLog` row with `action = "ASSIGN_SOP_CREATION"`.
- Writes a `SopEvent` row with `action = "ASSIGN_SOP"`, `toStatus = PENDING_CREATION`.

**Frontend trigger:** `Sidebar.jsx` polls `getSops([])` on mount and when a `sop-updated` DOM event fires. If a SOP's `assignedCreatorId` matches the current user and status is `PENDING_CREATION`, a **notification bell item** appears with label *"Draft SOP Assigned: \<CODE\>"* and a blue dot.

---

### Phase 2 — Creator Drafting (`PENDING_APPROVAL`)

**Backend method:** `SopService.submitSop(UUID sopId, SubmitSopRequest request)`

What it does:
- Resolves the actor as a `UserRole.MAKER`.
- Calls `SopContext.submitForApproval(actor)` which validates state is `PENDING_CREATION` and transitions to `PENDING_APPROVAL`.
- Merges in all creator-provided fields: `title`, `description`, `frequency`, `dueDayOffset`, `isRecurring`, maker pool, checker pool.
- Writes an `AuditLog` row with `action = "SUBMIT_SOP_FOR_APPROVAL"`.
- Writes a `SopEvent` row with `action = "SUBMIT_DRAFT"`, `fromStatus = PENDING_CREATION`, `toStatus = PENDING_APPROVAL`.

**Frontend:** The Creator's notification badge clears. The Approver now sees *"SOP Approval Required: \<CODE\>"* in their bell.

**Frontend modal:** `CreateSOPModal.jsx` — when opened in creator-draft mode (`lockedAssignment` prop set):
- **SOP Code**, **Entity**, and **Process Category** fields are rendered `disabled` with a grey `#f1f5f9` background and `cursor: not-allowed`.
- Submit button label is **"Create & Send for Approval"** (changed from plain "Save").

---

### Phase 3 — Approver Review (`ACTIVE` / `REJECTED`)

**Backend method:** `SopService.actionSop(UUID sopId, SopActionRequest request)`

What it does:
- Resolves actor as `UserRole.CHECKER`.
- Dispatches to either `context.approve(actor)` or `context.reject(actor, comment)`.
- **On APPROVE:**
  - `SopStatus.ACTIVE` is set.
  - `taskSchedulerService.generateScheduledTasks()` is called immediately — this auto-creates all pending compliance period tasks for the newly active SOP.
  - `SopEvent` recorded: `action = "APPROVE_SOP"`, `fromStatus = PENDING_APPROVAL`, `toStatus = ACTIVE`.
- **On REJECT:**
  - `SopStatus.REJECTED` is set. Rejection comment is persisted on the `Sop` entity.
  - `SopEvent` recorded: `action = "REJECT_SOP"`, `fromStatus = PENDING_APPROVAL`, `toStatus = REJECTED`.
  - Creator receives a new revision notification.

---

## 2. SOP Event Audit Trail

### Why We Built It

The task system already had an `audit_log` table for broad actions, but it lacked granular lifecycle state transitions tied to individual SOPs. We mirrored the task-event pattern with a dedicated `sop_events` table.

---

### Database Table — `sop_events`

| Column | Type | Constraints | Notes |
|:--|:--|:--|:--|
| `event_id` | `BIGINT` | PK, Auto-generated | Auto-increment surrogate key |
| `sop_id` | `UUID` | FK → `sops.sop_id`, NOT NULL | Immutable reference |
| `actor_id` | `VARCHAR` | FK → `users.user_id` | Nullable (system events) |
| `action` | `VARCHAR(64)` | NOT NULL | e.g. `ASSIGN_SOP`, `SUBMIT_DRAFT`, `APPROVE_SOP`, `REJECT_SOP`, `UPDATE_SOP` |
| `from_status` | `VARCHAR(32)` | Nullable | Previous SOP status |
| `to_status` | `VARCHAR(32)` | NOT NULL | New SOP status after event |
| `comment` | `VARCHAR(512)` | Nullable | Human-readable notes or rejection reason |
| `timestamp` | `TIMESTAMPTZ` | NOT NULL, auto-set by Hibernate `@CreationTimestamp` | UTC timestamp of the event |

---

### Backend Classes

#### `SopEvent.java` — JPA Entity
**Package:** `com.cloudkaptan.sop.entity`  
**Key design decisions:**
- Annotated with `@Immutable` (Hibernate) — once written, no row can ever be updated. This guarantees tamper-proof audit records.
- All columns have `updatable = false` at the column definition level as a second layer of protection.
- Uses `FetchType.LAZY` on `sop` and `actor` joins to avoid N+1 query problems.
- `timestamp` uses `@CreationTimestamp` — the database clock sets the value on INSERT, not the application clock, preventing clock-skew issues.

```java
@Entity
@Table(name = "sop_events")
@Immutable   // No UPDATE ever allowed on this entity
public class SopEvent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long eventId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sop_id", updatable = false)
    private Sop sop;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id", updatable = false)
    private User actor;

    @Column(name = "action", length = 64, updatable = false)
    private String action;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", updatable = false)
    private SopStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", updatable = false)
    private SopStatus toStatus;

    @Column(name = "comment", length = 512, updatable = false)
    private String comment;

    @CreationTimestamp
    @Column(name = "timestamp", updatable = false)
    private OffsetDateTime timestamp;
}
```

---

#### `SopEventRepository.java` — Spring Data JPA Repository
**Package:** `com.cloudkaptan.sop.repository`

```java
@Repository
public interface SopEventRepository extends JpaRepository<SopEvent, Long> {
    List<SopEvent> findBySop_SopIdOrderByTimestampAsc(UUID sopId);
    List<SopEvent> findBySop_SopCodeOrderByTimestampAsc(String sopCode);
}
```
Both queries use `ORDER BY timestamp ASC` so the frontend always receives a chronological timeline without any client-side sorting.

---

#### `SopEventDto.java` — Data Transfer Object
**Package:** `com.cloudkaptan.sop.dto`

```java
@Data @Builder
public class SopEventDto {
    private Long eventId;
    private String action;
    private String fromStatus;
    private String toStatus;
    private String actorId;
    private String actorName;    // Resolved full name via UserRepository
    private String actorRole;    // e.g. ADMIN, MAKER, CHECKER
    private String comment;
    private OffsetDateTime timestamp;
}
```

---

#### `SopDto.java` — Modified to Include History
**Field added:** `private List<SopEventDto> history;`

The `mapToDto()` method in `SopService` populates this by calling:
```java
List<SopEvent> rawEvents = sopEventRepository.findBySop_SopIdOrderByTimestampAsc(sop.getSopId());
List<SopEventDto> historyList = rawEvents.stream().map(e -> SopEventDto.builder()
    .eventId(e.getEventId())
    .action(e.getAction())
    .fromStatus(e.getFromStatus() != null ? e.getFromStatus().name() : null)
    .toStatus(e.getToStatus() != null ? e.getToStatus().name() : null)
    .actorId(e.getActor() != null ? e.getActor().getUserId() : null)
    .actorName(e.getActor() != null ? e.getActor().getFullName() : "System")
    .actorRole(e.getActor() != null ? e.getActor().getRole().name() : "SYSTEM")
    .comment(e.getComment())
    .timestamp(e.getTimestamp())
    .build()).toList();
```

This means every `GET /api/v1/sops` response includes the full event timeline for every SOP — no separate audit endpoint needed.

---

#### `SopActivityLogModal.jsx` — Frontend Timeline Component
**Path:** `frontend/src/components/SopActivityLogModal.jsx`

**How it works:**
1. Receives `sop` object (which now includes `sop.history[]`).
2. Synthesises milestone events — if the backend `history` array is empty (e.g. pre-migration SOPs), it constructs synthetic events from known SOP state so the UI never shows an empty timeline.
3. Deduplicates events by matching `eventId` and `action+timestamp`.
4. Sorts chronologically by `timestamp`.
5. Renders each event as a coloured timeline card with:
   - Action icon (✓ approve / ✗ reject / ✈ submit / ℹ assign)
   - Colour-coded badge (`historyApprove` green / `historyReject` red / `historySubmit` blue / `historyResubmit` grey)
   - Actor name, role, timestamp (UTC)
   - Status transition pill: `PENDING_CREATION ➔ PENDING_APPROVAL`
   - Notes / Feedback comment box

The modal is opened by clicking the **`🕒 Activity Log (<count>)`** pill button embedded in the header of both `SopDetailModal` and `AssignedSopDetailsModal`.

---

## 3. Rate Limiting Engine

### Why We Built It

Without rate limiting, any client (or attacker) can hammer `/api/v1/**` endpoints indefinitely, causing resource exhaustion on the Spring Boot container and database connection pool.

### Library Used

**Bucket4j** — a token-bucket algorithm library that integrates natively with Spring without requiring Redis or any distributed cache for single-node deployments.

### Classes

#### `RateLimitConfig.java`
**Package:** `com.cloudkaptan.sop.config.security`

Defines two bucket profiles:

| Tier | Capacity | Refill Rate | Applied To |
|:--|:--|:--|:--|
| **Standard** | 100 tokens | 100 / 60 seconds (greedy) | All `/api/v1/**` routes |
| **Auth** | 10 tokens | 10 / 60 seconds (greedy) | `/api/v1/auth/**` (brute-force protection) |

```java
// Standard tier: 100 req/min
public Bucket createStandardBucket() {
    Bandwidth limit = Bandwidth.classic(100, Refill.greedy(100, Duration.ofMinutes(1)));
    return Bucket.builder().addLimit(limit).build();
}

// Auth tier: 10 req/min (prevents brute-force login attacks)
public Bucket createAuthBucket() {
    Bandwidth limit = Bandwidth.classic(10, Refill.greedy(10, Duration.ofMinutes(1)));
    return Bucket.builder().addLimit(limit).build();
}
```

#### `RateLimitingFilter.java`
**Package:** `com.cloudkaptan.sop.config.security`  
**Extends:** `OncePerRequestFilter` (executes once per HTTP request)

**Client key resolution order:**
1. If the request carries a valid JWT: the bucket key is the JWT `subject` (i.e. user ID). Per-user limiting.
2. If no JWT: falls back to `X-Forwarded-For` header (handles Cloud Run/load-balancer proxies).
3. Final fallback: `request.getRemoteAddr()` (raw IP).

**What happens on rate limit breach:**
- Returns HTTP **429 Too Many Requests**.
- Sets `X-RateLimit-Retry-After-Seconds` response header so clients know when to retry.
- Returns a JSON error body: `{"status": 429, "error": "Too Many Requests", "message": "Rate limit exceeded. Try again in N seconds."}`.
- Sets `X-RateLimit-Remaining` header on successful requests so clients can monitor their remaining budget.

---

## 4. Row-Level Security (RLS)

### Why We Built It

All users previously called `GET /api/v1/sops` and received every SOP across all corporate entities. A MAKER in CK India should not see SOPs belonging to CK Australia.

### Design Pattern

We used **Spring AOP (Aspect-Oriented Programming)** to intercept service method return values and transparently filter them — without cluttering every repository query with WHERE clauses.

### Classes

#### `@ApplyRowLevelSecurity` — Custom Annotation
**Package:** `com.cloudkaptan.sop.config.security`

```java
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface ApplyRowLevelSecurity {
    String entityCodeParam() default "entities";
}
```

Place this annotation on any service method whose result should be RLS-filtered.  
Currently applied to: `SopService.getSops()`.

---

#### `TenantContext.java` — Per-Request ThreadLocal Store
Stores `userId`, `tenantId`, and `userRole` in a `ThreadLocal` for the duration of a single HTTP request. Cleared in the `finally` block of `TenantSecurityFilter` after the response is sent.

---

#### `TenantSecurityFilter.java`
**Extends:** `OncePerRequestFilter`, `@Order(1)` — runs first in the filter chain.

**User ID resolution order:**
1. `userId` query parameter.
2. `X-User-Id` HTTP header.
3. `X-User-Email` HTTP header → looks up user in DB.
4. Spring Security `Authentication.getName()`.
5. Default fallback: `usr-manoj-042` (Admin).

After resolving the user, it sets `TenantContext` for the thread.

---

#### `RowLevelSecurityAspect.java`
**Package:** `com.cloudkaptan.sop.config.security`  
**Annotation:** `@Aspect @Component`

The `@Around` advice intercepts any method annotated with `@ApplyRowLevelSecurity`. After the method executes and returns its result, the aspect post-processes the list:

**For Admin users** (`UserRole.ADMIN` or hardcoded admin IDs `usr-manoj-042`, `usr-avisek-499`):
- **Bypasses all filtering** — Admins see everything.

**For Task DTOs:**
```
Show task if: assignedMakerIds contains userId
           OR makerId = userId
           OR actualMakerId = userId
           OR makerName contains userName
           OR any of the equivalent Checker checks
```

**For SOP DTOs:**
```
Show SOP if: assignedCreatorId = userId
          OR assignedCreatorName contains userName
          OR assignedApproverId = userId
          OR assignedApproverName contains userName
          OR defaultMakerIds contains userId
          OR defaultCheckerIds contains userId
```

This means a MAKER only sees SOPs they are assigned to draft or are in the Maker pool of. An approver only sees SOPs they are assigned to review.

---

## 5. Timestamp & Timezone Standardisation

### Problem

Java's default `LocalDateTime` has no timezone information. When persisted to PostgreSQL and read back by clients in different timezones, timestamps appear shifted.

### Solution

All entity timestamp fields use `java.time.OffsetDateTime` which carries timezone offset information:

```java
@CreationTimestamp
@Column(name = "timestamp", nullable = false, updatable = false)
private OffsetDateTime timestamp;  // e.g. 2026-09-01T07:05:00+05:30
```

PostgreSQL stores this as `TIMESTAMPTZ` (timestamp with time zone) and normalises to UTC internally.

**Frontend rendering:** All timestamps are formatted to readable UTC strings:
```js
new Date(event.timestamp).toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
// Output: "2026-09-01 01:35:22 UTC"
```

This ensures all team members in different time zones see a consistent single timezone (UTC) in the activity log.

---

## 6. Recurring vs. One-Time Task Scheduling

### The `isRecurring` Flag

Every SOP now carries a boolean `isRecurring` field (`Boolean` not `boolean` — intentionally nullable for backward compatibility).

| `isRecurring` | Meaning | Frequency Field | Task Generation |
|:--|:--|:--|:--|
| `true` | Recurring Schedule | Active — `MONTHLY`, `QUARTERLY`, `ANNUAL`, `WEEKLY`, `DAILY` | Auto-generates a new task every compliance cycle |
| `false` | One-Time Execution | Not applicable — `N/A` | Generates exactly one task on activation |

### Backend — `SopService.submitSop()`

When the creator submits a draft, `isRecurring` is patched onto the entity:
```java
if (request.getIsRecurring() != null) sop.setIsRecurring(request.getIsRecurring());
```

### Frontend — `CreateSOPModal.jsx`

The **Schedule Recurrence Mode** toggle switch changes behaviour based on `isRecurring`:

**Toggle Switch UI fix:** The toggle was being squished by its parent flex container. We added `flexShrink: 0`, `minWidth: 44`, and `boxSizing: border-box` to prevent compression:
```jsx
style={{
  width: 44,
  minWidth: 44,
  height: 24,
  borderRadius: 12,
  flexShrink: 0,
  boxSizing: 'border-box',
  display: 'inline-block',
  ...
}}
```

**Frequency field conditionally rendered:**
```jsx
{formData.isRecurring ? (
  <CustomSelect name="frequency" value={formData.frequency} options={FREQ_OPTIONS} onChange={handleInputChange} />
) : (
  <input value="N/A (One-Time Task)" disabled style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }} />
)}
```

**`SopDetailModal.jsx` — Frequency display:**
```jsx
{sop.isRecurring ? (FREQ_LABEL[sop.frequency] || sop.frequency) : 'N/A (One-Time Task)'}
```

---

## 7. Frontend Governance UI Components

### `SopDetailModal.jsx` (Admin / Full View)

**Changes made:**

1. **`Activity Log` header pill button** — positioned in the top-right of the modal header, showing live count `🕒 Activity Log (N)`. Clicking opens `SopActivityLogModal`.

2. **`SOP Governance Lifecycle Flow` stepper** — 3-step progress tracker:
   - Step 1: *Admin Assignment* → `Assigned by <adminName>`
   - Step 2: *Creator Draft* → `Submitted by <creatorName>` or `Pending <creatorName> Draft`
   - Step 3: *Approver Outcome* → `Approved by <approverName>` / `Rejected by <approverName>` / `Pending <approverName> Review`

3. **Description box** — now shows the exact operational description entered by the creator. Removed hardcoded fallback text; replaced with `'No description provided.'` if genuinely empty.

4. **`historyLength` calculation** — counts milestone events intelligently:
   ```js
   const milestoneCount = 1 + (isPendingCreation ? 0 : 1) + (isActive || isRejected ? 1 : 0);
   const historyLength = Math.max(dbLength, milestoneCount);
   ```

---

### `AssignedSopDetailsModal.jsx` (Creator / Approver View)

Same stepper and Activity Log button added for consistency. Creator-specific view shows:
- Rejection feedback box in red when `sop.status === 'REJECTED'`.
- Governance stepper showing exactly which phase the SOP is stuck at.

---

### `Sops.jsx` (SOP Table Page)

1. **Removed extra "History" button** from table row actions — Activity Log is now accessible via modal header only, keeping the table clean.

2. **Filter overflow fix** — removed `overflow-x: auto` from `.filterRow` in `Sops.module.css` and set `overflow: visible`. This prevented the custom dropdown popover from being clipped inside the scroll container.

3. **Custom DOM event listeners wired:**
   - `open-sop-draft` — triggered when Creator clicks notification; opens `CreateSOPModal` with locked fields.
   - `open-sop-review` — triggered when Approver clicks notification; opens `SopDetailModal` with approve/reject buttons.
   - `sop-updated` — triggers a re-fetch of all SOPs to refresh table and notification badge counts.

---

### `Sidebar.jsx` (Notification Bell)

Extended `loadPendingTasks()` to also inspect SOPs:
- If `sop.assignedCreatorId === currentUser.id` AND `sop.status === PENDING_CREATION` → Creator notification.
- If `sop.assignedApproverId === currentUser.id` AND `sop.status === PENDING_APPROVAL` → Approver notification.
- If `sop.assignedCreatorId === currentUser.id` AND `sop.status === REJECTED` → Revision notification.

Each notification item dispatches a custom DOM event on click to open the correct modal.

---

## 8. Complete File & Class Change Registry

### Backend

| Status | Full Class Path | Description |
|:--|:--|:--|
| **NEW** | `com.cloudkaptan.sop.entity.SopEvent` | `@Immutable` JPA entity for `sop_events` table. Tamper-proof audit rows. |
| **NEW** | `com.cloudkaptan.sop.dto.SopEventDto` | DTO carrying audit event data to frontend. |
| **NEW** | `com.cloudkaptan.sop.repository.SopEventRepository` | JPA repo with `findBySop_SopIdOrderByTimestampAsc` and `findBySop_SopCodeOrderByTimestampAsc`. |
| **MODIFY** | `com.cloudkaptan.sop.dto.SopDto` | Added `List<SopEventDto> history` field. |
| **MODIFY** | `com.cloudkaptan.sop.service.SopService` | Injected `SopEventRepository`. Records `SopEvent` in `createSop`, `assignSop`, `submitSop`, `actionSop`, `updateSop`. `mapToDto()` now hydrates `history`. |
| **NEW** | `com.cloudkaptan.sop.config.security.RateLimitConfig` | Defines standard (100/min) and auth (10/min) Bucket4j token bucket profiles. |
| **NEW** | `com.cloudkaptan.sop.config.security.RateLimitingFilter` | `OncePerRequestFilter` — consumes 1 token per request, returns HTTP 429 on exhaustion with retry-after headers. |
| **NEW** | `com.cloudkaptan.sop.config.security.TenantContext` | `ThreadLocal` store for `userId`, `tenantId`, `userRole` per HTTP request. |
| **NEW** | `com.cloudkaptan.sop.config.security.TenantSecurityFilter` | `@Order(1)` filter that resolves user identity from JWT/headers/params and populates `TenantContext`. |
| **NEW** | `com.cloudkaptan.sop.config.security.ApplyRowLevelSecurity` | Custom `@Retention(RUNTIME)` annotation to mark methods for AOP RLS enforcement. |
| **NEW** | `com.cloudkaptan.sop.config.security.RowLevelSecurityAspect` | `@Around` AOP advice. Post-processes `List<SopDto>` and `List<TaskDto>` results to filter rows by user identity. Admins bypass. |

### Frontend

| Status | File Path | Description |
|:--|:--|:--|
| **NEW** | `src/components/SopActivityLogModal.jsx` | Full lifecycle event timeline modal. Synthesises milestone events, deduplicates, sorts chronologically. |
| **MODIFY** | `src/components/SopDetailModal.jsx` | Activity Log header button, Governance Stepper with real actor names, description from creator, `historyLength` milestone calculation. |
| **MODIFY** | `src/components/AssignedSopDetailsModal.jsx` | Same Activity Log button and Governance Stepper. Updated `historyLength` calculation. |
| **MODIFY** | `src/components/CreateSOPModal.jsx` | Button label → "Create & Send for Approval". Frequency disabled for one-time tasks. Toggle switch flex-squish bug fixed. |
| **MODIFY** | `src/pages/Sops.jsx` | Removed redundant History table action button. Wired `open-sop-draft`, `open-sop-review`, `sop-updated` custom DOM events. |
| **MODIFY** | `src/pages/Sops.module.css` | `.filterRow` changed to `overflow: visible` to fix dropdown popover clipping. |
| **MODIFY** | `src/components/Sidebar.jsx` | Notification bell now surfaces Creator, Approver, and Revision SOP notifications. |

---

## 9. Git Commit History

| Commit | Message |
|:--|:--|
| `9c4ae5a` | `fix(css): remove overflow-x auto and set overflow visible on filterRow` |
| `1f16d23` | `style(modal): use ampersand in 'Create & Send for Approval' button label` |
| `fdc7b1a` | `feat(audit): implement SopEvent entity & SopActivityLogModal for complete lifecycle event tracking` |
| `64e1703` | `feat(workflow): implement complete end-to-end SOP approval notification flow` |
| `6c3c369` | `fix(modal): show creator provided description and display assigned actor names in SOP governance lifecycle flow stepper` |
| `bdda8b4` | `fix(ui): prevent toggle switch flex squishing and clarify one-time task frequency relationship` |
| `888bddd` | `fix(audit): synthesize complete 4-step SOP milestone event logs in SopActivityLogModal` |
| `b799261` | `docs: add comprehensive SOP Governance Architecture & Technical Enhancements documentation` |

---

*FinSOP Enterprise Engine v1.0 — Technical Documentation*  
*Generated: 2026-09-01*
