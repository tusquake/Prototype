// package com.cloudkaptan.sop.config;

// import com.cloudkaptan.sop.domain.entity.UserHierarchy;
// import com.cloudkaptan.sop.domain.enums.EntityCode;
// import com.cloudkaptan.sop.domain.enums.SopFrequency;
// import com.cloudkaptan.sop.domain.enums.SopStatus;
// import com.cloudkaptan.sop.domain.enums.TaskStatus;
// import com.cloudkaptan.sop.domain.enums.UserRole;
// import com.cloudkaptan.sop.entity.CorporateEntity;
// import com.cloudkaptan.sop.entity.Sop;
// import com.cloudkaptan.sop.entity.Task;
// import com.cloudkaptan.sop.entity.User;
// import com.cloudkaptan.sop.repository.CorporateEntityRepository;
// import com.cloudkaptan.sop.repository.UserHierarchyRepository;
// import com.cloudkaptan.sop.repository.UserRepository;
// import lombok.RequiredArgsConstructor;
// import lombok.extern.slf4j.Slf4j;
// import org.springframework.boot.CommandLineRunner;
// import org.springframework.stereotype.Component;
// import org.springframework.transaction.annotation.Transactional;

// import java.time.LocalDate;
// import java.util.List;

// @Slf4j
// @Component
// @RequiredArgsConstructor
// public class DataInitializer implements CommandLineRunner {

//     private final CorporateEntityRepository entityRepository;
//     private final UserRepository userRepository;
//     private final UserHierarchyRepository userHierarchyRepository;
//     private final com.cloudkaptan.sop.repository.SopRepository sopRepository;
//     private final com.cloudkaptan.sop.repository.TaskRepository taskRepository;

//     // 13 new non-admin VIEWER users — org-wide (entity = CK_INDIA as default)
//     private static final List<String[]> NEW_VIEWER_USERS = List.of(
//         // { userId, email, fullName }
//         new String[]{"usr-anirban-001",  "anirban.paul@cloudkaptan.com",          "Anirban Paul"},
//         new String[]{"usr-annu-002",     "annu.shaw@cloudkaptan.com",             "Annu Shaw"},
//         new String[]{"usr-avisek2-003",  "avisek.shaw@cloudkaptan.com",           "Avisek Shaw"},
//         new String[]{"usr-ayush-004",    "ayush.pandey@cloudkaptan.com",          "Ayush Pandey"},
//         new String[]{"usr-debajyo-005",  "debajyoti.dattagupta@cloudkaptan.com",  "Debajyoti Dattagupta"},
//         new String[]{"usr-isha-006",     "isha.prasad@cloudkaptan.com",           "Isha Prasad"},
//         new String[]{"usr-king-007",     "kingshuk.roy@cloudkaptan.com",          "Kingshuk Roy"},
//         new String[]{"usr-moit-008",     "moitrayee.dutta@cloudkaptan.com",       "Moitrayee Dutta"},
//         new String[]{"usr-nishan-009",   "nishan.mandal@cloudkaptan.com",         "Nishan Mandal"},
//         new String[]{"usr-rounok-010",   "rounok.das@cloudkaptan.com",            "Rounok Das"},
//         new String[]{"usr-sanjeev-011",  "sanjeev.kumar@cloudkaptan.com",         "Sanjeev Kumar"},
//         new String[]{"usr-sayant-012",   "sayantan.ghosh@cloudkaptan.com",        "Sayantan Ghosh"},
//         new String[]{"usr-shreya-013",   "shreya.singh@cloudkaptan.com",          "Shreya Singh"}
//     );

//     @Override
//     @Transactional
//     public void run(String... args) {
//         log.info("Checking & Initializing master data for FinSOP...");

//         // 1. Seed Corporate Entities
//         for (EntityCode code : EntityCode.values()) {
//             if (!entityRepository.existsById(code)) {
//                 String name = switch (code) {
//                     case CK_INDIA -> "CK India";
//                     case CK_US -> "CK US";
//                     case CK_UK -> "CK UK";
//                     case CK_AUSTRALIA -> "CK Australia";
//                 };
//                 entityRepository.save(CorporateEntity.builder().entityCode(code).entityName(name).build());
//             }
//         }

//         CorporateEntity india = entityRepository.findById(EntityCode.CK_INDIA).orElse(null);
//         CorporateEntity us    = entityRepository.findById(EntityCode.CK_US).orElse(null);
//         CorporateEntity uk    = entityRepository.findById(EntityCode.CK_UK).orElse(null);

//         // 2. Seed core users
//         if (userRepository.count() == 0) {
//             log.info("Seeding Initial Users...");
//             userRepository.saveAll(List.of(
//                 User.builder().userId("usr-manoj-042").email("manoj.agarwal@cloudkaptan.com").fullName("Manoj Agarwal").role(UserRole.ADMIN).entity(us).isActive(true).build(),
//                 User.builder().userId("usr-vivek-108").email("vivek.raj@cloudkaptan.com").fullName("Vivek Raj").role(UserRole.VIEWER).entity(india).isActive(true).build(),
//                 User.builder().userId("usr-mainak-215").email("mainak.gupta@cloudkaptan.com").fullName("Mainak Gupta").role(UserRole.VIEWER).entity(india).isActive(true).build(),
//                 User.builder().userId("usr-tushar-304").email("tushar.seth@cloudkaptan.com").fullName("Tushar Seth").role(UserRole.VIEWER).entity(uk).isActive(true).build(),
//                 User.builder().userId("usr-prayasa-410").email("prayasa.sharma@cloudkaptan.com").fullName("Prayasa Sharma").role(UserRole.VIEWER).entity(india).isActive(true).build(),
//                 User.builder().userId("usr-avisek-499").email("avisek.old@cloudkaptan.com").fullName("Avisek Old").role(UserRole.VIEWER).entity(india).isActive(true).build()
//             ));
//         }

