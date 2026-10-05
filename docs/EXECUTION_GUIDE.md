# Execution Guide – Screenshot Checklist

## 1. Prepare the application
Place the existing AI Food Delivery project files (`app.py`, `requirements.txt`, model files, and supporting Python modules) in the repository root.

Your requirements file should include at least:
```text
streamlit
pandas
numpy
scikit-learn
joblib
```
Add any packages actually imported by your existing project.

## 2. Task 1 – GitHub Actions
Push the repository to GitHub with `.github/workflows/ci-cd.yml` (copy `github-actions/ci-cd.yml` into `.github/workflows/ci-cd.yml`).

Screenshot:
- GitHub repository → Actions → successful workflow run.

## 3. Task 2 – Ansible
Run:
```bash
ansible-playbook -i ansible/inventory.ini ansible/setup.yml --ask-become-pass
```
Screenshot:
- Terminal showing PLAY RECAP with successful tasks.

## 4. Task 3 – Docker
Build:
```bash
docker build -f docker/Dockerfile -t food-delivery-app:v1 .
docker run --rm -p 8501:8501 food-delivery-app:v1
```
Open:
```text
http://localhost:8501
```
Screenshot:
- Running application in browser.
- Terminal showing Docker container.

## 5. Kubernetes
For Minikube:
```bash
minikube start
eval $(minikube docker-env)
docker build -f docker/Dockerfile -t food-delivery-app:v1 .
kubectl apply -f kubernetes/configmap.yaml
kubectl apply -f kubernetes/deployment.yaml
kubectl apply -f kubernetes/service.yaml
kubectl get pods
kubectl get svc
minikube service food-delivery-service
```

Rolling update:
```bash
docker build -f docker/Dockerfile -t food-delivery-app:v2 .
kubectl set image deployment/food-delivery-app food-delivery-app=food-delivery-app:v2
kubectl rollout status deployment/food-delivery-app
kubectl rollout history deployment/food-delivery-app
```

Rollback:
```bash
kubectl rollout undo deployment/food-delivery-app
kubectl rollout status deployment/food-delivery-app
```

Screenshots:
- `kubectl get pods`
- rolling update / rollout status
- `kubectl rollout history`
- rollback completed

## 6. Task 4 – Prometheus + Grafana
Deploy:
```bash
kubectl apply -f monitoring/prometheus-deployment.yaml
kubectl apply -f monitoring/grafana-deployment.yaml
kubectl get pods
kubectl get svc
```

Open:
```bash
minikube service prometheus
minikube service grafana
```

Grafana:
1. Log in with the default credentials shown by the Grafana image/setup.
2. Add Prometheus as a data source using the Prometheus service URL.
3. Create panels for:
   - uptime / availability
   - request latency (when application metrics are exposed)
   - error rate (when application metrics are exposed)
   - CPU/memory usage
4. Take a screenshot of the dashboard.

### Important limitation
A plain Streamlit application does not automatically expose Prometheus application metrics such as request latency and error rate. For a fully real metrics dashboard, add `prometheus_client` instrumentation to the application and expose `/metrics`. Do not claim those metrics are live unless you actually instrument and scrape them.

## 7. Task 5 – Report
Use the supplied `CA-II_Reflection_Report.pptx` and replace/add screenshots from your actual execution.
