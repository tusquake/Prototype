package com.cloudkaptan.sop;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(exclude = {FlywayAutoConfiguration.class})
@EnableScheduling
@EnableAsync
public class FinSopApplication {

    public static void main(String[] args) {
        SpringApplication.run(FinSopApplication.class, args);
    }
}
