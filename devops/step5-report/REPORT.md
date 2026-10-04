# DevOps CA2 — Deepfake Detection App | Reflection & Report

---

## Slide 1: Project Overview & Architecture

### Project
**Deepfake Detection using Deep Learning** — A Django web app detecting AI-generated faces using:
- **ResNeXt-50 + LSTM** — video/image face classifier
- **MAE (Masked Autoencoder)** — identity-preserving face reconstruction
- **CAM Heatmaps** — visualise manipulated face regions

### Architecture
```
User Browser
    |
  Nginx (reverse proxy)
    |
  Gunicorn WSGI (3 workers)
    |
  Django App (ml_app)
    +-- ResNeXt-50 + LSTM (.pt weights)  --> Face classifier
    +-- MAE Reconstruction (mae_modules) --> Face reconstruction
    +-- face_recognition (dlib)          --> Face crop & detect
```

### DevOps Infrastructure
```
GitHub --> GitHub Actions CI/CD
               |
     +---------+---------+
   Test           Build & Push
 (lint+check)   (Docker to GHCR)
                     |
               Deploy to K8s
            (Rolling + Rollback)
                     |
          Kubernetes (deepfake-ns)
          +-- Deployment (2 replicas, HPA 2-6)
          +-- Service (LoadBalancer port 80)
          +-- PVCs (images 5Gi, models 10Gi)
                     |
       Prometheus --> Grafana Dashboard
       Node Exporter   (uptime, latency,
       cAdvisor         error rate, CPU/RAM)
```

---

## Slide 2: Pipeline Flow (Step 1 — GitHub Actions)

**Tool chosen: GitHub Actions**
Reason: Free, native GitHub integration, YAML-based, secrets management built-in.

| Stage | Tool | Purpose |
|---|---|---|
| Trigger | GitHub Actions | Push or PR to main/master |
| Test | flake8 + manage.py check | Lint Python, validate Django config |
| Build | Docker Buildx + GHCR | Multi-stage build, tagged with git SHA |
| Deploy | kubectl set image | Rolling update to K8s cluster |
| Verify | kubectl rollout status | Wait for all pods healthy |
| Rollback | kubectl rollout undo | Auto-rollback on deploy failure |

**Workflow file:** `.github/workflows/ci-cd.yml`

![GitHub Actions CI/CD Pipeline Run](../step1-github-actions/github-actions-success.png)

---

## Slide 3: Configuration Management & IaC (Step 2 — Ansible)

**Tool: Ansible**

| Task Group | What Ansible Configures |
|---|---|
| System Packages | Python 3.10, cmake, OpenCV, Nginx, Supervisor |
| User Management | Creates `deepfake` user/group, restricted shell |
| Directory Setup | `/opt/deepfake-detection/{images,videos,models,logs}` |
| Python venv | Isolated venv, installs all pip deps including torch |
| Env Config | Writes `.env` with `DEBUG=False`, `SECRET_KEY` |
| Nginx | Reverse proxy with 300s timeout for ML inference |
| Supervisor | Gunicorn daemon, auto-restart on crash |
| Health Check | `uri` module verifies HTTP 200 after setup |

**Files:** `playbook.yml` + `inventory.ini`

---

## Slide 4: Containerization & Orchestration (Step 3)

### Docker (Multi-Stage Build)
- **Stage 1 (builder):** Installs all Python deps including torch, dlib, OpenCV
- **Stage 2 (runtime):** Copies only installed packages — lean final image
- Runs as **non-root** user (UID 1000) for security
- Built-in `HEALTHCHECK` for Kubernetes probe compatibility

### Kubernetes Manifests

| File | Purpose |
|---|---|
| `k8s-namespace.yaml` | Isolates workload in `deepfake-ns` |
| `k8s-deployment.yaml` | 2 replicas, rolling update, liveness+readiness probes |
| `k8s-service.yaml` | LoadBalancer port 80 → 8000 |
| `k8s-pvcs.yaml` | PVCs for images (5Gi), models (10Gi) |
| `k8s-hpa.yaml` | Auto-scales 2–6 pods at CPU 70% |

### Rolling Update & Rollback Commands
```bash
# Trigger rolling update with new image
kubectl set image deployment/deepfake-detection \
  deepfake-app=ghcr.io/user/deepfake-detection-app:sha-abc123 \
  --namespace=deepfake-ns

# Monitor rollout
kubectl rollout status deployment/deepfake-detection -n deepfake-ns

# Rollback if needed
kubectl rollout undo deployment/deepfake-detection -n deepfake-ns
```
Zero-downtime ensured by `maxUnavailable: 0`.

---

## Slide 5: Monitoring & Lessons Learned (Step 4 + Reflection)

### Monitoring Stack

| Tool | Role | Access |
|---|---|---|
| Prometheus | Scrapes & stores all metrics | localhost:9090 |
| Grafana | Dashboards & alerting | localhost:3000 (admin/deepfake123) |
| Node Exporter | Host CPU/RAM/disk | localhost:9100 |
| cAdvisor | Container resource usage | localhost:8080 |
| django-prometheus | App /metrics endpoint | localhost:8000/metrics |

```bash
# Start monitoring stack
docker compose -f step4-monitoring/docker-compose.monitoring.yml up -d
```

### Dashboard Panels
1. App Uptime — UP/DOWN status (green/red)
2. HTTP Request Rate — req/s by method
3. P95 Latency — 95th percentile response time
4. Error Rate — 4xx/5xx per second
5. CPU & Memory — host utilization gauges
6. Total Predictions — business metric counter
 
![Docker Compose Up Terminal](../step4-monitoring/docker-compose-up-terminal.png)
![Docker Monitoring Stack](../step4-monitoring/docker-monitoring-stack.png)
![Grafana Node Exporter Metrics Dashboard](../step4-monitoring/grafana-metrics-dashboard.png)

### Challenges & Solutions

| Challenge | Solution |
|---|---|
| `torch` not in venv | Used system Python; documented correct environment |
| ML inference takes 30–60s | Set Nginx/Gunicorn timeout to 300s |
| Large model files (GBs) in Docker | Used PersistentVolumeClaims — models never in image |
| `face_recognition` (dlib) long compile | Pre-built in Docker builder stage with cmake |
| MAE weights missing warning | Graceful fallback to OpenCV inpainting |
| `maxUnavailable > 0` caused downtime | Changed to `maxUnavailable: 0` for zero-downtime |

### Lessons Learned
- Containers are not a silver bullet — ML model weights must be mounted, not baked in
- Kubernetes probe `initialDelaySeconds` must account for ML model loading time (60s+)
- Ansible idempotency eliminates errors during iterative server setup
- Prometheus + Grafana revealed latency spikes during dlib face detection
- GitHub Actions secrets management is simpler than managing external CI credentials

---

## Slide 6: Step 6 — Bonus (External DevOps & AI Hackathon)

### 🏆 Challenge Participation
- **Platform:** [Devpost](https://devpost.com/)
- **Hackathon:** [Multimodal AI Hackathon 2026](https://multimodal-ai-hackathon-2026-7.devpost.com/) (Kamand Prompt, IIT Mandi)
- **Project:** **StudyBuddy — Source-Grounded AI Tutor with Adaptive Quizzes**
- **Status:** **SUBMITTED** (5/5 steps completed)
- **Team (Group 13):** Atharva More, Deepak Rathod, Samartha Shrestha, Sonali Gupta
- **Deliverables & Proof:** Full documentation and submission screenshots available in [`devops/step6-bonus/`](../step6-bonus/)

---

