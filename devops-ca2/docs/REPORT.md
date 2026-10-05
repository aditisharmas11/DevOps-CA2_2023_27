# DevOps CA2 - Report

**Student:** Aryan, TYCSA, Symbiosis Institute of Technology, Pune
**Service:** Quote Service (Flask API, Python 3.12)
**Challenge to enter after completion:** pick one DevOps challenge (Kaggle / Devpost / cloud hackathon) and record it in the group sheet and here: ______________

## 1. Architecture
Developers push to GitHub. GitHub Actions tests the code, validates the infrastructure files, builds a Docker image, pushes it to GitHub Container Registry and deploys it to a Kubernetes cluster as a 3-replica Deployment exposed by a NodePort Service. Ansible configures the host runtime (Docker, application user, directories, environment file). The service exposes `/metrics`; Prometheus scrapes it every 5 seconds and Grafana visualises uptime, request rate, p95 latency and error rate.

## 2. Step 1 - Deployment strategy
Tool: GitHub Actions (`.github/workflows/ci-cd.yml`). Jobs: `test` (pytest), `validate-infra` (yamllint, ansible syntax check), `build-and-push` (Docker to GHCR, tagged with commit SHA and latest), `deploy` (kind cluster, `kubectl apply`, `kubectl rollout status`, automatic `rollout undo` on failure). Pull requests run only the first two jobs. Diagram: `pipeline-diagram.svg` / `.png`.

## 3. Step 2 - Configuration management
`ansible/playbook.yml` applies the `runtime` role against the `appservers` inventory group: installs docker, python3, pip, git and curl; enables the docker service; creates the `quoteapp` user; creates `/opt/quote-service`; writes `app.env` with restricted permissions. All tasks use Ansible modules, so reruns are idempotent.

## 4. Step 3 - Containerization and orchestration
`app/Dockerfile` uses python:3.12-slim, installs pinned dependencies, runs as a non-root user under gunicorn and has a HEALTHCHECK. `k8s/deployment.yaml` defines 3 replicas, RollingUpdate (maxUnavailable 1, maxSurge 1), readiness and liveness probes and resource limits. `k8s/service.yaml` exposes port 80 to container port 5000. Rolling update and rollback commands are in the README; `/version` returns 1.0.0 before the update, 2.0.0 after it, and 1.0.0 again after rollback.
Screenshots to attach: pods during the update, `rollout history`, pods after `rollout undo`.

## 5. Step 4 - Monitoring and logging
The app exports `http_requests_total{method,endpoint,status}` and `http_request_duration_seconds` (histogram). Dashboard panels: uptime (`up`), request rate, p95 latency, error ratio (4xx and 5xx share). Logs: gunicorn writes access and error logs to stdout, readable with `kubectl logs` or `docker compose logs`.
Screenshots to attach: Prometheus targets page showing the service UP, and the Grafana dashboard after generating traffic.

## 6. Challenges
- Making rollouts safe: readiness probes keep traffic away from pods that are not ready.
- Choosing a latency metric: a histogram allows percentile queries instead of only an average.
- Keeping configuration repeatable: Ansible modules rather than shell commands.
(Replace or extend with the real problems your group hit while running the steps.)

## 7. Lessons learned
- Gate every pipeline stage so broken code never reaches the cluster.
- Probes and resource limits are what make rolling updates safe.
- Instrument the application first; useful dashboards follow from good metrics.
- Keep pipeline, playbook, manifests and dashboard in Git so the whole setup is reproducible.
