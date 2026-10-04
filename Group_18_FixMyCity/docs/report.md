# DevOps CA2 Report - PBL Backend (Fix My City auth API)

## Team

| Name | PRN |
|---|---|
| Om Ghule | 23070122154 |
| Dhruv Gangurde | 23070122091 |
| Lakshya Jain | 23070122124 |
| Aman Srivastava | 23070122024 |


## 1. Architecture
React frontend -> Node/Express API (JWT auth, bcrypt) -> MongoDB.
The API exposes /health and /metrics (prom-client). It is containerised with Docker, deployed on Kubernetes (kind) with 3 replicas, monitored by Prometheus and Grafana, configured with Ansible and delivered by GitHub Actions.

## 2. Pipeline flow
Push to main -> test job (npm ci, npm test) -> build-and-push job (Docker image to GitHub Container Registry) -> deploy-to-kind job (temporary kind cluster, kubectl apply, rollout status). See pipeline-diagram.png and screenshots/09-actions-green.png.

## 3. Steps and evidence
- Step 1 Deployment: .github/workflows/ci-cd.yml, all 3 jobs green (screenshots/09-actions-green.png).
- Step 2 Ansible: ansible/site.yml and inventory.ini install packages, create user pbluser, create /opt/pbl-backend, template a .env file and copy docker-compose.yml. First run changed=5 failed=0, second run changed=0 (08-ansible-run.png, 08b-ansible-idempotent.png).
- Step 3 Docker and Kubernetes: backend/Dockerfile, k8s/*.yaml (Deployment with 3 replicas, RollingUpdate maxUnavailable 0, readiness and liveness probes, NodePort Service). Rolling update v1 to v2 and rollback with kubectl rollout undo (05-k8s-pods.png, 06-rolling-update.png, 07-rollback.png).
- Step 4 Monitoring: Prometheus scrapes /metrics every 5s. Grafana dashboard shows uptime, request rate, p95 latency and 5xx error rate (03-prometheus-targets.png, 04-grafana-dashboard.png).

## 4. Challenges
- Port conflicts: port 9090 was already in use, so Prometheus was moved to host port 9091. Windows also blocked port 8080 for kubectl port-forward, so port 18080 was used.
- WSL had no network access, so apt hung. Ansible was run inside an Ubuntu Docker container instead.
- Docker Desktop engine stopped after WSL was reset and had to be restarted.
- Grafana login failed, so anonymous access was enabled for the demo.
- The error-rate panel showed No data because no 5xx errors existed. The query was changed to use "or vector(0)" and a demo /api/error endpoint was added to generate real 5xx responses.
- npm test failed on Node 24 with a folder argument, so the script was changed to point at the test file.
- Pushing to GitHub was rejected because the new repo already had a commit, solved with git pull --rebase.
- Secrets: backend/.env contains database credentials, so it is git-ignored and Kubernetes uses a Secret instead.

## 5. Lessons learned
- Readiness probes and maxUnavailable 0 give zero-downtime rolling updates, and rollback is one command.
- A histogram plus a counter is enough to build uptime, latency and error-rate panels.
- Ansible is idempotent: the second run changed nothing.
- Secrets must stay out of git; CI should run the same tests that run locally.
- Most of the time went into environment problems (ports, networking, engine state), so checking basics first saves time.
