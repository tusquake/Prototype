-- Flyway Migration V20: Update task_template_required_docs schema for structured required documents
-- Replaces document_name with name and description columns

ALTER TABLE task_template_required_docs ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE task_template_required_docs ADD COLUMN IF NOT EXISTS description TEXT;

-- Migrate existing document_name values to name column if document_name exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'task_template_required_docs' 
          AND column_name = 'document_name'
    ) THEN
        UPDATE task_template_required_docs 
        SET name = document_name 
        WHERE name IS NULL AND document_name IS NOT NULL;

        ALTER TABLE task_template_required_docs 
        DROP COLUMN document_name;
    END IF;
END $$;
