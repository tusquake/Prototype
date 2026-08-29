-- PostgreSQL Database Level Audit Immutability Protection

CREATE OR REPLACE FUNCTION prevent_audit_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit Enforcement Violation: Audit and event records are strictly immutable and append-only. Updates and deletions are forbidden.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_logs_immutable
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_tampering();

CREATE TRIGGER trg_task_events_immutable
BEFORE UPDATE OR DELETE ON task_events
FOR EACH ROW EXECUTE FUNCTION prevent_audit_tampering();

CREATE TRIGGER trg_task_comments_immutable
BEFORE UPDATE OR DELETE ON task_comments
FOR EACH ROW EXECUTE FUNCTION prevent_audit_tampering();
