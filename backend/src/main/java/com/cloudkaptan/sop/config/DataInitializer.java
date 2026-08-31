package com.cloudkaptan.sop.config;

import com.cloudkaptan.sop.domain.enums.EntityCode;
import com.cloudkaptan.sop.domain.enums.UserRole;
import com.cloudkaptan.sop.entity.CorporateEntity;
import com.cloudkaptan.sop.entity.User;
import com.cloudkaptan.sop.repository.CorporateEntityRepository;
import com.cloudkaptan.sop.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final CorporateEntityRepository entityRepository;
    private final UserRepository userRepository;

    @Override
    public void run(String... args) {
        log.info("Checking & Initializing master data for FinSOP...");

        // 1. Seed Corporate Entities if empty
        if (entityRepository.count() == 0) {
            log.info("Seeding Corporate Entities...");
            CorporateEntity india = entityRepository.save(CorporateEntity.builder().entityCode(EntityCode.CK_INDIA).entityName("CK India").build());
            CorporateEntity us = entityRepository.save(CorporateEntity.builder().entityCode(EntityCode.CK_US).entityName("CK US").build());
            CorporateEntity uk = entityRepository.save(CorporateEntity.builder().entityCode(EntityCode.CK_UK).entityName("CK UK").build());
            CorporateEntity au = entityRepository.save(CorporateEntity.builder().entityCode(EntityCode.CK_AUSTRALIA).entityName("CK Australia").build());

            // 2. Seed Users
            if (userRepository.count() == 0) {
                log.info("Seeding Initial Users...");
                userRepository.saveAll(List.of(
                    User.builder().userId("usr-manoj-042").email("manoj.agarwal@cloudkaptan.com").fullName("Manoj Agarwal").role(UserRole.ADMIN).entity(us).isActive(true).build(),
                    User.builder().userId("usr-vivek-108").email("vivek.raj@cloudkaptan.com").fullName("Vivek Raj").role(UserRole.MAKER_CHECKER).entity(india).isActive(true).build(),
                    User.builder().userId("usr-mainak-215").email("mainak.gupta@cloudkaptan.com").fullName("Mainak Gupta").role(UserRole.CHECKER).entity(india).isActive(true).build(),
                    User.builder().userId("usr-tushar-304").email("tushar.seth@cloudkaptan.com").fullName("Tushar Seth").role(UserRole.MAKER).entity(uk).isActive(true).build(),
                    User.builder().userId("usr-prayasa-410").email("prayasa.sharma@cloudkaptan.com").fullName("Prayasa Sharma").role(UserRole.MAKER).entity(india).isActive(true).build(),
                    User.builder().userId("usr-avisek-499").email("avisek.shaw@cloudkaptan.com").fullName("Avisek Shaw").role(UserRole.VIEWER).entity(india).isActive(true).build()
                ));
            }
        }
        log.info("Master data initialization complete.");
    }
}
