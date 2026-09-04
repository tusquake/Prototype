package com.cloudkaptan.sop.config.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "app.rate-limiting")
public class RateLimitConfig {

    private boolean enabled = true;
    private LimitProperties standard = new LimitProperties(100, 100, 1);
    private LimitProperties auth = new LimitProperties(10, 10, 1);

    @Getter
    @Setter
    public static class LimitProperties {
        private int capacity = 100;
        private int refillTokens = 100;
        private int refillDurationMinutes = 1;

        public LimitProperties() {}

        public LimitProperties(int capacity, int refillTokens, int refillDurationMinutes) {
            this.capacity = capacity;
            this.refillTokens = refillTokens;
            this.refillDurationMinutes = refillDurationMinutes;
        }
    }

    public Bucket createStandardBucket() {
        Bandwidth limit = Bandwidth.classic(
                standard.getCapacity(),
                Refill.greedy(standard.getRefillTokens(), Duration.ofMinutes(standard.getRefillDurationMinutes()))
        );
        return Bucket.builder().addLimit(limit).build();
    }

    public Bucket createAuthBucket() {
        Bandwidth limit = Bandwidth.classic(
                auth.getCapacity(),
                Refill.greedy(auth.getRefillTokens(), Duration.ofMinutes(auth.getRefillDurationMinutes()))
        );
        return Bucket.builder().addLimit(limit).build();
    }
}