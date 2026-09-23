-- V21: Convert task_template_required_docs into an entity table
-- and associate task documents with their required document.

-- ============================================================
-- 1. Give every required document its own UUID
-- ============================================================

ALTER TABLE task_template_required_docs
    ADD COLUMN required_document_id UUID;

UPDATE task_template_required_docs
SET required_document_id = gen_random_uuid()
WHERE required_document_id IS NULL;

ALTER TABLE task_template_required_docs
    ALTER COLUMN required_document_id SET NOT NULL;

ALTER TABLE task_template_required_docs
    ADD CONSTRAINT pk_task_template_required_docs
    PRIMARY KEY (required_document_id);


-- ============================================================
-- 2. Keep the relationship with TaskTemplate
-- ============================================================

ALTER TABLE task_template_required_docs
    ADD CONSTRAINT fk_task_template_required_docs_template
    FOREIGN KEY (task_template_id)
    REFERENCES task_templates(task_template_id);


-- ============================================================
-- 3. Associate TaskDocument with RequiredDocument
-- ============================================================

ALTER TABLE task_documents
    ADD COLUMN required_document_id UUID;

ALTER TABLE task_documents
    ADD CONSTRAINT fk_task_documents_required_document
    FOREIGN KEY (required_document_id)
    REFERENCES task_template_required_docs(required_document_id);