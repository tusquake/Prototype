package com.cloudkaptan.sop.repository;

import com.cloudkaptan.sop.entity.RequiredDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface RequiredDocumentRepository
        extends JpaRepository<RequiredDocument, UUID> {
}