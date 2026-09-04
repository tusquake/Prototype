package com.cloudkaptan.sop.config.security;

import com.cloudkaptan.sop.service.RateLimiterService;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private final RateLimiterService rateLimiterService;

    public RateLimitingFilter(RateLimiterService rateLimiterService) {
        this.rateLimiterService = rateLimiterService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        // Check if rate limiting is enabled via configuration/environment
        if (!rateLimiterService.isRateLimitingEnabled()) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();

        // 1. Determine Key: Use User ID from JWT if logged in, otherwise use Client IP
        String clientKey = getClientKey(request);

        // 2. Select Bucket based on route
        Bucket bucket;
        if (path.startsWith("/api/v1/auth")) {
            bucket = rateLimiterService.resolveAuthBucket("auth_" + clientKey);
        } else {
            bucket = rateLimiterService.resolveStandardBucket("api_" + clientKey);
        }

        // 3. Consume 1 token from bucket
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

        if (probe.isConsumed()) {
            // Pass standard headers for clients to inspect limits
            response.setHeader("X-RateLimit-Remaining", String.valueOf(probe.getRemainingTokens()));
            filterChain.doFilter(request, response);
        } else {
            // Rate limit exceeded: Return HTTP 429
            long waitForRefillSeconds = probe.getNanosToWaitForRefill() / 1_000_000_000;
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setHeader("X-RateLimit-Retry-After-Seconds", String.valueOf(waitForRefillSeconds));

            String errorJson = String.format(
                "{\"status\": 429, \"error\": \"Too Many Requests\", \"message\": \"Rate limit exceeded. Try again in %d seconds.\"}",
                waitForRefillSeconds
            );
            response.getWriter().write(errorJson);
        }
    }

    private String getClientKey(HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            return jwt.getSubject(); // Identify by User ID
        }
        
        // Fallback to IP Address (Handles proxies behind Cloud Run/Load Balancer)
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}