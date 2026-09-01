-- Migration: V5__add_process_category_activity_logs.sql
CREATE TABLE IF NOT EXISTS process_category_activity_logs (
    id UUID PRIMARY KEY,
    category_code VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    actor_id VARCHAR(64) NOT NULL,
    actor_name VARCHAR(128),
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cat_activity_code ON process_category_activity_logs(category_code);
