# Pipeline Diagram

```text
Developer
   |
   v
GitHub Repository
   |
   v
GitHub Actions
   |
   +--> Checkout
   |
   +--> Python 3.12
   |
   +--> Install requirements
   |
   +--> Syntax check
   |
   +--> Docker build
   |
   v
Container Image
   |
   v
Kubernetes Deployment
   |
   +--> 3 replicas
   +--> RollingUpdate
   +--> Readiness/Liveness probes
   |
   v
Kubernetes Service
   |
   v
Streamlit Food Delivery App
   |
   +--> Prometheus
   |
   v
Grafana Dashboard
```
