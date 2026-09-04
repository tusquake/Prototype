package com.cloudkaptan.sop.service;

import com.google.cloud.ReadChannel;
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.nio.channels.Channels;

@Service
@ConditionalOnProperty(name = "app.storage.type", havingValue = "gcs")
public class GcsStorageServiceImpl implements StorageService {

    private static final Logger log = LoggerFactory.getLogger(GcsStorageServiceImpl.class);

    private final Storage storage;

    @Value("${gcp.gcs.bucket-name:finsop-task-documents}")
    private String bucketName;

    public GcsStorageServiceImpl(Storage storage) {
        this.storage = storage;
    }

    @Override
    public String uploadFile(String objectPath, InputStream inputStream, String contentType, long contentLength) {
        try {
            BlobId blobId = BlobId.of(bucketName, objectPath);
            BlobInfo blobInfo = BlobInfo.newBuilder(blobId)
                    .setContentType(contentType != null ? contentType : "application/octet-stream")
                    .build();

            log.info("Uploading object to GCS bucket '{}' at path '{}'", bucketName, objectPath);
            storage.createFrom(blobInfo, inputStream);
            return objectPath;
        } catch (Exception e) {
            log.error("Failed to upload object to GCS path '{}': {}", objectPath, e.getMessage(), e);
            throw new RuntimeException("GCS storage upload failed: " + e.getMessage(), e);
        }
    }

    @Override
    public InputStream downloadFileStream(String objectPath) {
        try {
            BlobId blobId = BlobId.of(bucketName, objectPath);
            log.info("Downloading object stream from GCS bucket '{}' at path '{}'", bucketName, objectPath);
            ReadChannel reader = storage.reader(blobId);
            return Channels.newInputStream(reader);
        } catch (Exception e) {
            log.error("Failed to download object stream from GCS path '{}': {}", objectPath, e.getMessage(), e);
            throw new RuntimeException("GCS storage download failed: " + e.getMessage(), e);
        }
    }

    @Override
    public boolean deleteFile(String objectPath) {
        try {
            BlobId blobId = BlobId.of(bucketName, objectPath);
            log.info("Deleting object from GCS bucket '{}' at path '{}'", bucketName, objectPath);
            return storage.delete(blobId);
        } catch (Exception e) {
            log.error("Failed to delete object from GCS path '{}': {}", objectPath, e.getMessage(), e);
            return false;
        }
    }
}
