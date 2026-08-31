package com.cloudkaptan.sop.config;

import com.cloudkaptan.sop.config.security.RateLimitingFilter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final RateLimitingFilter rateLimitingFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .headers(headers -> headers.frameOptions(HeadersConfigurer.FrameOptionsConfig::disable))
            .cors(Customizer.withDefaults())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/h2-console/**", "/actuator/**", "/error").permitAll()
                .requestMatchers("/finsop/v1/**").permitAll()
                .anyRequest().authenticated()
            )
            // 1. Set local dev authentication context first
            .addFilterBefore(new LocalDevAuthFilter(), UsernamePasswordAuthenticationFilter.class)
            // 2. Evaluate rate limiting directly after authentication context is populated
            .addFilterAfter(rateLimitingFilter, LocalDevAuthFilter.class);

        return http.build();
    }

    public static class LocalDevAuthFilter extends OncePerRequestFilter {
        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
                throws ServletException, IOException {

            String userRole = request.getHeader("X-User-Role");
            String userEmail = request.getHeader("X-User-Email");

            List<SimpleGrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority("ROLE_ADMIN"),
                new SimpleGrantedAuthority("fin_sop_admin"),
                new SimpleGrantedAuthority("fin_sop_ck_india_maker"),
                new SimpleGrantedAuthority("fin_sop_ck_india_checker")
            );

            if ("MAKER".equalsIgnoreCase(userRole)) {
                authorities = List.of(
                    new SimpleGrantedAuthority("ROLE_MAKER"),
                    new SimpleGrantedAuthority("fin_sop_ck_india_maker")
                );
            } else if ("CHECKER".equalsIgnoreCase(userRole)) {
                authorities = List.of(
                    new SimpleGrantedAuthority("ROLE_CHECKER"),
                    new SimpleGrantedAuthority("fin_sop_ck_india_checker")
                );
            }

            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                userEmail != null ? userEmail : "admin@cloudkaptan.com",
                null,
                authorities
            );

            SecurityContextHolder.getContext().setAuthentication(auth);
            filterChain.doFilter(request, response);
        }
    }
}