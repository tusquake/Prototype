-- Migration V8: Add task_reassignment_history table to track individual task reassignments and worked-until timestamps
CREATE TABLE IF NOT EXISTS task_reassignment_history (
    history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    previous_maker_ids TEXT,
    previous_maker_names TEXT,
    new_maker_ids TEXT,
    new_maker_names TEXT,
    previous_checker_ids TEXT,
    previous_checker_names TEXT,
    new_checker_ids TEXT,
    new_checker_names TEXT,
    reassigned_by VARCHAR(64) NOT NULL,
    reassigned_by_name VARCHAR(128),
    worked_until TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_reassign_task ON task_reassignment_history(task_id);
