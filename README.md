# CloudKaptan FinSOP — Enterprise Finance SOP & Compliance Tracker

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2-6DB33F?logo=springboot)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![Google Cloud](https://img.shields.io/badge/GCP-Cloud%20Run%20%2B%20Cloud%20SQL-4285F4?logo=googlecloud)](https://cloud.google.com/)

**FinSOP Portal** is an enterprise-grade Standard Operating Procedure (SOP) governance and compliance task execution platform built for CloudKaptan’s internal finance operations across global entities.

The platform enforces strict **Four-Eye Principles (4-Eye Governance)**, **Segregation of Duties (SoD)**, category-based permissions, and automated compliance task scheduling.

---

## 🌟 Key Features

* 🔐 **4-Eye SOP Governance**: 
  - **Admin Assignment**: Admins assign SOP creation tasks to designated creators and approvers.
  - **Multi-Creator Drafting**: Assigned creators draft SOP specifications, frequencies, and define Maker/Checker execution pools.
  - **Multi-Approver Review**: Assigned approvers review, approve, or reject SOP drafts with feedback.
  - **Single-Action Lock**: Once any assigned user takes action (submits or approves), state locks automatically and pending notifications clear across all assigned peers.
* ⚡ **Maker-Checker Task Execution**:
  - Compliance tasks auto-generated based on SOP frequencies (Monthly, Quarterly, Annual, One-Time).
  - Independent **Task Submitter (Maker)** and **Task Verifier (Checker)** workflow.
  - Automatic Segregation of Duties (SoD) enforcement prevents a Maker from self-verifying their own task.
* 🛡️ **Category-Centric Access Control**:
  - Granular access management per process category (e.g., *Tax Compliance*, *Payroll & Statutory*, *Treasury*).
  - Admin assigns named users to 4 permission tiers: **SOP Creator**, **SOP Approver**, **Task Submitter**, **Task Approver**.
* 🌐 **Multi-Corporate Entity Support**:
  - Multi-entity compliance tracking for `CK India`, `CK US`, `CK UK`, and `CK Australia`.
* 📜 **Immutable Audit Trail & Activity Logs**:
  - Complete logging for SOP lifecycle events, task actions, and access control policy modifications with actor tracking.
* 🔔 **Real-Time Notification System**:
  - In-app notification center routing actionable alerts to assigned creators, approvers, makers, and checkers.

---

## 🏗️ Technology Stack

### Backend
* **Language & Framework**: Java 17, Spring Boot 3.2
* **Persistence**: Spring Data JPA, Hibernate, PostgreSQL 15
* **Security & Multi-Tenancy**: Header-based Tenant Context & Custom Security Filters
* **State Machine**: Domain-driven SOP and Task State Machines
* **Build Tool**: Apache Maven

### Frontend
* **Core & Router**: React 18, Vite, React Router DOM v6
* **Styling & UI System**: TailwindCSS & Custom Vanilla CSS Design System with dark modes & responsive glassmorphic cards
* **State Management & Icons**: React Hooks & SVG icon libraries

### Infrastructure & Cloud (GCP)
* **Compute**: Google Cloud Run (Serverless microservice backend)
* **Frontend Hosting**: Google Cloud Storage (GCS) + Google Cloud CDN
* **Database**: Private Cloud SQL PostgreSQL 15 (No public IP, VPC Peering)
* **Security & WAF**: Google Cloud Armor WAF (Rate-limiting DDoS ban rules) & Secret Manager
* **Networking**: Custom VPC, Serverless NEG, Global External HTTP(S) Load Balancer

---

## 📁 Repository Structure

```
Finops/
├── backend/                             # Spring Boot REST API Service
│   ├── src/main/java/com/cloudkaptan/sop/
│   │   ├── config/                      # DataInitializer startup seeding & security
│   │   ├── controller/                  # REST Endpoint Controllers
│   │   ├── domain/                      # State machines & Enum definitions
│   │   ├── dto/                         # Request & Response DTOs
│   │   ├── entity/                      # JPA Database Entities
│   │   ├── repository/                  # Spring Data Repositories
│   │   └── service/                     # Business Logic Services
│   └── pom.xml                          # Maven build configuration
│
├── frontend/                            # React Single-Page Application
│   ├── src/
│   │   ├── auth/                        # Auth context & RBAC helpers
│   │   ├── components/                  # Reusable UI modals, pickers & navigation
│   │   ├── pages/                       # Dashboard, SOPs, Tasks, Access Control, Audit
│   │   └── services/                    # API client layer & fetchJson wrappers
│   ├── package.json                     # Frontend dependencies
│   └── vite.config.js                   # Vite build configuration
│
├── docker-compose.yml                   # Local Docker stack setup
└── GCP_DEPLOYMENT_README.md             # Complete GCP Infrastructure CLI Deployment Guide
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites
* **Java 17 JDK** or higher installed
* **Node.js 18+** and `npm` installed
* **Maven 3.8+** installed
* *(Optional)* **Docker & Docker Compose**

---

### Option 1: Running Locally (Recommended for Development)

#### 1. Start Backend Service
```bash
cd backend
mvn spring-boot:run "-Dspring-boot.run.profiles=local"
```
* Backend runs at: `http://localhost:8080`
* H2 / In-Memory database initializes automatically with seeded demo users and categories.

#### 2. Start Frontend Dev Server
```bash
cd frontend
npm install
npm run dev
```
* Frontend runs at: `http://localhost:5173`

---

### Option 2: Running with Docker Compose

To spin up the complete full-stack environment including PostgreSQL:
```bash
docker-compose up --build -d
```
* Application Frontend: `http://localhost:3000`
* Backend REST API: `http://localhost:8080`
* PostgreSQL Database: `localhost:5432`

---

## 👥 Seeded Team Member Demo Logins

The application seeds 13 pre-configured team accounts for testing governance flows:

| Name | Email | Role |
| :--- | :--- | :--- |
| **Manoj Agarwal** | `manoj.agarwal@cloudkaptan.com` | `ADMIN` |
| **Tushar Seth** | `tushar.seth@cloudkaptan.com` | `MAKER` |
| **Mainak Gupta** | `mainak.gupta@cloudkaptan.com` | `CHECKER` |
| **Vivek Raj** | `vivek.raj@cloudkaptan.com` | `MAKER_CHECKER` |
| **Sayantan Ghosh** | `sayantan.ghosh@cloudkaptan.com` | `VIEWER` (Permitted Creator/Approver) |
| **Shreya Singh** | `shreya.singh@cloudkaptan.com` | `VIEWER` (Permitted Creator) |
| **Sanjeev Kumar** | `sanjeev.kumar@cloudkaptan.com` | `VIEWER` (Permitted Approver) |
| **Moitrayee Dutta** | `moitrayee.dutta@cloudkaptan.com` | `VIEWER` (Permitted Task Submitter) |
| **Ayush Pandey** | `ayush.pandey@cloudkaptan.com` | `VIEWER` (Permitted Task Approver) |

---

## 🔄 Lifecycle Workflows & State Machines

### SOP Governance Lifecycle
```
[PENDING_CREATION] ──(Creator Submits Draft)──> [PENDING_APPROVAL] ──(Approver Approves)──> [ACTIVE / APPROVED]
                                                        │
                                                        └──(Approver Rejects)──> [REJECTED]
```

### Compliance Task Execution Lifecycle
```
[OPEN] ──(Maker Submits Task)──> [PENDING_REVIEW] ──(Checker Approves)──> [APPROVED]
                                        │
                                        └──(Checker Rejects)──> [REJECTED] ──(Maker Resubmits)──> [PENDING_REVIEW]
```

---

## ☁️ Production Deployment (GCP)

The production infrastructure is hosted on **Google Cloud Platform (GCP)** using:
- **Cloud Run** for the Spring Boot microservice backend
- **Cloud Storage & Cloud CDN** for the React frontend
- **Private Cloud SQL (PostgreSQL 15)** with no public IP
- **Cloud Armor WAF** with rate-limiting DDoS protection rules
- **Global External HTTP(S) Load Balancer** with managed SSL certificates

For complete, step-by-step CLI commands and architecture explanations, refer to the [GCP Deployment Readme](file:///e:/Finops/GCP_DEPLOYMENT_README.md).

---

## 📄 License

This repository and its codebase are private and proprietary to **CloudKaptan Consultancy Services Pvt. Ltd.** All rights reserved.
