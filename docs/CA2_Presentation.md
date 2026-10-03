# DevOps CA2 Presentation Outline

**Format:** 5 slides, approximately 5–7 minutes. Replace bracketed evidence prompts with real screenshots captured from your environment. Do not present pending work as completed.

## Slide 1 — Project and Architecture

**Title:** DevOps CA2 Monitoring Service

- Express service on Node.js 20; homepage, `/health`, and `/metrics` on port 4000.
- Docker image deployed to Minikube as a two-replica Kubernetes Deployment behind a NodePort Service.
- Prometheus scrapes CA2; Grafana visualizes service health, requests, and Node.js memory metrics.
- Ansible playbook provides an additional systemd deployment path for Debian/Ubuntu hosts.

**Visual:** Use the architecture diagram from `CA2_Final_Report.md`.  
**Evidence prompt:** `[Insert real architecture diagram or application screenshot]`.

**Speaker note:** Distinguish components running in Minikube/CA3 from the optional Ansible host deployment.

## Slide 2 — GitHub Actions CI/CD

- Workflow: `.github/workflows/ci.yml`, triggered by pushes and pull requests to `master`.
- Pipeline: checkout → Node.js 20 → `npm ci` → syntax check → endpoint/metrics smoke tests → deployment simulation.
- The deployment step is a simulation; CI does not deploy to Kubernetes.
- Local syntax and endpoint checks passed. A GitHub-hosted Actions run is still pending evidence.
- Existing `docs/ci-cd.md` mentions `main`; the actual workflow targets `master`.

**Visual:** Use the CI pipeline Mermaid diagram from `CA2_Final_Report.md`.  
**Evidence prompt:** `[Insert successful GitHub Actions run screenshot after it runs on master]`.

## Slide 3 — Docker, Kubernetes, and Ansible

- Dockerfile: `node:20-alpine`, production dependency install, port 4000, non-root runtime user.
- Kubernetes: two replicas, readiness/liveness probes on `/health`, NodePort Service; Minikube uses a preloaded image (`imagePullPolicy: Never`).
- Current verified state: 2/2 replicas available; both pods Running with zero restarts.
- Ansible playbook installs distro Node.js/npm, copies app files, installs locked production dependencies, and configures a restricted systemd service.
- Ansible uses a placeholder inventory host and has not been run on a real server.

**Evidence prompt:** `[Insert genuine Docker build, Kubernetes status, and Ansible verification screenshots]`.

## Slide 4 — Rolling Update and Rollback

- The live Deployment uses Kubernetes' default `RollingUpdate` strategy (`maxSurge: 25%`, `maxUnavailable: 25%`).
- Current read-only rollout status succeeded; history lists revisions 1–4.
- A new image rollout and rollback have not been performed; existing history alone is not proof of the assignment exercise.
- Demonstration sequence: build/load a new tag → `kubectl set image` → check rollout/history → `kubectl rollout undo` → verify `/health`.

**Evidence prompt:** `[Insert before/after rollout status, revision history, rollback result, and post-rollback health screenshots after actual execution]`.

## Slide 5 — Monitoring, Reflection, and Next Steps

- Current observed Prometheus state: `ca2-devops` UP (`up=1`); CA2 `/health` returned `healthy`.
- Existing CA3 scrape target at port 3000 is currently DOWN with connection refused; CA3 configuration was preserved.
- Dashboard JSON includes scrape health, total requests, request rate by route, heap use, and process RSS.
- Lessons: use immutable tags for rollback, keep port-forwarding active for this scrape path, align runtime versions, and collect evidence for each claimed deployment.
- Remaining work: successful hosted CI screenshot, Ansible host verification, actual rollout/rollback evidence, and Grafana screenshot.

**Evidence prompt:** `[Insert real Prometheus target and populated Grafana dashboard screenshots]`.

**Closing statement:** The application and monitoring path are verified; the remaining deployment exercises and screenshots are clearly identified as pending.