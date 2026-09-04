package com.cloudkaptan.sop.service;

import com.cloudkaptan.sop.config.security.RateLimitConfig;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bucket;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
public class RateLimiterService {

    private final RateLimitConfig rateLimitConfig;

    // In-memory cache to store buckets per key (automatically expires inactive buckets)
    private final Cache<String, Bucket> standardBuckets = Caffeine.newBuilder()
            .expireAfterAccess(1, TimeUnit.HOURS)
            .maximumSize(10_000)
            .build();

    private final Cache<String, Bucket> authBuckets = Caffeine.newBuilder()
            .expireAfterAccess(1, TimeUnit.HOURS)
            .maximumSize(10_000)
            .build();

    public RateLimiterService(RateLimitConfig rateLimitConfig) {
        this.rateLimitConfig = rateLimitConfig;
    }

    public boolean isRateLimitingEnabled() {
        return rateLimitConfig.isEnabled();
    }

    public Bucket resolveStandardBucket(String clientKey) {
        return standardBuckets.get(clientKey, key -> rateLimitConfig.createStandardBucket());
    }

    public Bucket resolveAuthBucket(String clientKey) {
        return authBuckets.get(clientKey, key -> rateLimitConfig.createAuthBucket());
    }
}