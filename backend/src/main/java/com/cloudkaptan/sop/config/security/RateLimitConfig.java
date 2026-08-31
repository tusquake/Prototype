package com.cloudkaptan.sop.config.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class RateLimitConfig {

    /**
     * Standard tier: 5 requests per minute with greedy refill.
     */
    public Bucket createStandardBucket() {
        Bandwidth limit = Bandwidth.classic(5, Refill.greedy(100, Duration.ofMinutes(1)));
        return Bucket.builder().addLimit(limit).build();
    }

    /**
     * Auth tier: 5 requests per minute to prevent brute-force attacks.
     */
    public Bucket createAuthBucket() {
        Bandwidth limit = Bandwidth.classic(5, Refill.greedy(5, Duration.ofMinutes(1)));
        return Bucket.builder().addLimit(limit).build();
    }
}