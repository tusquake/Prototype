-- Flyway Migration V1_0: Base Schema Initialization for PostgreSQL / GCP Cloud SQL

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Corporate Entities (Entity class: CorporateEntity -> @Table(name = "entities"))
CREATE TABLE IF NOT EXISTS entities (
    entity_code VARCHAR(32) PRIMARY KEY,
    entity_name VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users (Entity class: User -> @Table(name = "users"))
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(128) NOT NULL UNIQUE,
    full_name VARCHAR(128) NOT NULL,
    role VARCHAR(32) NOT NULL,
    entity_code VARCHAR(32) NOT NULL REFERENCES entities(entity_code),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_entity ON users(entity_code);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 3. Process Categories (Entity class: ProcessCategory -> @Table(name = "process_categories"))
CREATE TABLE IF NOT EXISTS process_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_code VARCHAR(64) NOT NULL UNIQUE,
    category_name VARCHAR(128) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cat_code ON process_categories(category_code);

-- 4. SOP Master Table (Entity class: Sop -> @Table(name = "sops"))
CREATE TABLE IF NOT EXISTS sops (
    sop_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sop_code VARCHAR(64) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    process_category VARCHAR(128) NOT NULL,
    entity_code VARCHAR(32) NOT NULL REFERENCES entities(entity_code),
    frequency VARCHAR(32) NOT NULL,
    due_day_offset INT NOT NULL DEFAULT 1,
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    assigned_creator_id VARCHAR(64),
    assigned_approver_id VARCHAR(64),
    rejection_reason TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    created_by VARCHAR(64) NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INT DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_sop_entity ON sops(entity_code);
CREATE INDEX IF NOT EXISTS idx_sop_status ON sops(status);

-- SOP Element Collections
CREATE TABLE IF NOT EXISTS sop_maker_pool (
    sop_id UUID NOT NULL REFERENCES sops(sop_id) ON DELETE CASCADE,
    maker_id VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS sop_checker_pool (
    sop_id UUID NOT NULL REFERENCES sops(sop_id) ON DELETE CASCADE,
    checker_id VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS sop_assigned_creators (
    sop_id UUID NOT NULL REFERENCES sops(sop_id) ON DELETE CASCADE,
    creator_id VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS sop_assigned_approvers (
    sop_id UUID NOT NULL REFERENCES sops(sop_id) ON DELETE CASCADE,
    approver_id VARCHAR(64) NOT NULL
);

-- 5. Tasks Table (Entity class: Task -> @Table(name = "tasks"))
CREATE TABLE IF NOT EXISTS tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version BIGINT NOT NULL DEFAULT 0,
    record_no VARCHAR(64) NOT NULL UNIQUE,
    sop_id UUID NOT NULL REFERENCES sops(sop_id) ON DELETE CASCADE,
    period_key VARCHAR(32) NOT NULL,
    entity_code VARCHAR(32) NOT NULL REFERENCES entities(entity_code),
    maker_id VARCHAR(64) REFERENCES users(user_id),
    checker_id VARCHAR(64) REFERENCES users(user_id),
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    due_date DATE NOT NULL,
    completed_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_sop_period UNIQUE (sop_id, period_key)
);

CREATE INDEX IF NOT EXISTS idx_tasks_sop ON tasks(sop_id);
CREATE INDEX IF NOT EXISTS idx_tasks_entity ON tasks(entity_code);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- Task Element Collections
CREATE TABLE IF NOT EXISTS task_maker_pool (
    task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    maker_id VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS task_checker_pool (
    task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    checker_id VARCHAR(64) NOT NULL
);

-- 6. Task Comments (Entity class: TaskComment -> @Table(name = "task_comments"))
CREATE TABLE IF NOT EXISTS task_comments (
    comment_id BIGSERIAL PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    author_id VARCHAR(64) NOT NULL REFERENCES users(user_id),
    comment_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comments_task ON task_comments(task_id);

-- 7. Task Events (Entity class: TaskEvent -> @Table(name = "task_events"))
CREATE TABLE IF NOT EXISTS task_events (
    event_id BIGSERIAL PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    actor_id VARCHAR(64) NOT NULL REFERENCES users(user_id),
    action VARCHAR(64) NOT NULL,
    from_status VARCHAR(32),
    to_status VARCHAR(32) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_events_task ON task_events(task_id);

-- 8. SOP Events (Entity class: SopEvent -> @Table(name = "sop_events"))
CREATE TABLE IF NOT EXISTS sop_events (
    event_id BIGSERIAL PRIMARY KEY,
    sop_id UUID NOT NULL REFERENCES sops(sop_id) ON DELETE CASCADE,
    actor_id VARCHAR(64) REFERENCES users(user_id),
    action VARCHAR(64) NOT NULL,
    from_status VARCHAR(32),
    to_status VARCHAR(32) NOT NULL,
    comment VARCHAR(512),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sop_events_sop ON sop_events(sop_id);

-- 9. Audit Logs (Entity class: AuditLog -> @Table(name = "audit_logs"))
CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id BIGSERIAL PRIMARY KEY,
    actor_id VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    correlation_id VARCHAR(64),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);

-- 10. User Notifications (Entity class: UserNotification -> @Table(name = "user_notifications"))
CREATE TABLE IF NOT EXISTS user_notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id VARCHAR(64) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    reference_entity_type VARCHAR(64),
    reference_entity_id VARCHAR(255),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON user_notifications(recipient_user_id);

-- 11. Access Control Activity Logs (Entity class: AccessControlActivityLog -> @Table(name = "access_control_activity_logs"))
CREATE TABLE IF NOT EXISTS access_control_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_category VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    actor_id VARCHAR(64) NOT NULL,
    actor_name VARCHAR(128),
    details TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

