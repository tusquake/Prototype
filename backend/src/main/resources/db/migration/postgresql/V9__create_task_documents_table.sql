CREATE TABLE IF NOT EXISTS task_documents (
    document_id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    gcs_object_path VARCHAR(512) NOT NULL,
    file_size BIGINT NOT NULL,
    content_type VARCHAR(128),
    uploaded_by_id VARCHAR(64) NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    upload_timing VARCHAR(32),

    CONSTRAINT fk_task_documents_task FOREIGN KEY (task_id) REFERENCES tasks (task_id) ON DELETE CASCADE,
    CONSTRAINT fk_task_documents_uploaded_by FOREIGN KEY (uploaded_by_id) REFERENCES users (user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_documents_task_id ON task_documents(task_id);
CREATE INDEX IF NOT EXISTS idx_task_documents_uploaded_by ON task_documents(uploaded_by_id);