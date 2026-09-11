package com.cloudkaptan.sop.config;

import io.minio.MinioClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MinioConfig {

    private static final Logger log = LoggerFactory.getLogger(MinioConfig.class);

    @Value("${app.storage.minio-endpoint:http://localhost:9000}")
    private String minioEndpoint;

    @Value("${app.storage.minio-access-key:minioadmin}")
    private String accessKey;

    @Value("${app.storage.minio-secret-key:minioadmin}")
    private String secretKey;

    @Bean
    public MinioClient minioClient() {
        try {
            log.info("Initializing MinIO S3 Client connecting to endpoint '{}'", minioEndpoint);
            return MinioClient.builder()
                    .endpoint(minioEndpoint)
                    .credentials(accessKey, secretKey)
                    .build();
        } catch (Exception e) {
            log.error("Failed to initialize MinIO S3 client: {}", e.getMessage(), e);
            throw new RuntimeException("MinIO initialization failed", e);
        }
    }
}
