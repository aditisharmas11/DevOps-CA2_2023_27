# DevOps Continuous Assessment II (CA-II) — Group 33 Submission

**Project:** **RepoWise** (`@repowise/server` — TypeScript / Node.js 22 Express Microservice)  
**Target Repository:** [`kshitiz-shah/Repowise`](https://github.com/kshitiz-shah/Repowise)  
**Evaluation Scheme:** Part 1 (Theory Case Studies — 10 Marks) + Part 2 (Practical Tasks — 10 Marks) = **Total: 20 Marks**  

---

## 👥 Group Members (Group 33)

| Name | PRN | Role & Core Contributions |
| :--- | :---: | :--- |
| **Kshitiz Shah** | `23070122121` | Lead Architecture, CI/CD Pipeline (Task 1), Kubernetes Manifests (Task 3) |
| **Nitesh Ghimire** | `23070122150` | Case Study Evaluation (Part 1 - Netflix & Amazon), Prometheus Telemetry (Task 4) |
| **Nigel Francy** | `23070122148` | Ansible IaC Playbook & Systemd/Nginx Automation (Task 2), Slide Deck (Task 5) |
| **Omkar Kadam** | `23070122158` | Multi-Stage Dockerfile (Task 3), Grafana Dashboards (Task 4), Documentation |

---

## 📑 Complete Deliverables Directory & Mapping

### Part 1: Theory Case Studies (10 Marks)
*Selected Questions: Q1 (Netflix Monolith-to-Cloud Migration & Chaos Engineering) and Q2 (Amazon Obidos Monolith, Two-Pizza Teams, Bezos API Mandate & CI/CD Velocity)*

| Deliverable | Format | Direct Link / Path | Description |
| :--- | :---: | :--- | :--- |
| **Academic Evaluation Report** | **PDF** | [CA2_DevOps_Case_Study_Evaluation.pdf](./Part1_Case_Study_Evaluation/CA2_DevOps_Case_Study_Evaluation.pdf) | Formal 4-page academic evaluation report formatted to institutional standards. |
| **Markdown Source** | MD | [CA2_Case_Study_Evaluation.md](./Part1_Case_Study_Evaluation/CA2_Case_Study_Evaluation.md) | Full text analysis with academic tables, comparative matrices, and citations. |
| **HTML Source** | HTML | [CA2_DevOps_Case_Study_Evaluation.html](./Part1_Case_Study_Evaluation/CA2_DevOps_Case_Study_Evaluation.html) | Source used for pixel-perfect headless print rendering. |

---

### Part 2: Practical Implementation Tasks (10 Marks)

| Task | Topic | Marks | Deliverables & Artifacts | Status |
| :--- | :--- | :---: | :--- | :---: |
| **Task 1** | **Deployment Strategy** | 2M | • [GitHub Actions Workflow (`ci-cd-pipeline.yml`)](./Task1_Deployment_Strategy/ci-cd-pipeline.yml)<br>• [Multi-Stage Dockerfile](./Task1_Deployment_Strategy/Dockerfile)<br>• [Pipeline Flow Diagram (SVG)](./Task1_Deployment_Strategy/pipeline-diagram.svg)<br>• [Task 1 Submission Report](./Task1_Deployment_Strategy/TASK1_SUBMISSION_REPORT.md) | ✅ Complete |
| **Task 2** | **Configuration Management (IaC)** | 2M | • [Ansible Playbook (`playbook.yml`)](./Task2_Configuration_Management/playbook.yml)<br>• [Inventory File (`inventory.ini`)](./Task2_Configuration_Management/inventory.ini)<br>• [Nginx Reverse Proxy & Systemd Templates](./Task2_Configuration_Management/templates)<br>• [Task 2 Submission Report](./Task2_Configuration_Management/TASK2_SUBMISSION_REPORT.md) | ✅ Complete |
| **Task 3** | **Containerization & Orchestration** | 2M | • [Multi-Stage Dockerfile (Distroless)](./Task3_Containerization_Orchestration/Dockerfile)<br>• [Kubernetes Deployment (`deployment.yaml`)](./Task3_Containerization_Orchestration/deployment.yaml)<br>• [Kubernetes Service (`service.yaml`)](./Task3_Containerization_Orchestration/service.yaml)<br>• [Rolling Update & Rollback Lifecycle Diagram (SVG)](./Task3_Containerization_Orchestration/rolling-update-diagram.svg)<br>• [Task 3 Submission Report](./Task3_Containerization_Orchestration/TASK3_SUBMISSION_REPORT.md) | ✅ Complete |
| **Task 4** | **Monitoring & Observability** | 2M | • [Prometheus Configuration (`prometheus.yml`)](./Task4_Monitoring_Logging/prometheus.yml)<br>• [RED Metrics Middleware (`repowise_metrics_middleware.ts`)](./Task4_Monitoring_Logging/repowise_metrics_middleware.ts)<br>• [Docker Compose Monitoring Stack](./Task4_Monitoring_Logging/docker-compose.monitoring.yml)<br>• [Grafana Dashboard JSON Export](./Task4_Monitoring_Logging/grafana-dashboard.json)<br>• [Grafana Dashboard Preview (SVG)](./Task4_Monitoring_Logging/grafana-dashboard-preview.svg)<br>• [Task 4 Submission Report](./Task4_Monitoring_Logging/TASK4_SUBMISSION_REPORT.md) | ✅ Complete |
| **Task 5** | **Reflection & Report** | 2M | • [6-Slide Natural Academic Presentation Deck (PDF)](./Task5_Reflection_Report/SLIDES_PRESENTATION.pdf)<br>• [Interactive Presentation Source (HTML)](./Task5_Reflection_Report/SLIDES_PRESENTATION.html)<br>• [Presentation Source (Markdown)](./Task5_Reflection_Report/SLIDES_PRESENTATION.md)<br>• [Comprehensive Engineering Report](./Task5_Reflection_Report/TASK5_DOCUMENTATION_REPORT.md) | ✅ Complete |

---

## 🛠️ Verification & Reproduction Guide

### 1. Task 1: Pipeline & Multi-Stage Docker Build
```bash
# Build the production-grade distroless Docker image
docker build -f Task1_Deployment_Strategy/Dockerfile -t repowise/server:v1 .
```

### 2. Task 2: Ansible IaC Idempotency & Syntax Validation
```bash
cd Task2_Configuration_Management
ansible-playbook -i inventory.ini playbook.yml --syntax-check
```

### 3. Task 3: Kubernetes Zero-Downtime Rolling Update & Rollback
```bash
# Apply initial v1 deployment and service
kubectl apply -f Task3_Containerization_Orchestration/deployment.yaml
kubectl apply -f Task3_Containerization_Orchestration/service.yaml

# Perform rolling update to v2
kubectl set image deployment/repowise-server-deployment repowise-server=repowise/server:v2 --record
kubectl rollout status deployment/repowise-server-deployment

# Perform instant rollback
kubectl rollout undo deployment/repowise-server-deployment
```

### 4. Task 4: Monitoring & Observability Stack (Prometheus + Grafana)
```bash
cd Task4_Monitoring_Logging
docker compose -f docker-compose.monitoring.yml up -d

# Open services:
# Prometheus: http://localhost:9091 (Targets & PromQL)
# Grafana:    http://localhost:3001 (Credentials: admin / admin)
```

### 5. Task 5: Academic Presentation Deck
Open [`Task5_Reflection_Report/SLIDES_PRESENTATION.pdf`](./Task5_Reflection_Report/SLIDES_PRESENTATION.pdf) to view the 6-slide landscape executive presentation.
