-- Migration V10: Add user_hierarchy table for organizational manager/subordinate task access control

CREATE TABLE IF NOT EXISTS user_hierarchy (
    hierarchy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id VARCHAR(64) NOT NULL,
    subordinate_id VARCHAR(64) NOT NULL,
    can_read_tasks BOOLEAN NOT NULL DEFAULT TRUE,
    can_write_tasks BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_manager_subordinate UNIQUE (manager_id, subordinate_id)
);

CREATE INDEX IF NOT EXISTS idx_user_hierarchy_manager ON user_hierarchy(manager_id);
CREATE INDEX IF NOT EXISTS idx_user_hierarchy_subordinate ON user_hierarchy(subordinate_id);
