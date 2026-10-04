#!/usr/bin/env bash
# Task 3 demo: deploy v1 -> rolling update to v2 -> broken v3 -> rollback.
# Works with Docker Desktop's built-in Kubernetes (recommended on Windows/ARM), minikube, or kind.
# Run from repo root:  bash scripts/k8s-rolling-update-demo.sh
set -euo pipefail
NS=connect-the-dots
pause() { echo; read -rp ">>> [SCREENSHOT] $1  -- press Enter to continue "; echo; }
k() { kubectl -n "$NS" "$@"; }

# Make locally built images visible to the cluster
load_img() {
  case "$(kubectl config current-context)" in
    minikube) minikube image load "$1" ;;
    kind-*)   kind load docker-image "$1" --name "$(kubectl config current-context | sed 's/^kind-//')" ;;
    *)        : ;;  # docker-desktop shares Docker's image store - nothing to do
  esac
}
echo "Using cluster context: $(kubectl config current-context)"

echo "== 1. Build images and make them available to the cluster =="
docker build -t ctd-backend:v1  backend/backend
docker build -t ctd-frontend:v1 -f frontend/Dockerfile .
docker tag ctd-backend:v1 ctd-backend:v2      # same code, new tag; APP_VERSION env shows the difference
load_img ctd-backend:v1
load_img ctd-backend:v2
load_img ctd-frontend:v1

echo "== 2. Deploy v1 =="
# Swap the registry images for the locally built tags so revision 1 is cleanly "v1"
for f in k8s/*.yaml; do echo "---"; cat "$f"; echo; done \
  | sed -e 's#ghcr.io/riya54671/ctd-backend:latest#ctd-backend:v1#' \
        -e 's#ghcr.io/riya54671/ctd-frontend:latest#ctd-frontend:v1#' \
  | kubectl apply -f -
k rollout status deployment/mongodb  --timeout=300s
k rollout status deployment/backend  --timeout=600s
k rollout status deployment/frontend --timeout=300s
k get deploy,rs,pods,svc -o wide
pause "All pods Running, 3 backend replicas (v1)"

echo "== 3. Start a watcher that calls the API every second (proves zero downtime) =="
k delete pod version-watcher --ignore-not-found
k run version-watcher --image=curlimages/curl --restart=Never -- \
  sh -c 'while true; do echo "$(date +%T) $(curl -s -o /dev/null -w "%{http_code}" backend:8080/actuator/health/readiness) $(curl -s backend:8080/actuator/info)"; sleep 1; done'
k wait --for=condition=Ready pod/version-watcher --timeout=60s
echo "Open a SECOND terminal and run:  kubectl -n $NS logs -f version-watcher"
pause "Second terminal showing 200 + version v1"

echo "== 4. Rolling update v1 -> v2 =="
k patch deployment backend -p '{
  "metadata":{"annotations":{"kubernetes.io/change-cause":"v2 - rolling update"}},
  "spec":{"template":{"spec":{"containers":[{"name":"backend","image":"ctd-backend:v2",
    "env":[{"name":"APP_VERSION","value":"v2"}]}]}}}}'
k get pods -l app=backend -w &  WATCH=$!
k rollout status deployment/backend --timeout=600s
kill $WATCH 2>/dev/null || true
k rollout history deployment/backend
pause "Pods replaced one by one; watcher shows v1 and v2 mixed, then only v2, never an error"

echo "== 5. Ship a BROKEN release (v3 image does not exist) =="
k patch deployment backend -p '{
  "metadata":{"annotations":{"kubernetes.io/change-cause":"v3 - broken image"}},
  "spec":{"template":{"spec":{"containers":[{"name":"backend","image":"ctd-backend:v3-broken",
    "env":[{"name":"APP_VERSION","value":"v3"}]}]}}}}'
k rollout status deployment/backend --timeout=60s || echo "!! Rollout stuck as expected"
k get pods -l app=backend
pause "1 pod in ErrImagePull/ImagePullBackOff, 3 old v2 pods still serving (maxUnavailable=0)"

echo "== 6. Roll back =="
k rollout undo deployment/backend
k rollout status deployment/backend --timeout=300s
k rollout history deployment/backend
k get pods -l app=backend
pause "Back to healthy v2; history shows the new revision"

echo "== 7. (Optional) roll back to a specific revision, e.g. the original v1 =="
echo "   kubectl -n $NS rollout undo deployment/backend --to-revision=<v1 revision number from history>"
echo
echo "Cleanup:  kubectl -n $NS delete pod version-watcher"
echo "Open the app:  http://localhost:30080  (Docker Desktop)  |  minikube service frontend -n $NS  (minikube)"
