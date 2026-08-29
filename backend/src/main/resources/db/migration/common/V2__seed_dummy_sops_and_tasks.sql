-- Flyway Seed Data Migration V2: User Master Additions
-- (All SOPs and Tasks start empty so user can create data manually)

INSERT INTO users (user_id, email, full_name, role, entity_code) VALUES
    ('usr-avisek-499', 'avisek.shaw@cloudkaptan.com', 'Avisek Shaw', 'CHECKER', 'CK_INDIA');
