ALTER TABLE task_documents
    ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW',
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS actioned_by_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS actioned_by_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS actioned_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_task_documents_status ON task_documents(status);
