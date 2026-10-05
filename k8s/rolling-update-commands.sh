# =============================================================================
# Rolling Update & Rollback Commands
# Student Management System - Kubernetes
# =============================================================================
# This document provides step-by-step commands to demonstrate rolling updates
# and rollbacks in Kubernetes.
# =============================================================================

# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: Initial Deployment
# ─────────────────────────────────────────────────────────────────────────────
# Apply all manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

# Verify the initial deployment
kubectl get pods -n student-app -l app=student-api
kubectl get deployment student-api -n student-app

# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: Perform a Rolling Update (v1.0.0 → v2.0.0)
# ─────────────────────────────────────────────────────────────────────────────
# Update the image to v2.0.0 (simulates a new release)
kubectl set image deployment/student-api \
  student-api=ghcr.io/student-management/student-api:2.0.0 \
  -n student-app \
  --record

# Watch the rolling update in real-time
kubectl rollout status deployment/student-api -n student-app

# Verify pods are running the new version
kubectl get pods -n student-app -o wide

# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: Check Rollout History
# ─────────────────────────────────────────────────────────────────────────────
kubectl rollout history deployment/student-api -n student-app

# Example output:
# REVISION  CHANGE-CAUSE
# 1         Initial deployment v1.0.0
# 2         kubectl set image deployment/student-api student-api=...:2.0.0

# ─────────────────────────────────────────────────────────────────────────────
# STEP 4: Rollback to Previous Version (v2.0.0 → v1.0.0)
# ─────────────────────────────────────────────────────────────────────────────
# Rollback to the previous revision
kubectl rollout undo deployment/student-api -n student-app

# Or rollback to a specific revision
kubectl rollout undo deployment/student-api -n student-app --to-revision=1

# Watch the rollback progress
kubectl rollout status deployment/student-api -n student-app

# Verify pods are back to v1.0.0
kubectl describe deployment student-api -n student-app | grep Image

# ─────────────────────────────────────────────────────────────────────────────
# STEP 5: Verify Everything
# ─────────────────────────────────────────────────────────────────────────────
kubectl get all -n student-app
kubectl rollout history deployment/student-api -n student-app
