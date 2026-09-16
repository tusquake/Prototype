-- Flyway Migration V16: SOP Template and Task Template tables
-- Introduces blueprint/template layer for the SOP Template + Instance model
 
-- 1. SOP Templates — pure blueprint definitions, not real SOP executions
CREATE TABLE IF NOT EXISTS sop_templates (
    template_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_code     VARCHAR(64) NOT NULL UNIQUE,
    title             VARCHAR(255) NOT NULL,
    description       TEXT,
    process_category  VARCHAR(128) NOT NULL,
    entity_code       VARCHAR(32) NOT NULL REFERENCES entities(entity_code),
    frequency         VARCHAR(32) NOT NULL DEFAULT 'MONTHLY',
    is_recurring      BOOLEAN NOT NULL DEFAULT FALSE,
    -- Recurrence config as JSON: weekdays[], dayOfMonth, months[], monthOfYear, dayOfMonth
    recurrence_config TEXT,
    due_day_offset    INT NOT NULL DEFAULT 0,
    -- effectiveFrom: when scheduler starts generating SOP instances from this template
    effective_from    DATE NOT NULL,
    -- effectiveUntil: when template retires (null = indefinite)
    effective_until   DATE,
    status            VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    created_by        VARCHAR(64) NOT NULL REFERENCES users(user_id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
 
-- SOP Template default user pools
CREATE TABLE IF NOT EXISTS sop_template_maker_pool (
    template_id UUID NOT NULL REFERENCES sop_templates(template_id) ON DELETE CASCADE,
    maker_id    VARCHAR(64) NOT NULL
);
 
CREATE TABLE IF NOT EXISTS sop_template_checker_pool (
    template_id UUID NOT NULL REFERENCES sop_templates(template_id) ON DELETE CASCADE,
    checker_id  VARCHAR(64) NOT NULL
);
 
-- 2. Task Templates — step blueprints, not real task executions
CREATE TABLE IF NOT EXISTS task_templates (
    task_template_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id       UUID NOT NULL REFERENCES sop_templates(template_id) ON DELETE CASCADE,
    step_sequence     INT NOT NULL,
    task_name         VARCHAR(255) NOT NULL,
    description       TEXT,
    dependency_mode   VARCHAR(64) NOT NULL DEFAULT 'INDEPENDENT',
    priority          VARCHAR(32) NOT NULL DEFAULT 'Medium',
    -- ETA fields: relative days from SOP instance targetStartDate (user-friendly, not "offsets")
    eta_start_day     INT NOT NULL DEFAULT 0,
    eta_end_day       INT NOT NULL DEFAULT 7,
    sla_hours         INT NOT NULL DEFAULT 24,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (template_id, step_sequence)
);
 
-- Task Template user pools (subsets of SOP template pools)
CREATE TABLE IF NOT EXISTS task_template_maker_pool (
    task_template_id UUID NOT NULL REFERENCES task_templates(task_template_id) ON DELETE CASCADE,
    maker_id         VARCHAR(64) NOT NULL
);
 
CREATE TABLE IF NOT EXISTS task_template_checker_pool (
    task_template_id UUID NOT NULL REFERENCES task_templates(task_template_id) ON DELETE CASCADE,
    checker_id       VARCHAR(64) NOT NULL
);
 
-- Required document names declared at the task template level
CREATE TABLE IF NOT EXISTS task_template_required_docs (
    task_template_id UUID NOT NULL REFERENCES task_templates(task_template_id) ON DELETE CASCADE,
    document_name    VARCHAR(255) NOT NULL
);
 
-- 3. Link generated SOP instances and Task instances back to their templates
ALTER TABLE sops  ADD COLUMN IF NOT EXISTS template_id      UUID REFERENCES sop_templates(template_id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_template_id UUID REFERENCES task_templates(task_template_id);
 
-- Indexes
CREATE INDEX IF NOT EXISTS idx_sop_templates_category     ON sop_templates(process_category);
CREATE INDEX IF NOT EXISTS idx_sop_templates_status       ON sop_templates(status);
CREATE INDEX IF NOT EXISTS idx_sop_templates_effective    ON sop_templates(effective_from, effective_until);
CREATE INDEX IF NOT EXISTS idx_task_templates_template    ON task_templates(template_id);
CREATE INDEX IF NOT EXISTS idx_sops_template              ON sops(template_id);
CREATE INDEX IF NOT EXISTS idx_tasks_task_template        ON tasks(task_template_id);
 
 