//         // 3. Seed the 13 new VIEWER users (safe to run every restart — idempotent)
//         seedNewViewerUsers();

//         // 4. Seed Organizational Hierarchy for Local Testing
//         seedUserHierarchy();

//         log.info("Master data initialization complete.");
//     }


//     private void seedNewViewerUsers() {
//         CorporateEntity india = entityRepository.findById(EntityCode.CK_INDIA)
//                 .or(() -> entityRepository.findAll().stream().findFirst())
//                 .orElse(null);

//         if (india == null) {
//             log.warn("[DataInitializer] No entity found — skipping VIEWER user seeding.");
//             return;
//         }

//         int created = 0;
//         for (String[] u : NEW_VIEWER_USERS) {
//             String userId = u[0];
//             String email  = u[1];
//             String name   = u[2];

//             boolean existsById    = userRepository.existsById(userId);
//             boolean existsByEmail = userRepository.findByEmail(email).isPresent();

//             if (!existsById && !existsByEmail) {
//                 userRepository.save(User.builder()
//                         .userId(userId)
//                         .email(email)
//                         .fullName(name)
//                         .role(UserRole.VIEWER)
//                         .entity(india)
//                         .isActive(true)
//                         .build());
//                 created++;
//                 log.info("[DataInitializer] Seeded VIEWER user: {} <{}>", name, email);
//             }
//         }

//         if (created > 0) {
//             log.info("[DataInitializer] Seeded {} new VIEWER users.", created);
//         }
//     }

//     private void seedUserHierarchy() {
//         log.info("[DataInitializer] Resetting and Seeding User Hierarchy with horizontal Level 2 manager permissions...");
//         userHierarchyRepository.deleteAll();

//         List<UserHierarchy> hierarchy = List.of(
//             // Level 1 Lead -> Level 2 Managers & Level 3 Team Members: Anirban manages everyone with Read & Write access
//             UserHierarchy.builder()
//                     .managerId("usr-anirban-001") // Anirban Paul
//                     .subordinateId("usr-annu-002") // Annu Shaw
//                     .canReadTasks(true)
//                     .canWriteTasks(true)
//                     .build(),

//             UserHierarchy.builder()
//                     .managerId("usr-anirban-001") // Anirban Paul
//                     .subordinateId("usr-avisek2-003") // Avisek Shaw
//                     .canReadTasks(true)
//                     .canWriteTasks(true)
//                     .build(),

//             UserHierarchy.builder()
//                     .managerId("usr-anirban-001") // Anirban Paul
//                     .subordinateId("usr-ayush-004") // Ayush Pandey
//                     .canReadTasks(true)
//                     .canWriteTasks(true)
//                     .build(),

//             UserHierarchy.builder()
//                     .managerId("usr-anirban-001") // Anirban Paul
//                     .subordinateId("usr-debajyo-005") // Debajyoti Dattagupta
//                     .canReadTasks(true)
//                     .canWriteTasks(true)
//                     .build(),

//             // Level 2 Manager (Annu Shaw) -> Level 3 Team Members (Ayush & Debajyoti) - Read-Only
//             UserHierarchy.builder()
//                     .managerId("usr-annu-002") // Annu Shaw
//                     .subordinateId("usr-ayush-004") // Ayush Pandey
//                     .canReadTasks(true)
//                     .canWriteTasks(false)
//                     .build(),

//             UserHierarchy.builder()
//                     .managerId("usr-annu-002") // Annu Shaw
//                     .subordinateId("usr-debajyo-005") // Debajyoti Dattagupta
//                     .canReadTasks(true)
//                     .canWriteTasks(false)
//                     .build(),

//             // Level 2 Manager (Avisek Shaw) -> Level 3 Team Members (Ayush & Debajyoti) - Read-Only (Horizontal Hierarchy)
//             UserHierarchy.builder()
//                     .managerId("usr-avisek2-003") // Avisek Shaw
//                     .subordinateId("usr-ayush-004") // Ayush Pandey
//                     .canReadTasks(true)
//                     .canWriteTasks(false)
//                     .build(),

//             UserHierarchy.builder()
//                     .managerId("usr-avisek2-003") // Avisek Shaw
//                     .subordinateId("usr-debajyo-005") // Debajyoti Dattagupta
//                     .canReadTasks(true)
//                     .canWriteTasks(false)
//                     .build()
//         );

//         userHierarchyRepository.saveAll(hierarchy);
//         log.info("[DataInitializer] Seeded 8 organizational hierarchy relationships with horizontal Level 2 manager permissions.");
//     }
// }