package com.cloudkaptan.sop.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Service
@ConditionalOnProperty(name = "app.storage.type", havingValue = "local", matchIfMissing = true)
public class LocalStorageServiceImpl implements StorageService {

    private static final Logger log = LoggerFactory.getLogger(LocalStorageServiceImpl.class);

    @Value("${app.storage.local-dir:./storage_uploads}")
    private String localDir;

    @Override
    public String uploadFile(String objectPath, InputStream inputStream, String contentType, long contentLength) {
        try {
            Path targetPath = Paths.get(localDir, objectPath);
            Files.createDirectories(targetPath.getParent());

            log.info("Saving file to local storage path '{}'", targetPath.toAbsolutePath());
            try (OutputStream os = new FileOutputStream(targetPath.toFile())) {
                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = inputStream.read(buffer)) != -1) {
                    os.write(buffer, 0, bytesRead);
                }
            }
            return objectPath;
        } catch (Exception e) {
            log.error("Failed to upload file to local path '{}': {}", objectPath, e.getMessage(), e);
            throw new RuntimeException("Local storage upload failed: " + e.getMessage(), e);
        }
    }

    @Override
    public InputStream downloadFileStream(String objectPath) {
        try {
            Path targetPath = Paths.get(localDir, objectPath);
            log.info("Reading file stream from local storage path '{}'", targetPath.toAbsolutePath());
            File file = targetPath.toFile();
            if (!file.exists()) {
                throw new IllegalArgumentException("File not found at path: " + targetPath.toAbsolutePath());
            }
            return new FileInputStream(file);
        } catch (Exception e) {
            log.error("Failed to read file from local path '{}': {}", objectPath, e.getMessage(), e);
            throw new RuntimeException("Local storage download failed: " + e.getMessage(), e);
        }
    }

    @Override
    public boolean deleteFile(String objectPath) {
        try {
            Path targetPath = Paths.get(localDir, objectPath);
            log.info("Deleting file from local storage path '{}'", targetPath.toAbsolutePath());
            return Files.deleteIfExists(targetPath);
        } catch (Exception e) {
            log.error("Failed to delete file from local path '{}': {}", objectPath, e.getMessage(), e);
            return false;
        }
    }
}
