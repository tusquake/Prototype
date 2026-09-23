-- Flyway Migration V21: Allow transaction-scoped session override for administrative test data deletion
-- Updates prevent_audit_tampering() trigger function to check for 'sop.allow_deletion' session GUC setting.

CREATE OR REPLACE FUNCTION prevent_audit_tampering()
RETURNS TRIGGER AS $$
BEGIN
    IF current_setting('sop.allow_deletion', true) = 'true' THEN
        RETURN OLD;
    END IF;
    RAISE EXCEPTION 'Audit Enforcement Violation: Audit and event records are strictly immutable and append-only. Updates and deletions are forbidden.';
END;
$$ LANGUAGE plpgsql;
