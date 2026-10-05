# =============================================================================
# README - DevOps Case Study
# Student Management System
# =============================================================================

## 📋 Project Overview

This case study demonstrates a complete DevOps pipeline for a **Student Management System** — a Flask-based REST API that performs CRUD operations on student records. The project covers the full DevOps lifecycle: CI/CD, Configuration Management, Containerization, Orchestration, and Monitoring.

---

## 🏗️ Project Structure

```
case_study/
├── app/                              # Application source code
│   ├── app.py                        # Flask REST API with Prometheus metrics
│   ├── requirements.txt              # Python dependencies
│   ├── Dockerfile                    # Multi-stage Docker build
│   ├── .dockerignore                 # Docker build exclusions
│   └── tests/
│       └── test_app.py               # Unit tests (pytest)
│
├── .github/workflows/
│   └── ci-cd.yml                     # Task 1: GitHub Actions CI/CD pipeline
│
├── ansible/                          # Task 2: Configuration Management
│   ├── playbook.yml                  # Ansible playbook
│   └── inventory.ini                 # Ansible inventory
│
├── k8s/                              # Task 3: Kubernetes manifests
│   ├── namespace.yaml                # Namespace definition
│   ├── deployment.yaml               # Deployment with rolling update strategy
│   ├── service.yaml                  # LoadBalancer Service
│   └── rolling-update-commands.sh    # Rolling update & rollback demo commands
│
├── monitoring/                       # Task 4: Monitoring & Logging
│   ├── prometheus/
│   │   ├── prometheus.yml            # Prometheus configuration
│   │   └── alert_rules.yml           # Alert rules
│   └── grafana/
│       ├── dashboards/
│       │   └── student-api-dashboard.json  # Grafana dashboard
│       └── provisioning/
│           ├── datasources/
│           │   └── prometheus.yml    # Datasource config
│           └── dashboards/
│               └── dashboard.yml     # Dashboard provisioning
│
├── docker-compose.yml                # Full stack: App + Prometheus + Grafana
└── README.md                         # This file
```

---

## 🚀 Quick Start

### Run the full stack locally:
```bash
docker-compose up -d
```

### Access:
| Service        | URL                      | Credentials      |
|---------------|--------------------------|-------------------|
| Student API   | http://localhost:5000     | —                 |
| Prometheus    | http://localhost:9090     | —                 |
| Grafana       | http://localhost:3000     | admin / admin123  |

### API Endpoints:
```
GET    /              → Service info
GET    /health        → Health check
GET    /metrics       → Prometheus metrics
GET    /students      → List all students
GET    /students/:id  → Get student by ID
POST   /students      → Create student
PUT    /students/:id  → Update student
DELETE /students/:id  → Delete student
```

### Test the API:
```bash
# Create a student
curl -X POST http://localhost:5000/students \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "department": "Computer Science", "year": 3}'

# List all students
curl http://localhost:5000/students
```

---

## 📝 Task-wise Summary

### Task 1 – Deployment Strategy (GitHub Actions)
- **Tool**: GitHub Actions
- **File**: `.github/workflows/ci-cd.yml`
- **Stages**: Lint → Test → Build Docker Image → Deploy to Kubernetes
- **Triggers**: Push to `main`/`develop`, Pull Requests, Version Tags

### Task 2 – Configuration Management (Ansible)
- **Tool**: Ansible
- **Files**: `ansible/playbook.yml`, `ansible/inventory.ini`
- **Capabilities**: Package install, user creation, file management, firewall, systemd service

### Task 3 – Containerization & Orchestration
- **Dockerfile**: Multi-stage build, non-root user, health check
- **K8s Manifests**: Deployment (3 replicas, RollingUpdate), Service (LoadBalancer)
- **Rolling Update**: `kubectl set image` → zero-downtime update
- **Rollback**: `kubectl rollout undo` → instant revert

### Task 4 – Monitoring & Logging
- **Prometheus**: Scrapes `/metrics` every 10s, alert rules for downtime/errors/latency
- **Grafana**: Auto-provisioned dashboard with 8 panels (uptime, latency, error rate, etc.)
- **App Metrics**: request count, latency histogram, active requests, error count, student total

### Task 5 – Reflection & Report
- See the report artifact for architecture diagram, pipeline flow, challenges, and lessons learned.
