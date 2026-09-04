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
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final CorporateEntityRepository entityRepository;
    private final UserRepository userRepository;

    // 13 new non-admin VIEWER users — org-wide (entity = CK_INDIA as default)
    private static final List<String[]> NEW_VIEWER_USERS = List.of(
        // { userId, email, fullName }
        new String[]{"usr-anirban-001",  "anirban.paul@cloudkaptan.com",          "Anirban Paul"},
        new String[]{"usr-annu-002",     "annu.shaw@cloudkaptan.com",             "Annu Shaw"},
        new String[]{"usr-avisek2-003",  "avisek.shaw@cloudkaptan.com",           "Avisek Shaw"},
        new String[]{"usr-ayush-004",    "ayush.pandey@cloudkaptan.com",          "Ayush Pandey"},
        new String[]{"usr-debajyo-005",  "debajyoti.dattagupta@cloudkaptan.com",  "Debajyoti Dattagupta"},
        new String[]{"usr-isha-006",     "isha.prasad@cloudkaptan.com",           "Isha Prasad"},
        new String[]{"usr-king-007",     "kingshuk.roy@cloudkaptan.com",          "Kingshuk Roy"},
        new String[]{"usr-moit-008",     "moitrayee.dutta@cloudkaptan.com",       "Moitrayee Dutta"},
        new String[]{"usr-nishan-009",   "nishan.mandal@cloudkaptan.com",         "Nishan Mandal"},
        new String[]{"usr-rounok-010",   "rounok.das@cloudkaptan.com",            "Rounok Das"},
        new String[]{"usr-sanjeev-011",  "sanjeev.kumar@cloudkaptan.com",         "Sanjeev Kumar"},
        new String[]{"usr-sayant-012",   "sayantan.ghosh@cloudkaptan.com",        "Sayantan Ghosh"},
        new String[]{"usr-shreya-013",   "shreya.singh@cloudkaptan.com",          "Shreya Singh"}
    );

    @Override
    @Transactional
    public void run(String... args) {
        log.info("Checking & Initializing master data for FinSOP...");

        // 1. Seed Corporate Entities if empty
        if (entityRepository.count() == 0) {
            log.info("Seeding Corporate Entities...");
            CorporateEntity india = entityRepository.save(CorporateEntity.builder().entityCode(EntityCode.CK_INDIA).entityName("CK India").build());
            CorporateEntity us    = entityRepository.save(CorporateEntity.builder().entityCode(EntityCode.CK_US).entityName("CK US").build());
            CorporateEntity uk    = entityRepository.save(CorporateEntity.builder().entityCode(EntityCode.CK_UK).entityName("CK UK").build());
            CorporateEntity au    = entityRepository.save(CorporateEntity.builder().entityCode(EntityCode.CK_AUSTRALIA).entityName("CK Australia").build());

            // 2. Seed core users
            if (userRepository.count() == 0) {
                log.info("Seeding Initial Users...");
                userRepository.saveAll(List.of(
                    User.builder().userId("usr-manoj-042").email("manoj.agarwal@cloudkaptan.com").fullName("Manoj Agarwal").role(UserRole.ADMIN).entity(us).isActive(true).build(),
                    User.builder().userId("usr-vivek-108").email("vivek.raj@cloudkaptan.com").fullName("Vivek Raj").role(UserRole.VIEWER).entity(india).isActive(true).build(),
                    User.builder().userId("usr-mainak-215").email("mainak.gupta@cloudkaptan.com").fullName("Mainak Gupta").role(UserRole.VIEWER).entity(india).isActive(true).build(),
                    User.builder().userId("usr-tushar-304").email("tushar.seth@cloudkaptan.com").fullName("Tushar Seth").role(UserRole.VIEWER).entity(uk).isActive(true).build(),
                    User.builder().userId("usr-prayasa-410").email("prayasa.sharma@cloudkaptan.com").fullName("Prayasa Sharma").role(UserRole.VIEWER).entity(india).isActive(true).build(),
                    User.builder().userId("usr-avisek-499").email("avisek.shaw@cloudkaptan.com").fullName("Avisek Shaw").role(UserRole.VIEWER).entity(india).isActive(true).build()
                ));
            }
        }

        // 3. Seed the 13 new VIEWER users (safe to run every restart — idempotent)
        seedNewViewerUsers();

        log.info("Master data initialization complete.");
    }

    private void seedNewViewerUsers() {
        CorporateEntity india = entityRepository.findById(EntityCode.CK_INDIA)
                .or(() -> entityRepository.findAll().stream().findFirst())
                .orElse(null);

        if (india == null) {
            log.warn("[DataInitializer] No entity found — skipping VIEWER user seeding.");
            return;
        }

        int created = 0;
        for (String[] u : NEW_VIEWER_USERS) {
            String userId = u[0];
            String email  = u[1];
            String name   = u[2];

            boolean existsById    = userRepository.existsById(userId);
            boolean existsByEmail = userRepository.findByEmail(email).isPresent();

            if (!existsById && !existsByEmail) {
                userRepository.save(User.builder()
                        .userId(userId)
                        .email(email)
                        .fullName(name)
                        .role(UserRole.VIEWER)
                        .entity(india)
                        .isActive(true)
                        .build());
                created++;
                log.info("[DataInitializer] Seeded VIEWER user: {} <{}>", name, email);
            }
        }

        if (created > 0) {
            log.info("[DataInitializer] Seeded {} new VIEWER users.", created);
        }
    }
}
