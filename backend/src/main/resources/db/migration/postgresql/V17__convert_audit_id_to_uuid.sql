-- Flyway Migration V17: Convert audit_logs.audit_id from BIGINT to UUID for GCP Cloud SQL / PostgreSQL compatibility
-- Handles immutability trigger protection gracefully by disabling triggers during column rewrite.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Temporarily disable immutability trigger to allow DDL column type rewrite
ALTER TABLE audit_logs DISABLE TRIGGER trg_audit_logs_immutable;

-- 2. Drop existing sequence default
ALTER TABLE audit_logs ALTER COLUMN audit_id DROP DEFAULT;

-- 3. Alter column type from BIGINT to UUID, deterministically converting numeric IDs into valid UUIDs
ALTER TABLE audit_logs 
    ALTER COLUMN audit_id TYPE UUID 
    USING ('00000000-0000-0000-0000-' || lpad(audit_id::text, 12, '0'))::uuid;

-- 4. Set default value to gen_random_uuid() for future inserts
ALTER TABLE audit_logs ALTER COLUMN audit_id SET DEFAULT gen_random_uuid();

-- 5. Re-enable immutability trigger immediately to enforce append-only security
ALTER TABLE audit_logs ENABLE TRIGGER trg_audit_logs_immutable;
