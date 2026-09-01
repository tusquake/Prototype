-- Migration V4: Add user_sop_category_permissions table for Category RBAC & SoD Governance
CREATE TABLE IF NOT EXISTS user_sop_category_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(64) NOT NULL,
    process_category VARCHAR(64) NOT NULL,
    can_create_sop BOOLEAN NOT NULL DEFAULT FALSE,
    can_approve_sop BOOLEAN NOT NULL DEFAULT FALSE,
    can_make_task BOOLEAN NOT NULL DEFAULT FALSE,
    can_check_task BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_category UNIQUE (user_id, process_category)
);

CREATE INDEX IF NOT EXISTS idx_user_category_perm_user ON user_sop_category_permissions(user_id);
