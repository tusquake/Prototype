-- Flyway Migration V19: Create dedicated sop_template_events table for SOP Template lifecycle & blueprint history
CREATE TABLE IF NOT EXISTS sop_template_events (
    event_id BIGSERIAL PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES sop_templates(template_id) ON DELETE CASCADE,
    actor_id VARCHAR(64) REFERENCES users(user_id),
    action VARCHAR(64) NOT NULL,
    from_status VARCHAR(32),
    to_status VARCHAR(32),
    comment VARCHAR(512),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sop_template_events_template ON sop_template_events(template_id);
