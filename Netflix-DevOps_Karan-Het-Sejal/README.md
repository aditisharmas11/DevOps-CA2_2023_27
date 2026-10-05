# Netflix DevOps Case Study (CA-2)

**Submitted by**

| Name | PRN |
|---|---|
| Karan Desai | 24070122503 |
| Het Jasanii | 24070122504 |
| Sejal More | 24070122509 |

A Flask application taken through the DevOps lifecycle:

1. **CI/CD** - GitHub Actions (`.github/workflows/ci-cd.yml`): test job, then Docker build and push to GHCR on every push to `main`.
2. **Configuration management** - Ansible (WSL 2 control node).
3. **Containerization / orchestration** - Docker image with a `/health` endpoint; Kubernetes deployment with rolling update and rollback.
4. **Monitoring** - Prometheus and Grafana (uptime, latency, error rate).

Original repository: https://github.com/karandesai2005/Devops_case_Study-Netflix-
