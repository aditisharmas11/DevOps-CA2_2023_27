# DevOps CA2 - Quote Service

Simple Flask service taken through CI/CD, configuration management, containers/Kubernetes and monitoring.

## Repo layout
| Path | Step |
|---|---|
| `.github/workflows/ci-cd.yml`, `docs/pipeline-diagram.*` | 1 - Deployment strategy (GitHub Actions) |
| `ansible/` | 2 - Configuration management (Ansible playbook + inventory) |
| `app/Dockerfile`, `k8s/` | 3 - Containerization and orchestration |
| `monitoring/` | 4 - Prometheus + Grafana |
| `docs/DevOps_CA2_Slides.pptx`, `docs/REPORT.md` | 5 - Reflection and report |

## Run it

**Service locally**
```
cd app && pip install -r requirements.txt && pytest -q && python app.py
curl -X POST localhost:5000/quote -H 'Content-Type: application/json' -d '{"size":"medium","hours":10}'
```

**Step 2 - Ansible**
```
cd ansible && ansible-playbook -i inventory.ini playbook.yml --ask-become-pass
```

**Step 3 - Kubernetes with rolling update and rollback** (minikube or kind)
```
docker build -t quote-service:1.0.0 --build-arg APP_VERSION=1.0.0 app
kind load docker-image quote-service:1.0.0      # or: minikube image load quote-service:1.0.0
sed "s|IMAGE_PLACEHOLDER|quote-service:1.0.0|" k8s/deployment.yaml | kubectl apply -f -
kubectl apply -f k8s/service.yaml
kubectl rollout status deployment/quote-service

# rolling update
docker build -t quote-service:2.0.0 --build-arg APP_VERSION=2.0.0 app
kind load docker-image quote-service:2.0.0
kubectl set image deployment/quote-service quote-service=quote-service:2.0.0
kubectl rollout status deployment/quote-service
kubectl rollout history deployment/quote-service

# rollback
kubectl rollout undo deployment/quote-service
kubectl rollout status deployment/quote-service
```
Take screenshots of `kubectl get pods -w` during the update, the history output and the rollback.

**Step 4 - Monitoring**
```
cd monitoring && docker compose up --build
# generate traffic
for i in $(seq 1 200); do curl -s localhost:5000/health >/dev/null; curl -s -X POST localhost:5000/quote -H 'Content-Type: application/json' -d '{"size":"x","hours":1}' >/dev/null; done
```
Open Prometheus at http://localhost:9090 and Grafana at http://localhost:3000 (admin / admin). The dashboard "Quote Service Overview" shows uptime, request rate, p95 latency and error rate. Take screenshots for submission.
