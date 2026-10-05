#!/usr/bin/env bash
# Demonstrates a zero-downtime rolling update and two kinds of rollback on Kubernetes.
#
#   1. Deploy v1 (3 replicas)
#   2. Rolling update v1 -> v2 while a traffic pod keeps calling the service
#   3. Ship a broken release (model path wrong) -> readiness fails, rollout stalls,
#      old pods keep serving because maxUnavailable=0
#   4. `kubectl rollout undo` back to v2, then `--to-revision=1` back to v1
#
# Usage:  CLUSTER=kind ./scripts/k8s-rollout-demo.sh        (or CLUSTER=minikube, or CLUSTER=none)
# Output is also written to docs/evidence/k8s-rollout-demo.log
set -euo pipefail

CLUSTER="${CLUSTER:-kind}"
KIND_NAME="${KIND_NAME:-airline}"
NS=airline
DEPLOY=deployment/airline-api
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$ROOT/docs/evidence/k8s-rollout-demo.log"
mkdir -p "$(dirname "$LOG")"
exec > >(tee "$LOG") 2>&1

step() { printf '\n\033[1;36m==== %s ====\033[0m\n' "$*"; }
run()  { printf '\033[0;33m$ %s\033[0m\n' "$*"; "$@"; }

load_image() {
  case "$CLUSTER" in
    kind)     run kind load docker-image "$1" --name "$KIND_NAME" ;;
    minikube) run minikube image load "$1" ;;
    none)     echo "CLUSTER=none: assuming the cluster can already pull $1" ;;
  esac
}

step "Build v1 and v2 images (v2 reuses every cached layer except APP_VERSION)"
if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  run docker build -t airline-api:v1 --build-arg APP_VERSION=v1 "$ROOT"
  run docker build -t airline-api:v2 --build-arg APP_VERSION=v2 "$ROOT"
fi
load_image airline-api:v1
load_image airline-api:v2

step "1. Deploy v1"
run kubectl apply -k "$ROOT/k8s"
run kubectl -n $NS rollout status $DEPLOY --timeout=180s
run kubectl -n $NS get pods -o wide

step "Start a traffic pod that calls the service 4x per second and prints the version + HTTP status"
kubectl -n $NS delete pod traffic --ignore-not-found --wait=true >/dev/null
run kubectl -n $NS run traffic --image=curlimages/curl:8.10.1 --restart=Never --command -- sh -c \
  'while true; do
     out=$(curl -s -m 2 -w " %{http_code}" http://airline-api/version) || out="FAILED"
     echo "$(date +%T) $(echo "$out" | sed -E "s/.*\"app_version\":\"([^\"]+)\".*\"pod\":\"([^\"]+)\".* ([0-9]{3})$/\1 \2 \3/")"
     sleep 0.25
   done'
run kubectl -n $NS wait --for=condition=Ready pod/traffic --timeout=90s

step "2. Rolling update v1 -> v2"
run kubectl -n $NS set image $DEPLOY api=airline-api:v2
run kubectl -n $NS annotate $DEPLOY kubernetes.io/change-cause="rolling update to v2" --overwrite
run kubectl -n $NS rollout status $DEPLOY --timeout=180s
run kubectl -n $NS get rs -l app=airline-api
run kubectl -n $NS rollout history $DEPLOY

step "3. Broken release: wrong MODEL_PATH -> new pod never becomes Ready"
run kubectl -n $NS set env $DEPLOY MODEL_PATH=/app/models/does-not-exist.joblib
run kubectl -n $NS annotate $DEPLOY kubernetes.io/change-cause="broken release (bad MODEL_PATH)" --overwrite
if kubectl -n $NS rollout status $DEPLOY --timeout=45s; then
  echo "Unexpected: broken rollout succeeded"; exit 1
fi
echo ">> Rollout is stuck as expected. Old v2 pods are still serving (maxUnavailable=0):"
run kubectl -n $NS get pods -l app=airline-api
BAD_POD=$(kubectl -n $NS get pods -l app=airline-api --sort-by=.metadata.creationTimestamp -o name | tail -1)
run kubectl -n $NS logs "$BAD_POD" --tail=3

step "4a. Roll back the broken release (kubectl rollout undo)"
run kubectl -n $NS rollout undo $DEPLOY
run kubectl -n $NS rollout status $DEPLOY --timeout=180s
run kubectl -n $NS rollout history $DEPLOY

step "4b. Roll back to a specific revision (v1)"
run kubectl -n $NS rollout undo $DEPLOY --to-revision=1
run kubectl -n $NS rollout status $DEPLOY --timeout=180s
run kubectl -n $NS get pods -l app=airline-api -o custom-columns=POD:.metadata.name,IMAGE:.spec.containers[0].image,READY:.status.containerStatuses[0].ready
run kubectl -n $NS rollout history $DEPLOY

step "Traffic seen by the client during all of the above"
kubectl -n $NS logs traffic > "$ROOT/docs/evidence/k8s-traffic.log"
echo "Requests: $(wc -l < "$ROOT/docs/evidence/k8s-traffic.log")"
echo "Responses per version:"; awk '{print $2}' "$ROOT/docs/evidence/k8s-traffic.log" | sort | uniq -c
FAILED=$(grep -cvE ' 200$' "$ROOT/docs/evidence/k8s-traffic.log" || true)
echo "Non-200 responses: $FAILED"
kubectl -n $NS delete pod traffic --wait=false >/dev/null
[[ "$FAILED" == "0" ]] && echo "ZERO DOWNTIME: every request succeeded during update, failed release and rollbacks"
