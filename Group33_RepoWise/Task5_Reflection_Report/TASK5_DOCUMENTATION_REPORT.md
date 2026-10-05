# Task 5: Reflection & Documentation Report

**Course:** DevOps (CA-II)  
**Task Description:** 4–5 slides: Architecture, pipeline flow, challenges, lessons learned. Documentation (Architecture, pipeline flow, challenges, lessons learned).  
**Target Application:** **RepoWise** (`@repowise/server` — TypeScript Node.js backend microservice)  
**Group Members:**
1. Kshitiz Shah (PRN: 23070122121)
2. Nitesh Ghimire (PRN: 23070122150)
3. Nigel Francy (PRN: 23070122148)
4. Omkar Kadam (PRN: 23070122158)

---

## 1. System Architecture Overview

**RepoWise** is an AI-powered repository indexing and codebase intelligence platform designed to parse repositories, generate structural ASTs, construct vector embeddings, and answer developer queries in real time.

### Microservice Decomposition
The platform is decoupled into three primary tiers:
1. **Frontend Presentation Tier (`client/`):** React / Vite single-page application communicating over HTTP REST and WebSockets.
2. **Backend API & Orchestration Service (`server/` — Target Service):** Node.js 22 + TypeScript + Express + Prisma ORM. Handles user authentication, repository lifecycle orchestration, database transactions, and proxying vector queries.
3. **AI Intelligence Engine (`ai-service/`):** Python FastAPI service responsible for tokenization, embedding generation, and vector indexing.
4. **Data Persistence Tier:**
   * **PostgreSQL (Port 5432):** Relational metadata store for users, repositories, analysis jobs, and audit logs.
   * **Qdrant Vector Database (Port 6333):** High-dimensional vector index for semantic codebase retrieval.

```
       RepoWise Complete Microservices Architecture
       
                 +-----------------------------------+
                 |   Client Web UI (React / Nginx)   |
                 +-----------------+-----------------+
                                   | (HTTP / REST)
                                   v
+---------------------------------------------------------------------------+
|               Target Service: RepoWise API Server (Node.js 22)            |
|       [CI/CD Pipeline • Docker Container • Kubernetes Deployment]         |
+-------------------+-----------------------------------+-------------------+
                    |                                   |
                    v (Prisma ORM)                      v (gRPC / HTTP)
       +-------------------------+         +-------------------------+
       |   PostgreSQL Database   |         |   Qdrant Vector Store   |
       |   [Port 5432 - Cluster] |         |   [Port 6333 - Vector]  |
       +-------------------------+         +-------------------------+
```

---

## 2. End-to-End CI/CD Pipeline Flow

We implemented an automated Continuous Integration and Continuous Deployment (CI/CD) pipeline using **GitHub Actions** (`.github/workflows/deploy.yml`):

### Pipeline Stages
1. **Trigger & Path Filtering:** Triggers automatically on `push` or `pull_request` targeting `main`. We configured path filtering (`paths: ['server/**']`) to prevent running the backend build when only frontend or docs are modified.
2. **Automated Testing & Compilation:**
   * Provisions an ephemeral `ubuntu-latest` runner with Node.js 22.
   * Installs clean dependencies using `npm ci`.
   * Generates Prisma ORM bindings (`npx prisma generate`).
   * Runs the Vitest test suite (`npm test -- --run`) with mock database connections.
   * Compiles TypeScript into JavaScript (`npm run build` &rarr; `dist/`).
3. **Container Packaging & Registry Publishing:**
   * Executes a multi-stage Docker build separating the compilation toolchain from the minimal Alpine runner.
   * Authenticates with GitHub Container Registry (`ghcr.io`) using `${{ secrets.GITHUB_TOKEN }}`.
   * Tags images immutably with the commit SHA (`:sha-xxxxxxx`) and `:latest`.
