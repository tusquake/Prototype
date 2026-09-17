-- Flyway Migration V18: Drop invalid (sop_id, period_key) constraint on tasks table and replace with (sop_id, task_template_id)

-- 1. Drop old invalid constraints that prevented an SOP instance from having multiple task steps
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS uq_sop_period;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS uq_sop_version_period;

-- 2. Add correct constraint ensuring each task template step is created once per SOP instance
ALTER TABLE tasks ADD CONSTRAINT uq_sop_task_template UNIQUE (sop_id, task_template_id);
