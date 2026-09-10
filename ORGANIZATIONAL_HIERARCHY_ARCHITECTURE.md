# Organizational Hierarchy Architecture & Access Control Specification

## Executive Summary

This document explains the technical design, algorithm, database schema, security filtering, and Flyway migration alignment implemented for the **Organizational Hierarchy & Manager Task Visibility Feature** in the Finance SOP Platform.

This guide provides a comprehensive overview of the design choices, traversal algorithms, code changes, and database schema updates, formatted for technical leadership review.

---

## 1. Business Context & Requirement

In corporate governance and Finance SOP management, managers require full visibility over tasks owned, created, or assigned to their direct and indirect subordinates across the organizational hierarchy.

### Key Requirements
1. **Vertical Hierarchy Traversal**: A manager at Level 1 (e.g., Kingshuk Roy) can view tasks assigned to Level 2 managers (e.g., Debajyoti Dattagupta, Annu Shaw, Avisek Shaw) and Level 3 subordinates (e.g., Ayush Pandey, Shreya Singh, etc.).
2. **Horizontal Peer Manager Access**: Level 2 peer managers operating in identical corporate scopes (e.g., Annu Shaw and Avisek Shaw) share identical supervisory access to team tasks downline, ensuring seamless coverage and peer review.
3. **Backend-Driven Security**: Access control is enforced strictly in the Spring Boot backend (`TenantSecurityFilter` + `TaskRepository`), ensuring that frontend UI queries cannot bypass security bounds or view unauthorized tasks.

---

## 2. Technical Architecture & Algorithm

```
                  +--------------------------+
                  |  Kingshuk Roy (Level 1)  |
                  +------------+-------------+
                               |
            +------------------+------------------+
            |                                     |
+-----------v------------+             +----------v-----------+
| Debajyoti Dattagupta   |             |  Annu Shaw           |
| (Level 2 Manager)      |             |  (Level 2 Manager)   |
+-----------+------------+             +----------+-----------+
            |                                     |
            |                                     |  (Horizontal Peer Access)
            |                          +----------v-----------+
            |                          |  Avisek Shaw         |
            |                          |  (Level 2 Manager)   |
            |                          +----------+-----------+
            |                                     |
    +-------v--------+                    +-------v--------+
    |  Sanjeev Kumar |                    |  Ayush Pandey  |
    |  (Level 3)     |                    |  (Level 3)     |
    +----------------+                    +----------------+
```

### Algorithm Breakdown

Access control relies on a **Dual-Mode Hierarchy Traversal Algorithm** (In-Memory + Database Recursive CTE):

#### Mode A: In-Memory Recursive Traversal (`TenantSecurityFilter.java`)
1. When an authenticated request arrives, `TenantSecurityFilter` resolves the current user ID (`currentUserId`).
2. It fetches all `UserHierarchy` records from `UserHierarchyRepository`.
3. It builds a directed adjacency graph (`managerMap`: `manager_id` -> `List<UserHierarchy>`).
4. It executes a recursive depth-first search (`collectDownline` method):
   - Starting from `currentUserId`, for each subordinate, if `canReadTasks` is true, it adds the subordinate's ID to `downlineUserIds`.
   - It recursively visits all child subordinates in the tree.
5. `downlineUserIds` are stored in the Spring Security context / ThreadLocal request attributes.

#### Mode B: Database Recursive CTE (`UserHierarchyRepository.java`)
For native SQL queries or database-level evaluation, the system executes an ANSI SQL `WITH RECURSIVE` CTE query:
```sql
WITH RECURSIVE subordinate_tree AS (
    -- Anchor member: Direct subordinates of manager
    SELECT subordinate_id, can_read_tasks, can_write_tasks
    FROM user_hierarchy
    WHERE manager_id = :managerId
    
    UNION ALL
    
    -- Recursive member: Subordinates of subordinates
    SELECT uh.subordinate_id, uh.can_read_tasks, uh.can_write_tasks
    FROM user_hierarchy uh
    INNER JOIN subordinate_tree st ON uh.manager_id = st.subordinate_id
)
SELECT subordinate_id, can_read_tasks, can_write_tasks
FROM subordinate_tree;
```

---

## 3. Request Security Flow

1. **HTTP Request Arrival**: Client sends an API request (e.g. `GET /api/v1/tasks/inbox`).
2. **`TenantSecurityFilter` Interception**:
   - Extract JWT token / user claims.
   - Resolve `currentUserId` and user's corporate entity permissions.
   - Execute `collectDownline(currentUserId)` to build the complete set of accessible subordinate user IDs.
   - Populate `SecurityContextHolder` with `UserPrincipal`.
3. **Repository Execution (`TaskRepository.findInboxTasks`)**:
   - The query matches tasks where `maker_id`, `checker_id`, `assignedMakerIds`, `assignedCheckerIds`, or `sop.createdBy` matches `currentUserId` OR any ID in `downlineUserIds`.
4. **API Response**: Returns only authorized tasks without leakage.

---

## 4. Flyway Database Schema Alignment

To resolve schema discrepancies on new PostgreSQL / Cloud SQL instances, all Flyway DDL scripts were aligned 1-to-1 with JPA Entity annotations:

| Entity Class | JPA `@Table` Name | Flyway Table | Key Columns & Annotations |
| :--- | :--- | :--- | :--- |
| `CorporateEntity` | `entities` | `entities` | `entity_code` (PK), `entity_name`, `created_at` |
| `User` | `users` | `users` | `user_id` (PK), `email` (UNIQUE), `full_name`, `role`, `entity_code` (FK), `is_active`, `created_at`, `updated_at` |
| `ProcessCategory` | `process_categories` | `process_categories` | `id` (UUID PK), `category_code` (UNIQUE), `category_name`, `description`, `created_at`, `updated_at` |
| `Sop` | `sops` | `sops` | `sop_id` (UUID PK), `sop_code` (UNIQUE), `title`, `description`, `process_category`, `entity_code` (FK), `frequency`, `due_day_offset`, `is_recurring`, `assigned_creator_id`, `assigned_approver_id`, `rejection_reason`, `status`, `created_by` (FK), `created_at`, `updated_at`, `version` |
| `Sop` (Makers Pool) | `sop_maker_pool` | `sop_maker_pool` | `sop_id` (FK), `maker_id` |
| `Sop` (Checkers Pool)| `sop_checker_pool` | `sop_checker_pool` | `sop_id` (FK), `checker_id` |
| `Task` | `tasks` | `tasks` | `task_id` (UUID PK), `version`, `record_no` (UNIQUE), `sop_id` (FK), `period_key`, `entity_code` (FK), `maker_id` (FK), `checker_id` (FK), `status`, `due_date`, `completed_at`, `approved_at`, `created_at`, `updated_at`. Constraint: `uq_sop_period (sop_id, period_key)` |
| `Task` (Makers Pool) | `task_maker_pool` | `task_maker_pool` | `task_id` (FK), `maker_id` |
| `Task` (Checkers Pool)| `task_checker_pool` | `task_checker_pool` | `task_id` (FK), `checker_id` |
| `TaskComment` | `task_comments` | `task_comments` | `comment_id` (BIGSERIAL PK), `task_id` (FK), `author_id` (FK), `comment_text`, `created_at` |
| `TaskEvent` | `task_events` | `task_events` | `event_id` (BIGSERIAL PK), `task_id` (FK), `actor_id` (FK), `action`, `from_status`, `to_status`, `timestamp` |
| `SopEvent` | `sop_events` | `sop_events` | `event_id` (BIGSERIAL PK), `sop_id` (FK), `actor_id` (FK), `action`, `from_status`, `to_status`, `comment`, `timestamp` |
| `AuditLog` | `audit_logs` | `audit_logs` | `audit_id` (BIGSERIAL PK), `actor_id`, `action`, `entity_type`, `entity_id`, `correlation_id`, `timestamp` |
| `UserNotification` | `user_notifications` | `user_notifications` | `notification_id` (UUID PK), `recipient_user_id` (FK), `event_type`, `title`, `message`, `reference_entity_type`, `reference_entity_id`, `is_read`, `is_deleted`, `created_at` |
| `AccessControlActivityLog` | `access_control_activity_logs` | `access_control_activity_logs` | `id` (UUID PK), `process_category`, `action`, `actor_id`, `actor_name`, `details`, `timestamp` |
| `UserCategoryPermission` | `user_sop_category_permissions` | `user_sop_category_permissions` | `id` (UUID PK), `user_id`, `process_category`, `can_create_sop`, `can_approve_sop`, `can_make_task`, `can_check_task`, `created_at`, `updated_at`. Constraint: `uq_user_category (user_id, process_category)` |
| `ProcessCategoryActivityLog` | `process_category_activity_logs` | `process_category_activity_logs` | `id` (UUID PK), `category_code`, `action`, `actor_id`, `actor_name`, `details`, `timestamp` |
| `TaskReassignmentHistory` | `task_reassignment_history` | `task_reassignment_history` | `history_id` (UUID PK), `task_id` (FK), `previous_maker_ids`, `previous_maker_names`, `new_maker_ids`, `new_maker_names`, `previous_checker_ids`, `previous_checker_names`, `new_checker_ids`, `new_checker_names`, `reassigned_by`, `reassigned_by_name`, `worked_until`, `reason`, `created_at` |
| `TaskDocument` | `task_documents` | `task_documents` | `document_id` (UUID PK), `task_id` (FK), `file_name`, `gcs_object_path`, `file_size`, `content_type`, `uploaded_by_id` (FK), `uploaded_at`, `upload_timing` |
| `UserHierarchy` | `user_hierarchy` | `user_hierarchy` | `hierarchy_id` (UUID PK), `manager_id`, `subordinate_id`, `can_read_tasks`, `can_write_tasks`, `created_at`. Constraint: `uq_manager_subordinate (manager_id, subordinate_id)` |

---

## 5. Summary of Files Changed

1. **`DataInitializer.java`**:
   - Removed sample SOP/Task creation (`seedSampleSopAndTask`).
   - Configured `user_hierarchy` seeding to grant horizontal peer manager permissions (Annu Shaw & Avisek Shaw).
2. **`TenantSecurityFilter.java`**:
   - Enhanced `collectDownline` recursive traversal logic to build manager downline ID list dynamically.
3. **`UserHierarchyRepository.java`**:
   - Configured `findAllSubordinatesDownline` SQL recursive CTE query.
4. **`V1_0__base_schema.sql`**:
   - Updated table names (`corporate_entities` -> `entities`, `sop_master` -> `sops`, `sop_default_makers` -> `sop_maker_pool`, `sop_default_checkers` -> `sop_checker_pool`, `task_assigned_makers` -> `task_maker_pool`, `task_assigned_checkers` -> `task_checker_pool`).
   - Aligned column names, types, and primary key definitions across all 11 core base tables.
5. **`V9__create_task_documents_table.sql`**:
   - Added `upload_timing` column to match `TaskDocument` JPA entity.

---

## 6. Verification & Results

- **Compilation**: `mvn test-compile` passed cleanly with `BUILD SUCCESS`.
- **Application Startup**: Server launched successfully (`Started FinSopApplication in ... seconds`).
- **Data Initialization**: Seeding logged `Seeded 8 organizational hierarchy relationships with horizontal Level 2 manager permissions.` and completed cleanly.
