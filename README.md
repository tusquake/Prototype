# FinSOP Prototyping Module

This directory contains the prototype implementation for the **FinSOP (Financial Standard Operating Procedure & Compliance Management System)** for CloudKaptan.

It is organized into two distinct services:

```
prototyping/
├── frontend/             # React SPA (Vite, React Router, CSS Modules)
│   ├── src/              # React components, pages, auth, services
│   ├── public/           # Static assets & brand logos
│   ├── package.json      # Dependencies & npm scripts
│   └── vite.config.js    # Vite configuration & proxy target (http://localhost:8080)
└── backend/              # Spring Boot 3.3 (Java 21) REST Application
    ├── src/main/java/    # Enterprise domain, state machine, strategies, JPA repositories
    ├── src/main/resources/ # application.yml & Flyway SQL schema migration
    └── pom.xml           # Maven build configuration
```

---

## Running the Application

### 1. Frontend (React SPA)
```bash
cd prototyping/frontend
npm install
npm run dev
```
- **Local URL**: `http://localhost:3010`

---

### 2. Backend (Spring Boot 3.3 Java 21)
```bash
cd prototyping/backend
mvn spring-boot:run
```
- **Local API URL**: `http://localhost:8080`
- **Health Check**: `http://localhost:8080/api/health`
