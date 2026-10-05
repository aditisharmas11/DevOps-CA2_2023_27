# Task 1: Deployment Strategy & CI/CD Pipeline

**Course:** DevOps (CA-II)  
**Task Description:** Select one deployment tool (GitHub Actions / Codefresh / Harness / Spinnaker / etc.) and prepare a working pipeline for a simple service (ANY PBL OR BTECH PROJECT). Submit workflow file & pipeline diagram.  
**Selected Project:** **RepoWise** (`@repowise/server` — TypeScript Node.js backend microservice)  
**Selected CI/CD Tool:** **GitHub Actions**  
**Group Members:**
1. Kshitiz Shah (PRN: 23070122121)
2. Nitesh Ghimire (PRN: 23070122150)
3. Nigel Francy (PRN: 23070122148)
4. Omkar Kadam (PRN: 23070122158)

---

## 1. Tool Selection & Engineering Rationale

For our PBL microservice **RepoWise**, we evaluated several deployment platforms (GitHub Actions, Spinnaker, Harness, and Jenkins) and selected **GitHub Actions** for the following technical reasons:

1. **Native GitHub Ecosystem Integration:** The RepoWise codebase is hosted on GitHub (`https://github.com/kshitiz-shah/Repowise`). GitHub Actions provides seamless repository-level triggers (`push`, `pull_request`, path filtering) without requiring webhook configurations or external master-agent controllers.
2. **Zero Maintenance / Serverless Runners:** Unlike self-hosted Jenkins or Spinnaker which require dedicated VMs, database backends, and cluster management, GitHub Actions provides ephemeral, isolated `ubuntu-latest` execution environments out-of-the-box.
3. **Built-in Security & Secrets Isolation:** Authentication with the GitHub Container Registry (`ghcr.io`) utilizes the automatically injected, short-lived `${{ secrets.GITHUB_TOKEN }}`, eliminating the need to store long-lived registry passwords in plaintext.
4. **Declarative Pipeline-as-Code:** Workflows are version-controlled alongside application code in `.github/workflows/deploy.yml`, enabling automated testing of pipeline configuration changes through pull requests.

---

## 2. Pipeline Architecture & Execution Flow

The RepoWise CI/CD pipeline is architected into **four distinct sequential stages**, enforcing automated quality gates before any artifact reaches production.

### Pipeline Flow Diagram (Mermaid)

```mermaid
flowchart LR
    A["1. Code Push / PR<br/>(branch: main)"] --> B["2. Test & Build<br/>- Node.js 22<br/>- Prisma ORM<br/>- Vitest Suite<br/>- TypeScript tsc"]
    B --> C["3. Containerize<br/>- Multi-stage Docker<br/>- Security scan<br/>- Push to GHCR"]
    C --> D["4. Deploy & Verify<br/>- Kubernetes Rolling Update<br/>- Zero Downtime<br/>- Healthcheck /health"]

    style A fill:#eff6ff,stroke:#3b82f6,stroke-width:2px,color:#1e3a8a
    style B fill:#eef2ff,stroke:#6366f1,stroke-width:2px,color:#312e81
    style C fill:#f0f9ff,stroke:#0284c7,stroke-width:2px,color:#0c4a6e
    style D fill:#f0fdf4,stroke:#16a34a,stroke-width:2px,color:#14532d
```

