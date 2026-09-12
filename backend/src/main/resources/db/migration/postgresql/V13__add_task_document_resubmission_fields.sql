-- V13__add_task_document_resubmission_fields.sql
ALTER TABLE task_documents 
ADD COLUMN IF NOT EXISTS is_resubmission BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS replaced_document_id UUID REFERENCES task_documents(document_id);
