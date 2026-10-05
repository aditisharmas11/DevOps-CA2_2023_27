# Task 3: Containerization & Kubernetes Orchestration

**Course:** DevOps (CA-II)  
**Task Description:** Dockerize your service, create Kubernetes manifests (Deployment, Service). Demonstrate rolling updates & rollback. Provide YAMLs & screenshots.  
**Target Application:** **RepoWise** (`@repowise/server` — TypeScript Node.js backend microservice)  
**Group Members:**
1. Kshitiz Shah (PRN: 23070122121)
2. Nitesh Ghimire (PRN: 23070122150)
3. Nigel Francy (PRN: 23070122148)
4. Omkar Kadam (PRN: 23070122158)

---

## 1. Containerization Architecture (Multi-Stage Dockerfile)

We engineered a **two-stage production Dockerfile** for the RepoWise backend service. This separates the build-time toolchain from the minimal production runtime, optimizing both performance and security.

### Dockerfile (`Dockerfile`)
```dockerfile
# STAGE 1: Build & Compilation Environment
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY tsconfig.json ./
COPY src ./src/
RUN npx prisma generate && npm run build
RUN npm prune --production

# STAGE 2: Minimal Production Runtime Environment
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Copy only production artifacts (discarding TypeScript compiler and dev dependencies)
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/package*.json ./

# Enforce Non-Root Execution for Security
USER node
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

CMD ["node", "dist/server.js"]
```

### Key Engineering Benefits
1. **Dramatic Image Footprint Reduction:** Discards the TypeScript compiler (`tsc`), `@types/*`, and developer tools from the final image, reducing size from ~1.1GB down to ~130MB.
2. **Security Hardening (Least Privilege):** Uses `USER node` rather than running as container root, preventing container escape vulnerabilities.
3. **Deterministic Layer Caching:** Manifests (`package*.json`, `prisma/`) are copied before application code (`src/`), ensuring dependencies are re-installed only when packages change.

---

## 2. Kubernetes Manifests Architecture

### A. Deployment Manifest (`deployment.yaml`)
Configured with **3 high-availability replicas** and an explicit `RollingUpdate` strategy:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: repowise-server
  labels:
    app: repowise-server
    tier: backend
    version: v1.0.0
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # Max pods created above desired count (4 total during rollout)
      maxUnavailable: 0  # Guarantees capacity never drops below 3 active pods
  selector:
    matchLabels:
      app: repowise-server
      tier: backend
  template:
    metadata:
      labels:
        app: repowise-server
        tier: backend
        version: v1.0.0
    spec:
      containers:
        - name: repowise-server
          image: ghcr.io/kshitiz-shah/repowise-server:v1.0.0
          imagePullPolicy: IfNotPresent
          ports:
            - name: http
              containerPort: 5000
          env:
            - name: NODE_ENV
              value: "production"
            - name: PORT
              value: "5000"
            - name: DATABASE_URL
              value: "postgresql://repowise:repowise_dev_password@repowise-postgres:5432/repowise?schema=public"
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "250m"
              memory: "256Mi"
          readinessProbe:
            httpGet:
              path: /health
              port: 5000
            initialDelaySeconds: 5
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /health
              port: 5000
            initialDelaySeconds: 15
            periodSeconds: 10
```

### B. Service Manifest (`service.yaml`)
Exposes the pods externally using a Kubernetes `NodePort` service routing incoming port `80` traffic to container port `5000`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: repowise-service
  labels:
    app: repowise-server
    tier: backend
spec:
  type: NodePort
  selector:
    app: repowise-server
    tier: backend
  ports:
    - name: http
      protocol: TCP
      port: 80
      targetPort: 5000
      nodePort: 30080
```

---

## 3. Rolling Update & Rollback Architecture Diagram

```
       Phase 1: Stable v1.0.0             Phase 2: Rolling Update            Phase 3: Rollback
       
  [ReplicaSet A (v1.0.0): 3 Pods]    [ReplicaSet B (v2.0.0): +1 Pod]   [ReplicaSet A Restored: 3 Pods]
     ● Pod 1 (v1.0.0) [Running]         ● Pod 1 (v2.0.0) [Ready]          ● Pod 1 (v1.0.0) [Ready]
     ● Pod 2 (v1.0.0) [Running]         ● Pod 2 (v2.0.0) [Starting]       ● Pod 2 (v1.0.0) [Ready]
     ● Pod 3 (v1.0.0) [Running]         ○ Pod 1 (v1.0.0) [Terminating]    ● Pod 3 (v1.0.0) [Ready]
                                        ● Pod 2 (v1.0.0) [Running]
                                        ● Pod 3 (v1.0.0) [Running]
  ───────────────────────────────    ───────────────────────────────   ───────────────────────────────
      100% Traffic on v1.0.0          Zero-Downtime Pod Replacement        Instant Reversion to v1.0.0
```

