# ZenGen — DevOps CA-II Project Submission

[![Netlify Live](https://img.shields.io/badge/Production-Live%20on%20Netlify-00C7B7?style=flat&logo=netlify&logoColor=white)](https://zengen-prediction-platform.netlify.app)
[![Node.js](https://img.shields.io/badge/Node.js-20.x%20%7C%2022.x-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Manifests%20Validated-326CE5?style=flat&logo=kubernetes&logoColor=white)](https://kubernetes.io/)
[![Prometheus](https://img.shields.io/badge/Prometheus-v3.5%20Scrape%20UP-E6522C?style=flat&logo=prometheus&logoColor=white)](https://prometheus.io/)
[![Grafana](https://img.shields.io/badge/Grafana-v12%20Dashboard%20Active-F46800?style=flat&logo=grafana&logoColor=white)](https://grafana.com/)
[![Devpost](https://img.shields.io/badge/Devpost-Hackathon%20Submission-003E54?style=flat&logo=devpost&logoColor=white)](https://devpost.com/software/zengen-ai-powered-mental-wellness-platform)

---

## 📋 Submission Details

* **Student:** Mohammed Yousef Saeed Al-Hajj
* **PRN:** 23070122141
* **Course:** DevOps + Lab (Continuous Assessment II)
* **Semester / Batch:** Seventh Semester | B.Tech 2023–2027
* **Group:** 25
* **PR Base Repository (Faculty):** [https://github.com/aditisharmas11/DevOps-CA2_2023_27](https://github.com/aditisharmas11/DevOps-CA2_2023_27)
* **Fork / Push Destination:** [https://github.com/Mohammedyouse/DevOps-CA2_2023_27](https://github.com/Mohammedyouse/DevOps-CA2_2023_27)
* **Live Production URL:** [https://zengen-prediction-platform.netlify.app](https://zengen-prediction-platform.netlify.app)
* **External Hackathon Submission:** [https://devpost.com/software/zengen-ai-powered-mental-wellness-platform](https://devpost.com/software/zengen-ai-powered-mental-wellness-platform)

---

## 🚀 Project Overview

**ZenGen** is an AI-powered mental wellness platform designed specifically for adolescents and students. It integrates validated clinical questionnaires (mood, anxiety, social wellness), Google Gemini 3.8 Flash supportive AI counseling, automated crisis escalation (988 Lifeline & Crisis Text Line), and verified psychiatric educational resources.

For the **DevOps CA-II** assessment, ZenGen demonstrates full-lifecycle engineering:
1. **GitHub Actions CI/CD**: Automated linting, TypeScript type checking, unit tests, Kubernetes manifest validation (`kubeconform`), and KinD rolling update/rollback demonstration.
2. **Docker Containerization**: Multi-stage Node.js container with strict `.dockerignore` hygiene.
3. **Kubernetes Orchestration**: High-availability 2-replica Deployment with HTTP health probes and NodePort Service.
4. **Ansible Automation**: Playbook and inventory configuring service users and application paths.
5. **Prometheus & Grafana Observability**: Instrumenting process metrics, request counters, error rates, and p95 latency via `@prometheus-io/client` and custom 5-panel dashboard.
6. **Production Edge Hosting**: Netlify CDN and serverless API integration.

> 📖 **Full DevOps Engineering Documentation & Evidence:**  
> Please see the detailed report in [**`devops/README.md`**](devops/README.md).

---

## 🛠️ Quick Start & Local Execution

### 1. Prerequisites
* Node.js 20.x or 22.x
* Docker & Docker Compose
* (Optional) `kubectl` for Kubernetes deployment

### 2. Install & Run Application Locally
```bash
# Install dependencies
npm install

# Run TypeScript type check
npm run check

# Run automated tests
npm test

# Start development server
npm run dev
# Application will be accessible at http://localhost:5000
```

### 3. Run Monitoring Stack (Docker Compose)
```bash
# Start ZenGen, Prometheus, and Grafana
docker compose -f devops/monitoring/docker-compose.yml up --build -d

# Verify containers are running
docker compose -f devops/monitoring/docker-compose.yml ps
```
* **ZenGen App**: [http://localhost:5000](http://localhost:5000)
* **Metrics Endpoint**: [http://localhost:5000/metrics](http://localhost:5000/metrics)
* **Prometheus Targets**: [http://localhost:9090/targets](http://localhost:9090/targets)
* **Grafana Dashboard**: [http://localhost:3000/d/zengen-monitoring/zengen-application-monitoring](http://localhost:3000/d/zengen-monitoring/zengen-application-monitoring)

### 4. Deploy to Kubernetes
```bash
# Create Kubernetes secrets securely from .env
kubectl create secret generic zengen-secrets --from-env-file=.env --dry-run=client -o yaml | kubectl apply -f -

# Apply manifests
kubectl apply -f devops/kubernetes/deployment.yaml
kubectl apply -f devops/kubernetes/service.yaml

# Monitor rollout
kubectl rollout status deployment/zengen-deployment
```

---

## 📁 Repository Structure

```
├── .github/
│   └── workflows/
│       ├── ci.yml                     # CI Pipeline (Type check, tests, build)
│       ├── kubernetes-validation.yml  # Kubeconform strict manifest validation
│       └── kubernetes-rollout-demo.yml# KinD rolling update & rollback demo
├── devops/
│   ├── README.md                      # Comprehensive DevOps CA-II Case Study
│   ├── ansible/
│   │   ├── inventory.ini              # Ansible inventory
│   │   └── playbook.yml               # Ansible server provisioning playbook
│   ├── kubernetes/
│   │   ├── deployment.yaml            # 2-replica Deployment with health probes
│   │   └── service.yaml               # NodePort 30080 Service
│   ├── monitoring/
│   │   ├── docker-compose.yml         # Compose stack (ZenGen + Prometheus + Grafana)
│   │   ├── prometheus.yml             # Scrape config for zengen :5000/metrics
│   │   └── grafana/                   # Dashboard & datasource provisioning
│   └── evidence/
│       ├── 06A-zengen-grafana-monitoring-dashboard.png
│       ├── 06B-prometheus-zengen-target-health.png
│       └── 06C-zengen-prometheus-metrics.png
├── client/                            # React 18 / Vite frontend
├── server/                            # Express backend & Prometheus metrics instrumentation
├── shared/                            # Drizzle ORM schema & types
├── Dockerfile                         # Production container image definition
├── .dockerignore                      # Context exclusions
└── netlify.toml                       # Netlify production edge routing config
```

---

## 🔒 Security & Confidentiality Notice

* No `.env` files, production database URLs, Gemini API keys, or session secrets are committed to this repository.
* All configuration templates use `.env.example` placeholders.
* Kubernetes manifests inject credentials through external Secret references (`zengen-secrets`).
