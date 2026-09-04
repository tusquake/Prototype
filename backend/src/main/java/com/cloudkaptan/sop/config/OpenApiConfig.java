package com.cloudkaptan.sop.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("FinSOP Enterprise API Specification")
                        .version("1.0.0")
                        .description("Financial Standard Operating Procedure & Compliance Governance Platform REST APIs. " +
                                "Provides workflow execution, GCS document attachments, SOP lifecycle governance, " +
                                "category access permissions, and audit trails.")
                        .contact(new Contact()
                                .name("FinSOP Engineering Team")
                                .email("engineering@cloudkaptan.com")
                                .url("https://finsop.cloudkaptan.com"))
                        .license(new License()
                                .name("CloudKaptan Enterprise License")
                                .url("https://cloudkaptan.com/terms")))
                .servers(List.of(
                        new Server().url("http://localhost:8080").description("Local Development Server"),
                        new Server().url("https://finsop.cloudkaptan.com").description("Production Cloud Run Server")
                ))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth").addList("X-User-Id"))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth", new SecurityScheme()
                                .name("bearerAuth")
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("OAuth2 JWT Bearer Token"))
                        .addSecuritySchemes("X-User-Id", new SecurityScheme()
                                .name("X-User-Id")
                                .type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.HEADER)
                                .description("User Identity Header (e.g., usr-manoj-042)"))
                        .addSecuritySchemes("X-User-Role", new SecurityScheme()
                                .name("X-User-Role")
                                .type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.HEADER)
                                .description("User Role Header (ADMIN | MAKER | CHECKER | VIEWER)"))
                        .addSecuritySchemes("X-User-Email", new SecurityScheme()
                                .name("X-User-Email")
                                .type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.HEADER)
                                .description("User Email Header")));
    }
}
