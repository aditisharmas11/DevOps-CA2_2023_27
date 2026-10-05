\# Pipeline Flow



\## Complete CI/CD Pipeline



1\. \*\*Code Push\*\*

&#x20;  - Developer pushes code to GitHub main branch

&#x20;  - GitHub Actions webhook triggered



2\. \*\*Build Stage\*\*

&#x20;  - Maven builds Spring Boot backend

&#x20;  - Frontend dependencies installed with npm

&#x20;  - Tests executed

&#x20;  - If tests fail, pipeline stops



3\. \*\*Docker Build\*\*

&#x20;  - Backend Dockerfile creates Java runtime image

&#x20;  - Frontend Dockerfile creates Nginx image

&#x20;  - Multi-stage builds optimize image size



4\. \*\*Push to Registry\*\*

&#x20;  - Images pushed to Docker Hub

&#x20;  - Tagged with latest and commit SHA



5\. \*\*Kubernetes Deployment\*\*

&#x20;  - kubectl applies namespace, configmap, secret

&#x20;  - Backend deployment with 2 replicas

&#x20;  - Frontend deployment with 2 replicas

&#x20;  - Services expose pods



6\. \*\*Rolling Update\*\*

&#x20;  - maxSurge: 1 (allows 1 extra pod)

&#x20;  - maxUnavailable: 1 (keeps minimum 1 pod running)

&#x20;  - Ensures zero downtime



7\. \*\*Monitoring\*\*

&#x20;  - Prometheus scrapes metrics every 15 seconds

&#x20;  - Grafana displays dashboards

&#x20;  - Health checks validate deployment



8\. \*\*Rollback (if needed)\*\*

&#x20;  - kubectl rollout undo restores previous version

&#x20;  - Application automatically reverted



\## Pipeline Diagram



\## Rollback Strategy



If deployment fails or issues occur:



```bash

kubectl rollout undo deployment/matrimonial-backend

kubectl rollout undo deployment/matrimonial-frontend



