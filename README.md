<div align="center">

# 🎭 Deepfake Detection using Deep Learning
### DevOps CA2 — Complete DevOps Pipeline Implementation

![Python](https://img.shields.io/badge/Python-3.10-blue?style=for-the-badge&logo=python)
![Django](https://img.shields.io/badge/Django-5.0-green?style=for-the-badge&logo=django)
![PyTorch](https://img.shields.io/badge/PyTorch-2.1-red?style=for-the-badge&logo=pytorch)
![Docker](https://img.shields.io/badge/Docker-Containerized-blue?style=for-the-badge&logo=docker)
![Kubernetes](https://img.shields.io/badge/Kubernetes-Orchestrated-326CE5?style=for-the-badge&logo=kubernetes)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-CI%2FCD-2088FF?style=for-the-badge&logo=githubactions)

</div>

---

## 👥 Group Details

| Field | Details |
|---|---|
| **Subject** | DevOps |
| **Assignment** | CA2 |
| **Group No.** | **13** |
| **Batch** | 2023–27 |

### 👨‍💻 Group Members

| PRN | Name |
|---|---|
| 23070122175 | Deepak Rathod |
| 23070122189 | Samartha Shrestha |
| 24070122508 | Atharva More |
| 23070122266 | Sonali Gupta |

---

## 📌 Project Overview

This project implements a **Deepfake Face Detection** web application using Deep Learning, wrapped with a complete **DevOps pipeline** covering CI/CD, Configuration Management, Containerization, Orchestration, and Monitoring.

### 🧠 ML Architecture
- **ResNeXt-50 + LSTM** — Classifies real vs. fake faces from images/video sequences
- **MAE (Masked Autoencoder)** — Identity-preserving face reconstruction for FAKE detections
- **CAM Heatmaps** — Visually highlights manipulated face regions
- **face_recognition (dlib)** — Accurate face crop and detection

### 🌐 Web Stack
- **Django 5.0** — Web framework
- **Gunicorn** — WSGI server
- **Nginx** — Reverse proxy
- **SQLite** — Database

---

## 🗂️ Repository Structure

```
Devops-CA2_2023-27/
│
├── 📁 devops/                              ← All DevOps CA2 deliverables
│   ├── 📁 step1-github-actions/
│   │   ├── .github/workflows/
│   │   │   └── ci-cd.yml                  ← Step 1: CI/CD Pipeline
│   │   └── github-actions-success.png     ← CI/CD Pipeline Execution Proof
│   │
│   ├── 📁 step2-ansible/
│   │   ├── playbook.yml                   ← Step 2: Ansible Playbook
│   │   └── inventory.ini                  ← Ansible Inventory
│   │
│   ├── 📁 step3-docker-k8s/
│   │   ├── Dockerfile.prod                ← Step 3: Multi-stage Docker build
│   │   ├── k8s-namespace.yaml             ← K8s Namespace
│   │   ├── k8s-deployment.yaml            ← K8s Deployment (rolling update)
│   │   ├── k8s-service.yaml               ← K8s Service (LoadBalancer)
│   │   ├── k8s-pvcs.yaml                  ← Persistent Volume Claims
│   │   └── k8s-hpa.yaml                   ← Horizontal Pod Autoscaler
│   │
│   ├── 📁 step4-monitoring/
│   │   ├── docker-compose.monitoring.yml  ← Step 4: Monitoring stack
│   │   ├── prometheus.yml                 ← Prometheus scrape config
│   │   ├── docker-compose-up-terminal.png ← Terminal Compose Up Proof
│   │   ├── docker-monitoring-stack.png    ← Docker Desktop Containers Proof
│   │   ├── grafana-metrics-dashboard.png  ← Grafana Dashboard Metrics Proof
│   │   ├── grafana-dashboards/
│   │   │   └── deepfake-dashboard.json    ← Grafana dashboard (8 panels)
│   │   └── grafana-provisioning/          ← Auto-provisioning configs
│   │
│   ├── 📁 step5-report/
│   │   └── REPORT.md                      ← Step 5: Reflection & Report
│   │
│   └── 📁 step6-bonus/
│       └── *.png                          ← Submission Screenshots & Proof
│
├── 📁 reconstruction/                      ← MAE face reconstruction module
│   ├── __init__.py
│   └── mae_modules.py                     ← DFREC architecture (arXiv:2412.07260)
│
└── 📁 deepfake_vid/
    └── Deepfake_detection_using_deep_learning-master/
        └── Django Application/            ← Main Django project
            ├── manage.py
            ├── requirements.txt
            ├── Dockerfile
            ├── ml_app/                    ← Core Django app
            │   ├── views.py               ← Prediction logic
            │   ├── models.py
            │   ├── forms.py
            │   └── urls.py
            ├── project_settings/          ← Django settings
            ├── templates/                 ← HTML templates
            ├── static/                    ← CSS, JS, images
            ├── models/                    ← ML model weights (.pt, .pth)
            ├── uploaded_images/           ← User uploaded images
            └── uploaded_videos/           ← User uploaded videos
```

---

## ⚙️ Step 1 — Deployment Strategy (GitHub Actions CI/CD)

**Tool:** GitHub Actions  
**File:** [`devops/step1-github-actions/.github/workflows/ci-cd.yml`](devops/step1-github-actions/.github/workflows/ci-cd.yml)

### Pipeline Flow

```
Push to main
     │
     ▼
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  JOB 1      │────▶│  JOB 2           │────▶│  JOB 3              │
│  Lint & Test│     │  Build & Push    │     │  Deploy to K8s      │
│             │     │  Docker → GHCR   │     │  Rolling Update     │
│ • flake8    │     │                  │     │  ↳ Rollback on fail │
│ • manage.py │     │ • Multi-stage    │     │                     │
│   check     │     │ • SHA-tagged     │     │                     │
└─────────────┘     └──────────────────┘     └─────────────────────┘
```

| Stage | Tool | Description |
|---|---|---|
| Trigger | GitHub Actions | On push/PR to main branch |
| Test | flake8 + Django check | Lint Python code, validate Django config |
| Build | Docker Buildx | Multi-stage build, push to GHCR with SHA tag |
| Deploy | kubectl set image | Zero-downtime rolling update |
| Verify | kubectl rollout status | Waits for all pods healthy (120s timeout) |
| Rollback | kubectl rollout undo | Auto-rollback if deployment fails |

**Why GitHub Actions?** Free, native GitHub integration, YAML-based, secrets management built-in.

### 📸 Pipeline Execution Proof
*Successful end-to-end execution of all 3 stages (Lint & Test, Build & Push Docker Image, and Deploy to Kubernetes) with zero downtime.*

![GitHub Actions CI/CD Pipeline Run](devops/step1-github-actions/github-actions-success.png)

---

## 🔧 Step 2 — Configuration Management & IaC (Ansible)

**Tool:** Ansible  
**Files:** [`devops/step2-ansible/playbook.yml`](devops/step2-ansible/playbook.yml) | [`devops/step2-ansible/inventory.ini`](devops/step2-ansible/inventory.ini)

### What the Playbook Configures

| Task | Description |
|---|---|
| System Packages | Installs Python 3.10, cmake, OpenCV, Nginx, Supervisor |
| User Management | Creates `deepfake` user/group with restricted permissions |
| Directory Setup | `/opt/deepfake-detection/{images, videos, models, logs}` |
| Python venv | Isolated virtualenv, installs all pip dependencies |
| Environment Config | Writes `.env` file (`DEBUG=False`, `SECRET_KEY`, etc.) |
| Nginx | Reverse proxy with 300s timeout for ML inference |
| Supervisor | Gunicorn daemon with auto-restart on crash |
| Health Check | Verifies app returns HTTP 200 after setup |

### Run the Playbook
```bash
# Install Ansible
pip install ansible

# Run playbook
ansible-playbook -i devops/step2-ansible/inventory.ini devops/step2-ansible/playbook.yml
```

---

## 🐳 Step 3 — Containerization & Orchestration

### Docker (Multi-Stage Build)
**File:** [`devops/step3-docker-k8s/Dockerfile.prod`](devops/step3-docker-k8s/Dockerfile.prod)

```dockerfile
# Stage 1: Builder — installs all Python deps (torch, dlib, OpenCV)
FROM python:3.10-slim AS builder
...

# Stage 2: Runtime — lean final image with only installed packages
FROM python:3.10-slim AS runtime
# Runs as non-root user (UID 1000) for security
```

```bash
# Build the image
docker build -f devops/step3-docker-k8s/Dockerfile.prod -t deepfake-detection:latest .

# Run locally
docker run -p 8000:8000 deepfake-detection:latest
```

### Kubernetes Manifests

| File | Purpose |
|---|---|
| [`k8s-namespace.yaml`](devops/step3-docker-k8s/k8s-namespace.yaml) | Isolates workload in `deepfake-ns` |
| [`k8s-deployment.yaml`](devops/step3-docker-k8s/k8s-deployment.yaml) | 2 replicas, rolling update, liveness+readiness probes |
| [`k8s-service.yaml`](devops/step3-docker-k8s/k8s-service.yaml) | LoadBalancer port 80 → 8000 |
| [`k8s-pvcs.yaml`](devops/step3-docker-k8s/k8s-pvcs.yaml) | PVCs: images (5Gi), models (10Gi) |
| [`k8s-hpa.yaml`](devops/step3-docker-k8s/k8s-hpa.yaml) | Auto-scales 2→6 pods at CPU 70% |

### Deploy to Kubernetes
```bash
# Apply all manifests
kubectl apply -f devops/step3-docker-k8s/

# Rolling update (zero downtime — maxUnavailable: 0)
kubectl set image deployment/deepfake-detection \
  deepfake-app=ghcr.io/your-username/deepfake-detection-app:sha-abc123 \
  --namespace=deepfake-ns

# Watch rollout
kubectl rollout status deployment/deepfake-detection -n deepfake-ns

# Rollback if needed
kubectl rollout undo deployment/deepfake-detection -n deepfake-ns
```

---

## 📊 Step 4 — Monitoring & Logging (Prometheus + Grafana)

**Files:** [`devops/step4-monitoring/`](devops/step4-monitoring/)

### Monitoring Stack

| Tool | Role | Port |
|---|---|---|
| **Prometheus** | Metrics scraping & storage | 9090 |
| **Grafana** | Dashboards & alerting | 3000 |
| **Node Exporter** | Host CPU/RAM/disk metrics | 9100 |
| **cAdvisor** | Container resource metrics | 8080 |
| **django-prometheus** | App `/metrics` endpoint | 8000 |

### Start Monitoring Stack
```bash
cd devops/step4-monitoring
docker compose -f docker-compose.monitoring.yml up -d

# Access Grafana
# URL:      http://localhost:3000
# Username: admin
# Password: deepfake123
```

### Grafana Dashboard Panels
1. 🟢 **App Uptime** — UP/DOWN status (green/red)
2. 📈 **HTTP Request Rate** — requests/second by method
3. ⏱️ **P95 Latency** — 95th percentile response time
4. 🔴 **Error Rate** — 4xx and 5xx responses per second
5. 💻 **CPU Usage** — Host utilization gauge (0–100%)
6. 🧠 **Memory Usage** — Host memory gauge (0–100%)
7. 🔢 **Total Predictions** — Business metric counter
8. 🗄️ **DB Query Rate** — Django database operations/s

### 📸 Monitoring Proof & Dashboards

#### 1. CLI Execution — Docker Compose Stack Launch
*Terminal output showing successful pull and creation of all networks, volumes, and containers (`cadvisor`, `node-exporter`, `prometheus`, `grafana`).*

![Docker Compose Up Terminal](devops/step4-monitoring/docker-compose-up-terminal.png)

#### 2. Docker Desktop — Active Monitoring Stack
*All four monitoring containers (`grafana`, `prometheus`, `node-exporter`, and `cadvisor`) running healthy via Docker Compose.*

![Docker Monitoring Stack](devops/step4-monitoring/docker-monitoring-stack.png)

#### 3. Grafana — Live Node Exporter Metrics Dashboard
*Real-time dashboard on `localhost:3000` showing host CPU busy rate (91.8%), system load, RAM usage (12.2%), swap usage, core counts, and network/memory usage graphs.*

![Grafana Node Exporter Metrics Dashboard](devops/step4-monitoring/grafana-metrics-dashboard.png)

---

## 📝 Step 5 — Reflection & Report

**File:** [`devops/step5-report/REPORT.md`](devops/step5-report/REPORT.md)

The report covers:
- 🏗️ **Architecture** — System design and DevOps infrastructure diagram
- 🔄 **Pipeline Flow** — GitHub Actions 3-job CI/CD workflow
- 🔧 **Configuration** — Ansible task breakdown and idempotency
- 📦 **Containerization** — Docker multi-stage + Kubernetes zero-downtime deploys
- 📊 **Monitoring** — Prometheus metrics + Grafana dashboard setup
- ⚠️ **Challenges** — Problems faced and how they were solved
- 💡 **Lessons Learned** — Key takeaways from the DevOps implementation

---

## 🏆 Step 6 — Bonus: External DevOps & AI Challenge Participation

**Hackathon Link:** [Multimodal AI Hackathon 2026 (Devpost)](https://multimodal-ai-hackathon-2026-7.devpost.com/)  
**Submission Proof Assets:** [`devops/step6-bonus/`](devops/step6-bonus/)

> **Requirement:** Participate in an external DevOps challenge (Kaggle/Devpost/Cloud hackathon). Attach proof of submission/leaderboard or GitHub PR badge.

### 🎯 Challenge & Submission Overview

| Field | Details |
|---|---|
| **Platform** | **Devpost** |
| **Hackathon** | [**Multimodal AI Hackathon 2026**](https://multimodal-ai-hackathon-2026-7.devpost.com/) |
| **Organizer** | Kamand Prompt, IIT Mandi |
| **Project Title** | **StudyBuddy — Source-Grounded AI Tutor with Adaptive Quizzes** |
| **Category** | Machine Learning / AI / DevOps Deployment |
| **Submission Status** | 🟢 **SUBMITTED** (5/5 steps completed) |
| **Participants (Group 13)** | **Atharva More**, **Deepak Rathod**, **Samartha Shrestha**, **Sonali Gupta** |

### 👥 Team Members (Group 13)

| PRN | Name | Devpost Handle |
|---|---|---|
| 24070122508 | Atharva More | `@atharvamore391` |
| 23070122175 | Deepak Rathod | `@deepak-rathod7385` |
| 23070122189 | Samartha Shrestha | `@samartha-shrestha` |
| 23070122266 | Sonali Gupta | `@sonaligupta1147` |

### 📸 Proof of Participation & Submission

#### 1. Devpost Hackathon Overview & Registration
*Registration and project participation at the Multimodal AI Hackathon 2026 organized by Kamand Prompt, IIT Mandi.*

![Devpost Hackathon Overview](devops/step6-bonus/hackathon-overview.png)

#### 2. Project Dashboard & "SUBMITTED" Status
*Project card for **StudyBuddy** showing the verified **SUBMITTED** status badge and team roster.*

![Devpost Submission Project Card](devops/step6-bonus/submission-project-card.png)

#### 3. Step-by-Step Submission & Team Verification
*Official Devpost submission confirmation showing 5/5 steps completed (`✔ Project submitted!`) and all four CA2 group members registered.*

![Devpost Submission Confirmation](devops/step6-bonus/submission-confirmation.png)

---

## 🚀 Quick Start — Run Locally

### Prerequisites
- Python 3.10+
- Git

### Setup
```bash
# Clone the repository
git clone https://github.com/AtharvaMore9388/Devops-CA2_2023-27.git
cd Devops-CA2_2023-27

# Navigate to Django app
cd "deepfake_vid/Deepfake_detection_using_deep_learning-master/Django Application"

# Install dependencies
pip install -r requirements.txt
pip install django-prometheus

# Run migrations
python manage.py migrate

# Start the server
python manage.py runserver 8000
```

Visit **http://127.0.0.1:8000** 🎉

> **Note:** Place `.pt` model weight files in the `models/` directory before running predictions. Model files are not included in the repo due to their large size (200MB+ each).

---

## 🧪 Challenges & Solutions

| Challenge | Solution |
|---|---|
| `torch` not installed in venv | Used system Python; documented correct environment |
| ML inference takes 30–60 seconds | Set Nginx/Gunicorn timeout to 300s |
| Model weight files too large for GitHub | Used Kubernetes PersistentVolumeClaims — models mounted, not baked in image |
| `face_recognition` (dlib) slow to compile | Pre-built in Docker builder stage with cmake |
| MAE weights missing warning | Graceful fallback to OpenCV inpainting |
| Rolling update caused brief downtime | Fixed with `maxUnavailable: 0` in K8s deployment strategy |
| Prometheus not scraping Django app | Installed `django-prometheus`, added `/metrics` URL and middleware |

---

## 🔬 References

1. DFREC: *DeepFake Identity Recovery Based on Identity-aware Masked Autoencoder* — [arXiv:2412.07260v2](https://arxiv.org/abs/2412.07260), Mar 2025
2. FRG2D with Residual Outlook Attention — ACM Transactions, 2025
3. [Django Documentation](https://docs.djangoproject.com/)
4. [Prometheus Documentation](https://prometheus.io/docs/)
5. [Kubernetes Documentation](https://kubernetes.io/docs/)

---


