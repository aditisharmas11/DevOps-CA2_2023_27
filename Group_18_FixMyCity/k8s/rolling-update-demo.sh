#!/usr/bin/env bash
# Run after the app is deployed. Take screenshots of each step's output.
set -e
NS=pbl
kubectl -n $NS get pods
echo "== Rolling update to v2 =="
docker build -t pbl-backend:v2 ../backend
kind load docker-image pbl-backend:v2 2>/dev/null || true   # skip if using minikube: minikube image load pbl-backend:v2
kubectl -n $NS set image deployment/backend backend=pbl-backend:v2
kubectl -n $NS rollout status deployment/backend
kubectl -n $NS rollout history deployment/backend
echo "== Rollback =="
kubectl -n $NS rollout undo deployment/backend
kubectl -n $NS rollout status deployment/backend
kubectl -n $NS get pods
