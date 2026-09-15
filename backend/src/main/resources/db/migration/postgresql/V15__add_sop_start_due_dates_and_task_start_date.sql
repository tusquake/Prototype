-- Flyway Migration V15: Add start_date and due_date to sops table, and start_date to tasks table

ALTER TABLE sops ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE sops ADD COLUMN IF NOT EXISTS due_date DATE;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date DATE;
