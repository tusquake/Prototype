package com.cloudkaptan.sop.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;

@Configuration
public class GcsConfig {

    private static final Logger log = LoggerFactory.getLogger(GcsConfig.class);

    @Value("${gcp.gcs.project-id:finsop-gcp-project}")
    private String projectId;

    @Value("${gcp.gcs.credentials-path:}")
    private String credentialsPath;

    @Bean
    public Storage storage() {
        try {
            StorageOptions.Builder builder = StorageOptions.newBuilder().setProjectId(projectId);
            
            if (credentialsPath != null && !credentialsPath.trim().isEmpty()) {
                log.info("Initializing GCS Storage client using credentials path: {}", credentialsPath);
                try (InputStream is = new FileInputStream(credentialsPath)) {
                    builder.setCredentials(GoogleCredentials.fromStream(is));
                }
            } else {
                log.info("Initializing GCS Storage client using Application Default Credentials (ADC) or default options");
                try {
                    builder.setCredentials(GoogleCredentials.getApplicationDefault());
                } catch (Exception e) {
                    log.warn("ADC not found. Initializing unauthenticated/default StorageOptions: {}", e.getMessage());
                }
            }
            return builder.build().getService();
        } catch (IOException e) {
            log.error("Failed to initialize Google Cloud Storage client: {}", e.getMessage());
            return StorageOptions.getDefaultInstance().getService();
        }
    }
}
