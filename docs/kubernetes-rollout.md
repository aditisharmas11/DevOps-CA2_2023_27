# Kubernetes Rolling Update and Rollback

These commands operate on the CA2 Deployment in the current `kubectl` context.
They are documented for manual use; no image update or rollback has been run as
part of preparing this guide.

## Current status and safety boundary

Read-only checks on 2026-10-03 observed the CA2 Deployment at 2/2 available,
both pods Running with zero restarts, and the live image
`docker.io/library/devops-ca2:latest`. Rollout status succeeded and history
listed revisions 1 through 4. The separate `ca3-devops` Deployment was also
observed at 2/2; it has not been changed.

The local app source now displays version `2.0.0`, and the local
`kubernetes/deployment.yaml` points to
`docker.io/library/devops-ca2:v2.0.0`. This manifest change has **not** been
applied to the cluster. `node --check app/server.js` passed.

The local image build was attempted but failed before creating the v2.0.0
image: Docker could not resolve `auth.docker.io` while fetching the
`node:20-alpine` base image (`lookup auth.docker.io: no such host`). The v2
image has not been loaded into Minikube. Minikube profile checks also fail to
read `D:\MinikubeData\.minikube\machines\minikube\id_rsa` (`Access is denied`),
although the existing `kubectl` context remains connected and reports the node
Ready. No rollout, rollback, image load, or manifest apply has been performed.

**Approval gate:** Do not run `kubectl set image`, apply the Deployment, or run
`kubectl rollout undo` until the project owner explicitly approves the rollout
and rollback. Capture real outputs/screenshots at each stage; none are included
here.

## Check the current deployment

```powershell
kubectl get deployment devops-ca2 -o wide
kubectl get pods -l app=devops-ca2 -o wide
kubectl rollout status deployment/devops-ca2 --timeout=120s
kubectl rollout history deployment/devops-ca2
```

The Deployment manifest leaves `spec.strategy` unspecified. Kubernetes applies
its default `RollingUpdate` strategy. The current live Deployment reports
`maxSurge: 25%` and `maxUnavailable: 25%`; with two replicas this permits a
surge pod while preserving availability as readiness checks pass.

## Build and apply a new image version

Use a new, unique tag for each version. Build from the CA2 project root, then
load that exact tag into Minikube because the Deployment uses
`imagePullPolicy: Never`:

```powershell
docker build -f docker/Dockerfile -t devops-ca2:v2.0.0 .
minikube image load devops-ca2:v2.0.0 --profile minikube
minikube image ls | Select-String 'devops-ca2:v2.0.0'
```

For this demonstration, the prepared tag is `v2.0.0` and the app displays that
version on its homepage. The build command above was attempted but failed
because Docker could not resolve `auth.docker.io`; the versioned image was not
produced. Minikube image loading also remains blocked until the profile SSH key
under `D:\MinikubeData` is accessible to the account running Minikube. Resolve
both prerequisites before continuing; do not work around the key error by
changing cluster configuration or weakening key permissions.

Only after the image has been built and confirmed in Minikube, and rollout
approval has been given, update the CA2 Deployment:

```powershell
kubectl set image deployment/devops-ca2 devops-ca2=docker.io/library/devops-ca2:v2.0.0
kubectl rollout status deployment/devops-ca2 --timeout=120s
kubectl get deployment devops-ca2 -o wide
kubectl get pods -l app=devops-ca2 -o wide
kubectl rollout history deployment/devops-ca2
```

`kubectl set image` updates the live Deployment and creates a rollout revision;
it does not update `kubernetes/deployment.yaml`. The local manifest has already
been prepared with the v2.0.0 image but remains unapplied. Do not use
`kubectl apply -f kubernetes/` for this demonstration; that could update more
resources than the CA2 Deployment.

Verify the new homepage version through the CA2 port-forward:

```powershell
(Invoke-WebRequest -UseBasicParsing http://localhost:4000/).Content | Select-String 'Application version: 2.0.0'
Invoke-RestMethod http://localhost:4000/health
```

## Roll back

Review the revisions and, if needed, inspect a specific revision before
choosing a rollback target:

```powershell
kubectl rollout history deployment/devops-ca2
kubectl rollout history deployment/devops-ca2 --revision=4
```

Roll back to the immediately previous revision:

```powershell
kubectl rollout undo deployment/devops-ca2
kubectl rollout status deployment/devops-ca2 --timeout=120s
```

Or select a specific known-good revision:

```powershell
kubectl rollout undo deployment/devops-ca2 --to-revision=3
kubectl rollout status deployment/devops-ca2 --timeout=120s
```

Revision numbers change after each rollout. Choose the target based on the
current output of `kubectl rollout history`, not just the example numbers above.

## Verify after rollback

Confirm the Deployment and pods are available, and check which image is
currently assigned:

```powershell
kubectl get deployment devops-ca2 -o wide
kubectl get pods -l app=devops-ca2 -o wide
kubectl rollout history deployment/devops-ca2
```

If the CA2 port-forward is not already running, start it in a separate
PowerShell terminal and leave it running:

```powershell
kubectl port-forward service/devops-ca2 4000:4000
```

In another terminal, check the health endpoint and metrics:

```powershell
Invoke-RestMethod http://localhost:4000/health
curl.exe --fail http://localhost:4000/metrics
```

For submission evidence, capture the actual output of the status/history
commands before and after an approved rollout and rollback, plus the health
response after rollback. No rollout screenshots or results are included here;
those must be captured when you perform the commands.

The pre-demonstration homepage did not contain the `Application version: 2.0.0`
marker. After rollback, verify that marker is absent and that `/health` remains
healthy. Inspect the Deployment image and ready pods to confirm it returned to
the previous known-good revision.

## Actual results and pending work

- **Verified baseline:** CA2 was 2/2 available; both pods were Running with zero
  restarts; the live image was `docker.io/library/devops-ca2:latest`; rollout
  status succeeded; revisions 1 through 4 were listed.
- **Prepared locally:** homepage version marker `2.0.0`; CA2 Deployment manifest
  image tag `docker.io/library/devops-ca2:v2.0.0`.
- **Verified locally:** `node --check app/server.js` passed, and a temporary
  local server returned the homepage containing `Application version: 2.0.0`.
- **Build pending:** `docker build -f docker/Dockerfile -t devops-ca2:v2.0.0 .`
  failed because `auth.docker.io` DNS lookup failed; no v2 image was produced.
- **Image load pending:** Minikube profile access failed with `Access is denied`
  for its SSH key under `D:\MinikubeData`; no image was loaded.
- **Rollout and rollback pending approval and execution:** no cluster mutation
  or screenshots have been performed.
- **CA3 protection:** `ca3-devops` was inspected only and was not targeted by
  any mutation.