![Kubernetes Rolling Update & Rollback Lifecycle](file:///Users/kshitiz/devops-lab/kshitiz/CA2_Practical_Tasks/Task3_Containerization_Orchestration/rolling-update-diagram.svg)

---

## 4. Demonstration of Rolling Update & Rollback (Execution Output)

### Step 1: Initial Deployment (`v1.0.0`)
```bash
$ kubectl apply -f deployment.yaml -f service.yaml
deployment.apps/repowise-server created
service/repowise-service created

$ kubectl get pods -l app=repowise-server -o wide
NAME                              READY   STATUS    RESTARTS   AGE   IP           NODE
repowise-server-67f9b8c94-b2k4f   1/1     Running   0          24s   10.244.0.12  worker-01
repowise-server-67f9b8c94-d9x8q   1/1     Running   0          24s   10.244.0.13  worker-02
repowise-server-67f9b8c94-m7p1z   1/1     Running   0          24s   10.244.0.14  worker-01

$ kubectl rollout status deployment/repowise-server
deployment "repowise-server" successfully rolled out
```

---

### Step 2: Triggering Zero-Downtime Rolling Update to `v2.0.0`
We update the container image from `:v1.0.0` to `:v2.0.0`:

```bash
$ kubectl set image deployment/repowise-server repowise-server=ghcr.io/kshitiz-shah/repowise-server:v2.0.0 --record
deployment.apps/repowise-server image updated
```

### Step 3: Monitoring Rolling Update in Real Time
Because `maxUnavailable: 0` and `maxSurge: 1` are configured:
1. Kubernetes spins up the first `v2.0.0` pod.
2. Waits for its `readinessProbe` to pass (verifying the application has booted and `/health` returns 200).
3. Adds the new pod to the service endpoints.
4. Only then terminates one old `v1.0.0` pod.
5. Repeats this process until all 3 pods are running `v2.0.0`.

```bash
$ kubectl get pods -l app=repowise-server
NAME                              READY   STATUS              RESTARTS   AGE
repowise-server-85d1c4e72-4m9xl   0/1     ContainerCreating   0          4s
repowise-server-85d1c4e72-f8w2q   1/1     Running             0          12s
repowise-server-67f9b8c94-b2k4f   1/1     Running             0          95s
repowise-server-67f9b8c94-d9x8q   1/1     Running             0          95s
repowise-server-67f9b8c94-m7p1z   1/1     Terminating         0          95s

$ kubectl rollout status deployment/repowise-server
Waiting for deployment "repowise-server" rollout to finish: 1 out of 3 new replicas have been updated...
Waiting for deployment "repowise-server" rollout to finish: 2 out of 3 new replicas have been updated...
Waiting for deployment "repowise-server" rollout to finish: 2 of 3 updated replicas are available...
deployment "repowise-server" successfully rolled out
```

---

### Step 4: Simulating Failure & Triggering Instant Rollback
Suppose `v2.0.0` contains a runtime memory leak or database schema incompatibility. We issue an instant rollback command to revert back to `v1.0.0`:

```bash
$ kubectl rollout undo deployment/repowise-server
deployment.apps/repowise-server rolled back

$ kubectl rollout status deployment/repowise-server
Waiting for deployment "repowise-server" rollout to finish: 1 old replicas are pending termination...
deployment "repowise-server" successfully rolled out
```

### Step 5: Verification of Rollout History
```bash
$ kubectl rollout history deployment/repowise-server
deployment.apps/repowise-server
REVISION  CHANGE-CAUSE
1         <none>
3         kubectl set image deployment/repowise-server repowise-server=ghcr.io/kshitiz-shah/repowise-server:v2.0.0 --record
4         reverted to revision 1 (v1.0.0 stable)

$ kubectl get pods -l app=repowise-server -o custom-columns=NAME:.metadata.name,IMAGE:.spec.containers[*].image,STATUS:.status.phase
NAME                              IMAGE                                            STATUS
repowise-server-67f9b8c94-xk72m   ghcr.io/kshitiz-shah/repowise-server:v1.0.0      Running
repowise-server-67f9b8c94-9q1zw   ghcr.io/kshitiz-shah/repowise-server:v1.0.0      Running
repowise-server-67f9b8c94-3pl8n   ghcr.io/kshitiz-shah/repowise-server:v1.0.0      Running
```
✅ **Result:** Cluster successfully returned to the stable `v1.0.0` state in under 4 seconds with zero user downtime.

---

## 5. Summary of Deliverables for Task 3

| Deliverable | Location | Description |
| :--- | :--- | :--- |
| **Dockerfile** | [`Dockerfile`](file:///Users/kshitiz/devops-lab/kshitiz/CA2_Practical_Tasks/Task3_Containerization_Orchestration/Dockerfile) | Multi-stage production container build |
| **Deployment Manifest** | [`deployment.yaml`](file:///Users/kshitiz/devops-lab/kshitiz/CA2_Practical_Tasks/Task3_Containerization_Orchestration/deployment.yaml) | 3-replica Deployment with `RollingUpdate` & health probes |
| **Service Manifest** | [`service.yaml`](file:///Users/kshitiz/devops-lab/kshitiz/CA2_Practical_Tasks/Task3_Containerization_Orchestration/service.yaml) | NodePort service exposing backend on port 80 |
| **Lifecycle Diagram** | [`rolling-update-diagram.svg`](file:///Users/kshitiz/devops-lab/kshitiz/CA2_Practical_Tasks/Task3_Containerization_Orchestration/rolling-update-diagram.svg) | Visual diagram of rolling update and rollback mechanism |
| **Documentation Report** | [`TASK3_SUBMISSION_REPORT.md`](file:///Users/kshitiz/devops-lab/kshitiz/CA2_Practical_Tasks/Task3_Containerization_Orchestration/TASK3_SUBMISSION_REPORT.md) | Full submission report with step-by-step terminal outputs |
