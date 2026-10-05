# DevOps Project: Task Tracker

One small Flask service carried through the whole DevOps lifecycle.

| Task | Folder / file |
|---|---|
| 1. Deployment pipeline (GitHub Actions) | `.github/workflows/ci-cd.yml`, `docs/pipeline-diagram.svg` |
| 2. Config management (Ansible) | `ansible/` |
| 3. Docker + Kubernetes | `Dockerfile`, `k8s/` |
| 4. Monitoring (Prometheus + Grafana) | `docker-compose.yml`, `monitoring/` |
| 5. Reflection & slides | `docs/` |

## Run locally
```bash
pip install -r requirements-dev.txt
pytest -v
python app/main.py        # http://localhost:5000
```
Endpoints: `/`, `/health`, `/tasks` (GET/POST), `/error` (returns 500 on purpose), `/metrics`.

## Task 1 - Pipeline
1. Create a GitHub repo and push this folder to `main`.
2. Open the **Actions** tab. The pipeline runs: test -> docker build/push (GHCR) -> deploy to a `kind` cluster -> smoke test.
3. Screenshot a green run. Include `docs/pipeline-diagram.svg`.
   (Repo Settings > Actions > General > Workflow permissions: set "Read and write".)

## Task 2 - Ansible (Ubuntu/WSL/VM)
```bash
sudo apt install -y ansible
cd ansible
ansible-playbook -i inventory.ini playbook.yml --check   # dry run
ansible-playbook -i inventory.ini playbook.yml           # apply
ansible-playbook -i inventory.ini playbook.yml           # run again -> "changed=0" (idempotent)
```
Screenshot both runs. Verify: `id appuser; ls -l /opt/task-tracker`.

## Task 3 - Docker & Kubernetes (minikube or kind)
```bash
docker build -t task-tracker:v1 .
minikube start            # or: kind create cluster
minikube image load task-tracker:v1     # kind: kind load docker-image task-tracker:v1

sed 's|IMAGE_PLACEHOLDER|task-tracker:v1|' k8s/deployment.yaml | kubectl apply -f -
kubectl apply -f k8s/service.yaml
kubectl get pods -w                      # screenshot: 3 pods Running
minikube service task-tracker --url      # open /health

# Rolling update: build v2 and update
docker build -t task-tracker:v2 .
minikube image load task-tracker:v2
kubectl set image deployment/task-tracker task-tracker=task-tracker:v2
kubectl rollout status deployment/task-tracker   # screenshot
kubectl rollout history deployment/task-tracker

# Rollback
kubectl rollout undo deployment/task-tracker
kubectl rollout status deployment/task-tracker   # screenshot
```
Tip: to see a *failed* update and rollback, set the image to `task-tracker:doesnotexist`,
watch pods stuck in `ImagePullBackOff` (old pods keep serving), then run `rollout undo`.

## Task 4 - Monitoring
```bash
docker compose up -d --build
bash monitoring/load.sh       # generates traffic + errors
```
- Prometheus: http://localhost:9090 > Status > Targets (should be UP)
- Grafana: http://localhost:3000 (admin / admin) > Dashboards > "Task Tracker - Service Health"
- Panels: uptime, request rate, p95 latency, error rate. Screenshot while load.sh runs.
- Stop the app (`docker compose stop app`) to show uptime dropping to 0.

## Task 5 - Slides (4-5)
1. Architecture  2. Pipeline flow  3. Challenges  4. Lessons learned  (+ title/demo)