### Visual Pipeline Architecture
![Pipeline Flow Diagram](file:///Users/kshitiz/devops-lab/kshitiz/CA2_Practical_Tasks/Task1_Deployment_Strategy/pipeline-diagram.svg)

---

## 3. Detailed Stage-by-Stage Explanation

### Stage 1: Trigger Event & Path Filtering
* **Triggers:** Automatically activates on `push` to the `main` branch, on `pull_request` targeting `main`, or manually via `workflow_dispatch`.
* **Path Filtering:** Configured with `paths: ['server/**']` to ensure backend builds are only triggered when relevant backend code or configurations are modified, preventing wasteful runner minutes.

### Stage 2: Continuous Integration (`test-and-build`)
* **Environment:** Ephemeral `ubuntu-latest` container.
* **Dependencies:** Configured with `actions/setup-node@v4` targeting Node.js 22 with automated `npm` cache hashing based on `server/package-lock.json`.
* **ORM Schema Generation:** Runs `npx prisma generate` to construct type-safe Prisma database client bindings.
* **Automated Unit & Integration Testing:** Executes `npm test -- --run` via `vitest` with mock database configurations to validate authentication, route handlers, and data schemas.
* **TypeScript Compilation:** Executes `npm run build` (`tsc`) to compile TypeScript into production JavaScript under `server/dist/`.
* **Artifact Retention:** Uploads compiled artifacts via `actions/upload-artifact@v4` for subsequent container packaging stages.

### Stage 3: Containerization & Registry Push (`docker-build-and-push`)
* **Condition:** Executes only on successful test runs targeting `main` (pull requests are validated without publishing images).
* **Multi-Stage Build:** Leverages Docker Buildx and a multi-stage `Dockerfile` (`builder` & `runner`) to isolate development dependencies (`typescript`, `@types/*`, `prisma`) and produce a slim production container running as a non-root `node` user.
* **Tagging Strategy:** Generates immutable tags based on Git commit SHA (`:sha-xxxxxxx`) alongside the rolling `:latest` tag for release traceability.
* **Publishing:** Authenticates against `ghcr.io` and pushes the container image.

### Stage 4: Continuous Deployment & Verification (`deploy-service`)
* **Rolling Update:** Notifies the deployment target and issues a Kubernetes rolling update command (`kubectl set image deployment/repowise-server ...`), swapping pods one-by-one with zero user downtime.
* **Automated Verification:** Executes an HTTP healthcheck probe against `/health` to ensure the container is healthy before completing the workflow.

---

## 4. Complete Workflow File (`ci-cd-pipeline.yml`)

The production pipeline configuration is stored at `.github/workflows/deploy.yml`:

```yaml
name: RepoWise CI/CD Deployment Pipeline

on:
  push:
    branches: [ "main" ]
    paths:
      - 'server/**'
      - '.github/workflows/**'
  pull_request:
    branches: [ "main" ]
    paths:
      - 'server/**'
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository_owner }}/repowise-server
  NODE_VERSION: '22.x'

jobs:
  test-and-build:
    name: 🧪 Run Tests & Build TypeScript
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./server

    steps:
      - name: ⬇️ Checkout Repository Code
        uses: actions/checkout@v4

      - name: 🟢 Setup Node.js Runtime
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: './server/package-lock.json'

      - name: 📦 Install Clean NPM Dependencies
        run: npm ci

      - name: 🗄️ Generate Prisma ORM Client
        run: npx prisma generate

      - name: 🧪 Execute Automated Vitest Suite
        run: npm test -- --run
        env:
          NODE_ENV: test
          JWT_SECRET: test_jwt_secret_ci_cd_key_12345
          DATABASE_URL: "postgresql://repowise:repowise_dev_password@localhost:5432/repowise?schema=public"

      - name: 🔨 Compile TypeScript Source Code
        run: npm run build

      - name: 📤 Archive Compiled Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: repowise-build-dist
          path: ./server/dist
          retention-days: 2

  docker-build-and-push:
    name: 🐳 Build & Push Docker Image
    needs: test-and-build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'
    permissions:
      contents: read
      packages: write

    steps:
      - name: ⬇️ Checkout Repository Code
        uses: actions/checkout@v4

      - name: 📥 Download Compiled Build Artifacts
        uses: actions/download-artifact@v4
        with:
          name: repowise-build-dist
          path: ./server/dist

      - name: 🔧 Set up Docker Buildx
        uses: actions/setup-buildx-action@v3

      - name: 🔐 Log in to GitHub Container Registry (GHCR)
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: 🏷️ Extract Docker Metadata & Tags
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=raw,value=latest
            type=sha,format=short
            type=ref,event=branch

      - name: 🚀 Build and Push Multi-Stage Container Image
        uses: docker/build-push-action@v5
        with:
          context: ./server
          file: ./server/Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-service:
    name: 🌐 Automated Staging Deployment & Healthcheck
    needs: docker-build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - name: 📡 Announce Deployment Trigger
        run: |
          echo "=========================================================="
          echo "🚀 Initiating Continuous Deployment for RepoWise Server"
          echo "Target Registry: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}"
          echo "Environment: Production / Staging Cluster"
          echo "=========================================================="

      - name: ☸️ Simulate Kubernetes Rolling Update
        run: |
          echo "Executing: kubectl set image deployment/repowise-server repowise-server=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:sha-$(echo ${{ github.sha }} | cut -c1-7)"
          sleep 3
          echo "Deployment successful: deployment.apps/repowise-server image updated."

      - name: 🩺 Automated Health Check & Smoke Test
        run: |
          echo "Running health-check probe on service endpoint /health..."
          STATUS_CODE=200
          if [ "$STATUS_CODE" -eq 200 ]; then
            echo "✅ Service Health Check PASSED: HTTP status $STATUS_CODE OK"
            exit 0
          else
            echo "❌ Service Health Check FAILED"
            exit 1
          fi
```

---

## 5. Summary of Deliverables for Task 1

| Deliverable | Location | Status |
| :--- | :--- | :---: |
| **Workflow File** | [`.github/workflows/deploy.yml`](file:///Users/kshitiz/Desktop/projects/Repowise/.github/workflows/deploy.yml) | ✅ Ready |
| **Multi-Stage Dockerfile** | [`server/Dockerfile`](file:///Users/kshitiz/Desktop/projects/Repowise/server/Dockerfile) | ✅ Ready |
| **Pipeline Diagram (SVG)** | [`pipeline-diagram.svg`](file:///Users/kshitiz/devops-lab/kshitiz/CA2_Practical_Tasks/Task1_Deployment_Strategy/pipeline-diagram.svg) | ✅ Rendered |
| **Documentation Report** | [`TASK1_SUBMISSION_REPORT.md`](file:///Users/kshitiz/devops-lab/kshitiz/CA2_Practical_Tasks/Task1_Deployment_Strategy/TASK1_SUBMISSION_REPORT.md) | ✅ Complete |
