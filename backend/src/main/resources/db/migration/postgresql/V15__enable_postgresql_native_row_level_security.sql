-- Flyway Migration V15: Database-Level PostgreSQL Native Row-Level Security (RLS) Policies
-- Enforces row-level visibility natively in PostgreSQL for `tasks` and `sops` tables

-- 1. Enable Row-Level Security on `tasks` and `sops` tables
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sops ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any
DROP POLICY IF EXISTS tasks_rls_policy ON tasks;
DROP POLICY IF EXISTS sops_rls_policy ON sops;

-- 3. Create PostgreSQL Native RLS Policy for `tasks`
CREATE POLICY tasks_rls_policy ON tasks
FOR ALL
USING (
    -- Bypass: System Background Scheduler / Unauthenticated connection
    NULLIF(current_setting('app.current_user_id', true), '') IS NULL
    -- Bypass: Global Admin Role
    OR current_setting('app.current_user_role', true) = 'ADMIN'
    -- Rule 1: Direct Maker or Checker on Task
    OR maker_id = current_setting('app.current_user_id', true)
    OR checker_id = current_setting('app.current_user_id', true)
    -- Rule 2: Assigned Maker Pool
    OR EXISTS (
        SELECT 1 FROM task_maker_pool tmp
        WHERE tmp.task_id = tasks.task_id
        AND tmp.maker_id = current_setting('app.current_user_id', true)
    )
    -- Rule 3: Assigned Checker Pool
    OR EXISTS (
        SELECT 1 FROM task_checker_pool tcp
        WHERE tcp.task_id = tasks.task_id
        AND tcp.checker_id = current_setting('app.current_user_id', true)
    )
    -- Rule 4: Manager Organizational Reporting Hierarchy (Read/Write Downline Access)
    OR EXISTS (
        SELECT 1 FROM user_hierarchy uh
        WHERE uh.manager_id = current_setting('app.current_user_id', true)
        AND (uh.can_read_tasks = TRUE OR uh.can_write_tasks = TRUE)
        AND (
            uh.subordinate_id = tasks.maker_id
            OR uh.subordinate_id = tasks.checker_id
            OR EXISTS (SELECT 1 FROM task_maker_pool tmp WHERE tmp.task_id = tasks.task_id AND tmp.maker_id = uh.subordinate_id)
            OR EXISTS (SELECT 1 FROM task_checker_pool tcp WHERE tcp.task_id = tasks.task_id AND tcp.checker_id = uh.subordinate_id)
        )
    )
    -- Rule 5: SOP Creator or Approver Ownership
    OR EXISTS (
        SELECT 1 FROM sops s
        WHERE s.sop_id = tasks.sop_id
        AND (
            s.created_by = current_setting('app.current_user_id', true)
            OR s.assigned_creator_id = current_setting('app.current_user_id', true)
            OR s.assigned_approver_id = current_setting('app.current_user_id', true)
            OR EXISTS (SELECT 1 FROM sop_assigned_creators sac WHERE sac.sop_id = s.sop_id AND sac.creator_id = current_setting('app.current_user_id', true))
            OR EXISTS (SELECT 1 FROM sop_assigned_approvers saa WHERE saa.sop_id = s.sop_id AND saa.approver_id = current_setting('app.current_user_id', true))
        )
    )
    -- Rule 6: Process Category Permissions
    OR EXISTS (
        SELECT 1 FROM sops s
        JOIN user_category_permissions ucp ON s.process_category = ucp.category_code
        WHERE s.sop_id = tasks.sop_id
        AND ucp.user_id = current_setting('app.current_user_id', true)
    )
);

-- 4. Create PostgreSQL Native RLS Policy for `sops`
CREATE POLICY sops_rls_policy ON sops
FOR ALL
USING (
    -- Bypass: System Background Scheduler / Unauthenticated connection
    NULLIF(current_setting('app.current_user_id', true), '') IS NULL
    -- Bypass: Global Admin Role
    OR current_setting('app.current_user_role', true) = 'ADMIN'
    -- Rule 1: Created By, Primary Assigned Creator, or Primary Assigned Approver
    OR created_by = current_setting('app.current_user_id', true)
    OR assigned_creator_id = current_setting('app.current_user_id', true)
    OR assigned_approver_id = current_setting('app.current_user_id', true)
    -- Rule 2: Multi-Creator Pool list
    OR EXISTS (
        SELECT 1 FROM sop_assigned_creators sac
        WHERE sac.sop_id = sops.sop_id
        AND sac.creator_id = current_setting('app.current_user_id', true)
    )
    -- Rule 3: Multi-Approver Pool list
    OR EXISTS (
        SELECT 1 FROM sop_assigned_approvers saa
        WHERE saa.sop_id = sops.sop_id
        AND saa.approver_id = current_setting('app.current_user_id', true)
    )
    -- Rule 4: Default Maker Pool or Checker Pool
    OR EXISTS (
        SELECT 1 FROM sop_maker_pool smp
        WHERE smp.sop_id = sops.sop_id
        AND smp.maker_id = current_setting('app.current_user_id', true)
    )
    OR EXISTS (
        SELECT 1 FROM sop_checker_pool scp
        WHERE scp.sop_id = sops.sop_id
        AND scp.checker_id = current_setting('app.current_user_id', true)
    )
    -- Rule 5: Manager Organizational Reporting Hierarchy Access
    OR EXISTS (
        SELECT 1 FROM user_hierarchy uh
        WHERE uh.manager_id = current_setting('app.current_user_id', true)
        AND (
            uh.subordinate_id = sops.created_by
            OR uh.subordinate_id = sops.assigned_creator_id
            OR uh.subordinate_id = sops.assigned_approver_id
            OR EXISTS (SELECT 1 FROM sop_maker_pool smp WHERE smp.sop_id = sops.sop_id AND smp.maker_id = uh.subordinate_id)
            OR EXISTS (SELECT 1 FROM sop_checker_pool scp WHERE scp.sop_id = sops.sop_id AND scp.checker_id = uh.subordinate_id)
        )
    )
    -- Rule 6: Process Category Permissions
    OR EXISTS (
        SELECT 1 FROM user_category_permissions ucp
        WHERE ucp.category_code = sops.process_category
        AND ucp.user_id = current_setting('app.current_user_id', true)
    )
);
