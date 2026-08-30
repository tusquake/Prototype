-- Flyway Schema Migration V1: FinSOP Database Initialization

CREATE TABLE entities (
    entity_code VARCHAR(32) PRIMARY KEY,
    entity_name VARCHAR(128) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE users (
    user_id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(128) NOT NULL UNIQUE,
    full_name VARCHAR(128) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('ADMIN', 'MAKER', 'CHECKER')),
    entity_code VARCHAR(32) NOT NULL REFERENCES entities(entity_code),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE sops (
    sop_id UUID PRIMARY KEY,
    sop_code VARCHAR(64) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    process_category VARCHAR(128) NOT NULL,
    entity_code VARCHAR(32) NOT NULL REFERENCES entities(entity_code),
    frequency VARCHAR(32) NOT NULL CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL')),
    due_day_offset INT NOT NULL DEFAULT 1,
    default_maker_id VARCHAR(64) NOT NULL REFERENCES users(user_id),
    default_checker_id VARCHAR(64) NOT NULL REFERENCES users(user_id),
    status VARCHAR(32) NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
    created_by VARCHAR(64) NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE tasks (
    task_id UUID PRIMARY KEY,
    version BIGINT NOT NULL DEFAULT 0,
    record_no VARCHAR(64) NOT NULL UNIQUE,
    sop_id UUID NOT NULL REFERENCES sops(sop_id) ON DELETE CASCADE,
    period_key VARCHAR(32) NOT NULL,
    entity_code VARCHAR(32) NOT NULL REFERENCES entities(entity_code),
    maker_id VARCHAR(64) NOT NULL REFERENCES users(user_id),
    checker_id VARCHAR(64) NOT NULL REFERENCES users(user_id),
    status VARCHAR(32) NOT NULL CHECK (status IN ('OPEN', 'PENDING_REVIEW', 'APPROVED', 'REJECTED')),
    due_date DATE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_sop_period UNIQUE (sop_id, period_key)
);

CREATE TABLE task_events (
    event_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    actor_id VARCHAR(64) NOT NULL REFERENCES users(user_id),
    action VARCHAR(64) NOT NULL,
    from_status VARCHAR(32),
    to_status VARCHAR(32) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE task_comments (
    comment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    author_id VARCHAR(64) NOT NULL REFERENCES users(user_id),
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE audit_logs (
    audit_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_id VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    correlation_id VARCHAR(64),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Performance Indexes
CREATE INDEX idx_tasks_entity_status ON tasks(entity_code, status);
CREATE INDEX idx_tasks_maker_status ON tasks(maker_id, status);
CREATE INDEX idx_tasks_checker_status ON tasks(checker_id, status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_sops_entity ON sops(entity_code);
CREATE INDEX idx_task_events_task ON task_events(task_id);

-- Initial Master Data Seeding
INSERT INTO entities (entity_code, entity_name) VALUES
    ('CK_INDIA', 'CK India'),
    ('CK_US', 'CK US'),
    ('CK_UK', 'CK UK'),
    ('CK_AUSTRALIA', 'CK Australia');

INSERT INTO users (user_id, email, full_name, role, entity_code) VALUES
    ('usr-manoj-042', 'manoj.agarwal@cloudkaptan.com', 'Manoj Agarwal', 'ADMIN', 'CK_US'),
    ('usr-vivek-108', 'vivek.raj@cloudkaptan.com', 'Vivek Raj', 'CHECKER', 'CK_INDIA'),
    ('usr-mainak-215', 'mainak.gupta@cloudkaptan.com', 'Mainak Gupta', 'CHECKER', 'CK_INDIA'),
    ('usr-tushar-304', 'tushar.seth@cloudkaptan.com', 'Tushar Seth', 'MAKER', 'CK_UK'),
    ('usr-prayasa-410', 'prayasa.sharma@cloudkaptan.com', 'Prayasa Sharma', 'MAKER', 'CK_INDIA');
