-- Flyway Migration V1_0: Base Schema Initialization for PostgreSQL / GCP Cloud SQL

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Corporate Entities
CREATE TABLE IF NOT EXISTS corporate_entities (
    entity_code VARCHAR(32) PRIMARY KEY,
    entity_name VARCHAR(128) NOT NULL
);

-- 2. Users
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(128) NOT NULL UNIQUE,
    full_name VARCHAR(128) NOT NULL,
    role VARCHAR(32) NOT NULL,
    entity_code VARCHAR(32) NOT NULL REFERENCES corporate_entities(entity_code),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_entity ON users(entity_code);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 3. Process Categories
CREATE TABLE IF NOT EXISTS process_categories (
    category_code VARCHAR(64) PRIMARY KEY,
    category_name VARCHAR(128) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. SOP Master Table
CREATE TABLE IF NOT EXISTS sop_master (
    sop_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sop_code VARCHAR(32) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    process_category VARCHAR(64) NOT NULL,
    entity_code VARCHAR(32) NOT NULL REFERENCES corporate_entities(entity_code),
    frequency VARCHAR(32) NOT NULL,
    due_day_offset INT NOT NULL DEFAULT 1,
    is_recurring BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    created_by VARCHAR(64) REFERENCES users(user_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sop_entity ON sop_master(entity_code);
CREATE INDEX IF NOT EXISTS idx_sop_status ON sop_master(status);

-- SOP Element Collections
CREATE TABLE IF NOT EXISTS sop_default_makers (
    sop_id UUID NOT NULL REFERENCES sop_master(sop_id) ON DELETE CASCADE,
    maker_id VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS sop_default_checkers (
    sop_id UUID NOT NULL REFERENCES sop_master(sop_id) ON DELETE CASCADE,
    checker_id VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS sop_assigned_creators (
    sop_id UUID NOT NULL REFERENCES sop_master(sop_id) ON DELETE CASCADE,
    creator_id VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS sop_assigned_approvers (
    sop_id UUID NOT NULL REFERENCES sop_master(sop_id) ON DELETE CASCADE,
    approver_id VARCHAR(64) NOT NULL
);

-- 5. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sop_id UUID NOT NULL REFERENCES sop_master(sop_id) ON DELETE CASCADE,
    record_no VARCHAR(64) NOT NULL UNIQUE,
    period_key VARCHAR(32) NOT NULL,
    entity_code VARCHAR(32) NOT NULL REFERENCES corporate_entities(entity_code),
    maker_id VARCHAR(64) REFERENCES users(user_id),
    checker_id VARCHAR(64) REFERENCES users(user_id),
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    due_date DATE NOT NULL,
    completed_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_sop ON tasks(sop_id);
CREATE INDEX IF NOT EXISTS idx_tasks_entity ON tasks(entity_code);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- Task Element Collections
CREATE TABLE IF NOT EXISTS task_assigned_makers (
    task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    maker_id VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS task_assigned_checkers (
    task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    checker_id VARCHAR(64) NOT NULL
);

-- 6. Task Comments
CREATE TABLE IF NOT EXISTS task_comments (
    comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    author_id VARCHAR(64) NOT NULL REFERENCES users(user_id),
    comment_text TEXT NOT NULL,
    action VARCHAR(32),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comments_task ON task_comments(task_id);

-- 7. Task Events
CREATE TABLE IF NOT EXISTS task_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    actor_id VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    from_status VARCHAR(32),
    to_status VARCHAR(32),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_events_task ON task_events(task_id);

-- 8. SOP Events
CREATE TABLE IF NOT EXISTS sop_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sop_id UUID NOT NULL REFERENCES sop_master(sop_id) ON DELETE CASCADE,
    actor_id VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    from_status VARCHAR(32),
    to_status VARCHAR(32),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sop_events_sop ON sop_events(sop_id);

-- 9. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(128) NOT NULL,
    changes TEXT,
    ip_address VARCHAR(64),
    correlation_id VARCHAR(128),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);

-- 10. User Notifications
CREATE TABLE IF NOT EXISTS user_notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id VARCHAR(64) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    reference_entity_type VARCHAR(64),
    reference_entity_id VARCHAR(128),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON user_notifications(recipient_user_id);

-- 11. Access Control Activity Logs
CREATE TABLE IF NOT EXISTS access_control_activity_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_user_id VARCHAR(64) NOT NULL,
    actor_id VARCHAR(64) NOT NULL,
    action_type VARCHAR(64) NOT NULL,
    details TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
