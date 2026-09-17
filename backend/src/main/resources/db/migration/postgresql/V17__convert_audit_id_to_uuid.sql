-- Flyway Migration V17: Convert audit_logs.audit_id from BIGINT to UUID for GCP Cloud SQL / PostgreSQL compatibility

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Drop existing default sequence on audit_id if present
ALTER TABLE audit_logs ALTER COLUMN audit_id DROP DEFAULT;

-- 2. Alter column type from BIGINT to UUID, deterministically converting numeric IDs into valid UUIDs
ALTER TABLE audit_logs 
    ALTER COLUMN audit_id TYPE UUID 
    USING ('00000000-0000-0000-0000-' || lpad(audit_id::text, 12, '0'))::uuid;

-- 3. Set default value to gen_random_uuid() for future inserts
ALTER TABLE audit_logs ALTER COLUMN audit_id SET DEFAULT gen_random_uuid();