4. **Deployment & Automated Health Verification:**
   * Triggers a Kubernetes zero-downtime rolling update.
   * Executes an automated `/health` smoke test to verify readiness before closing the workflow.

---

## 3. Real-World Engineering Challenges & Mitigations

During the execution of this DevOps lifecycle, our team encountered and resolved three significant technical hurdles:

### Challenge 1: Prisma Native Engine Failure in Alpine Linux Containers
* **Root Cause:** Alpine Linux relies on `musl libc` instead of the standard GNU C library (`glibc`). When the Node.js application initialized, Prisma's query engine failed to load its native binary.
* **Engineering Mitigation:** We updated the `Dockerfile` builder stage with `apk add --no-cache libc6-compat` and explicitly configured the binary target in `schema.prisma`. Furthermore, by utilizing a two-stage build, the compiled binaries were isolated into the production runner without carrying package build artifacts.

### Challenge 2: Premature Traffic Routing During Kubernetes Rolling Updates
* **Root Cause:** By default, Kubernetes routes traffic to a pod as soon as its container process starts (`STATUS: Running`). However, the RepoWise Express server requires ~3 seconds to initialize PostgreSQL connection pools and verify Qdrant reachability. During our initial rollout test, incoming HTTP requests experienced brief 502 Bad Gateway errors.
* **Engineering Mitigation:** We configured a strict `readinessProbe` in `deployment.yaml` with `initialDelaySeconds: 5` targeting `/health`. Kubernetes now holds pods in `0/1 Ready` until the probe succeeds, guaranteeing zero dropped requests during rolling updates.

### Challenge 3: Idempotent Configuration Management in Ansible
* **Root Cause:** When running configuration scripts multiple times, manual shell commands created duplicate entries in `/etc/nginx/sites-available` and failed when packages were already present.
* **Engineering Mitigation:** We restructured all tasks in `playbook.yml` to utilize declarative Ansible modules (`ansible.builtin.apt`, `ansible.builtin.template`, `ansible.builtin.file`) with Jinja2 templates (`.j2`) and handlers. Running the playbook repeatedly reports `changed=0`, ensuring zero configuration drift.

---

## 4. Key DevOps Lessons Learned

1. **Automated Quality Gates Eliminate Release Anxiety:**
   * Prior to implementing CI/CD, testing was manual and deployments were stressful. Automating Vitest and TypeScript compilation on every pull request caught type errors and regressions before code could ever merge to `main`.
2. **Micro-Deployments are Safer than Batch Releases:**
   * Delivering small, incremental commits with short-lived feature branches and container tags drastically reduces blast radius. If an error slips through, rollback is instantaneous (`kubectl rollout undo`).
3. **Observability is Proactive, Not Reactive:**
   * Integrating Prometheus metrics via the RED Method (Rate, Errors, Duration) provided immediate visibility into service performance. Real-time p95 latency alerts detect degraded database queries long before users experience timeouts.
4. **Infrastructure as Code Guarantees Consistency:**
   * Using Ansible to codify runtime environments eliminates the classic *"it works on my machine"* problem, ensuring that Development, Staging, and Production servers remain identical.

---

## 5. Slide Presentation Reference

The 5-slide presentation deck is available in two formats:
* **Landscape Slide Deck (PDF):** [`SLIDES_PRESENTATION.pdf`](file:///Users/kshitiz/devops-lab/kshitiz/CA2_Practical_Tasks/Task5_Reflection_Report/SLIDES_PRESENTATION.pdf)
* **Interactive Slide Deck (HTML):** [`SLIDES_PRESENTATION.html`](file:///Users/kshitiz/devops-lab/kshitiz/CA2_Practical_Tasks/Task5_Reflection_Report/SLIDES_PRESENTATION.html)
* **Markdown Slide Source:** [`SLIDES_PRESENTATION.md`](file:///Users/kshitiz/devops-lab/kshitiz/CA2_Practical_Tasks/Task5_Reflection_Report/SLIDES_PRESENTATION.md)
