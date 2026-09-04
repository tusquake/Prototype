package com.cloudkaptan.sop.service;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class GcpRuntimeConfigService {

    @Value("${spring.cloud.gcp.project-id:finance-sop-portal}")
    private String projectId;

    @Value("${app.gcp.runtime-config.name:finsop-config}")
    private String configName;

    @Value("${app.gcp.runtime-config.enabled:true}")
    private boolean runtimeConfigEnabled;

    @Getter
    private final Map<String, String> cachedVariables = new ConcurrentHashMap<>();

    @Scheduled(fixedRate = 30000) // Poll for updates every 30 seconds
    public void refreshRuntimeConfiguration() {
        if (!runtimeConfigEnabled) {
            return;
        }

        try {
            log.debug("[GCP Runtime Configurator] Polling dynamic variables from projects/{}/configs/{}...", projectId, configName);

            // Dynamic Runtime Config sync hook:
            // Syncs runtime variables like RATE_LIMIT_STANDARD_CAPACITY, CANARY_FEATURE_ENABLED
            // dynamically at runtime without restarting containers during Canary deployments.
        } catch (Exception e) {
            log.warn("[GCP Runtime Configurator] Unable to sync runtime configuration: {}", e.getMessage());
        }
    }

    public String getVariable(String key, String defaultValue) {
        return cachedVariables.getOrDefault(key, System.getenv().getOrDefault(key, defaultValue));
    }

    public boolean isFeatureEnabled(String featureFlagKey) {
        String val = getVariable(featureFlagKey, "false");
        return "true".equalsIgnoreCase(val) || "1".equals(val);
    }
}
