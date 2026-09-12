-- V12__create_sop_versions_outbox_and_constraints.sql
-- Flyway DDL Migration for Normalized SOP Versioning (sop_versions) with start_date_time and due_date_time, Transactional Outbox, and Task Constraints

-- 1. Create Dedicated sop_versions Table
CREATE TABLE IF NOT EXISTS sop_versions (
    version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sop_id UUID NOT NULL REFERENCES sops(sop_id) ON DELETE CASCADE,
    version_number VARCHAR(20) NOT NULL DEFAULT '1.0',
    frequency VARCHAR(32) NOT NULL,
    start_date_time TIMESTAMPTZ NOT NULL,
    due_date_time TIMESTAMPTZ NOT NULL,
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    version_status VARCHAR(30) NOT NULL DEFAULT 'APPROVED', -- DRAFT, PENDING_APPROVAL, APPROVED, ARCHIVED
    is_running BOOLEAN NOT NULL DEFAULT TRUE,
    next_expected_execution_at TIMESTAMPTZ,
    next_cloud_task_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(64),
    CONSTRAINT uq_sop_version_number UNIQUE (sop_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_sop_versions_active_running 
ON sop_versions (is_running, version_status) 
WHERE is_running = TRUE AND version_status = 'APPROVED';

-- 2. Add sop_version_id Foreign Key to tasks Table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS sop_version_id UUID REFERENCES sop_versions(version_id);

-- Database-Level Unique Constraint for Task Idempotency on (sop_version_id, period_key)
ALTER TABLE tasks 
ADD CONSTRAINT uq_sop_version_period UNIQUE (sop_version_id, period_key);

-- 3. Transactional Outbox Table Schema
CREATE TABLE IF NOT EXISTS task_outbox (
    outbox_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sop_version_id UUID NOT NULL REFERENCES sop_versions(version_id) ON DELETE CASCADE,
    period_key VARCHAR(20) NOT NULL,
    schedule_time TIMESTAMPTZ NOT NULL,
    kind VARCHAR(20) NOT NULL DEFAULT 'TASK', -- 'TASK' or 'CHECKPOINT'
    target_time TIMESTAMPTZ,
    dispatched_at TIMESTAMPTZ,
    dispatch_attempts INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_outbox_pending 
ON task_outbox (created_at) 
WHERE dispatched_at IS NULL;
