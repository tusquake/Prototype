-- Migration V1_2: Add is_deleted column to user_notifications table for soft delete
ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE NOT NULL;
UPDATE user_notifications SET is_deleted = false WHERE is_deleted IS NULL;
