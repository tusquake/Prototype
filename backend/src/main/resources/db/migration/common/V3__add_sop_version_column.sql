-- Migration V3: Add version column to sops table for SOP version tracking
ALTER TABLE sops ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;
