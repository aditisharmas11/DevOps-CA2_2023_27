# DevOps CA-II (Task 2): FA3-CLIP Deepfake Detector

**Symbiosis Institute of Technology, Pune | B.Tech Computer Engineering (2023-27)**

## Group members

| Name | PRN |
|---|---|
| Laxmi Sah | 23070122125 |
| Diksha Jha | 23070122086 |

## Project

The service used for this task is our final-year BTech project, the **FA3-CLIP Face Attack Detector**: a FastAPI web app that classifies face images as real or fake.

- Project repository: https://github.com/LAXMI001-web/btech-project
- Pipeline runs (GitHub Actions): https://github.com/LAXMI001-web/btech-project/actions

The trained model checkpoint (about 580 MB) is not in the repository or the container image, so the containers run the app in demo mode. This is enough to demonstrate every DevOps step.

## Steps and where to find them

| Step | Tool | Files | Screenshots (`screenshots/`) |
|---|---|---|---|
| 1. Deployment pipeline | GitHub Actions | `.github/workflows/ci-cd.yml`, `docs/pipeline_diagram.png` | `step1-*` |
| 2. Configuration management / IaC | Ansible | `ansible/playbook.yml`, `ansible/inventory.ini` | `step2-*` |
| 3. Containers and orchestration | Docker, Kubernetes (minikube) | `Dockerfile`, `k8s/deployment.yaml`, `k8s/service.yaml` | `step3-*` |
| 4. Monitoring | Prometheus, Grafana | `metrics.py`, `monitoring/` (compose file, Prometheus config, Grafana dashboard JSON) | `step4-*` |
| 5. Reflection and report | Slides and report | `report/`, `slides/`, `docs/` | - |
| 6. Bonus | Not attempted | - | - |

## What each step shows

1. **GitHub Actions:** on every push, the pipeline runs 4 pytest tests, builds the Docker image, pushes it to GitHub Container Registry, and validates the Kubernetes manifests.
2. **Ansible:** installs packages, creates the `fa3-clip-detector` user and group, creates `/opt/fa3-clip-detector`, generates `app.env` from a template and copies the app files. A second run reports `changed=0`, which shows it is idempotent.
3. **Docker and Kubernetes:** two image versions (1.0.0 and 2.0.0) deployed as 3 replicas behind a NodePort service. The screenshots show a rolling update to 2.0.0 and a rollback to 1.0.0.
4. **Prometheus and Grafana:** the app exposes `/metrics`; Prometheus scrapes it every 5 seconds; the Grafana dashboard shows uptime, request rate, p95 latency and error rate.
5. **Report and slides:** architecture, pipeline flow, challenges faced and lessons learned.

## Individual contributions

- **Laxmi Sah:** project and metrics module, Step 1 (pipeline), Step 3 (Docker, Kubernetes, rolling update and rollback), Step 4 (monitoring).
- **Diksha Jha:** Step 2 (Ansible), Step 5 (slides and report), repository submission.

## How to run (summary)

```bash
# tests
pip install -r requirements-ci.txt && pytest -v

# images
docker build -t fa3-clip-detector:1.0.0 --build-arg APP_VERSION=1.0.0 .
docker build -t fa3-clip-detector:2.0.0 --build-arg APP_VERSION=2.0.0 .

# Kubernetes (minikube)
minikube start --driver=docker --cni=bridge
minikube image load fa3-clip-detector:1.0.0
minikube image load fa3-clip-detector:2.0.0
kubectl apply -f k8s/

# monitoring (Prometheus :9090, Grafana :3000, login admin/admin)
cd monitoring && docker compose up -d --build
```

Note: the GitHub Actions workflow only runs from the root of a repository, so it is not active inside this folder. The file is included here for review, and its successful runs are in the project repository linked above.
