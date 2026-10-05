# DevOps CA-II Submission – AI Food Delivery System

## Project
AI Powered Online Food Delivery System with Agentic Delivery Optimization

The service uses a Streamlit application for the food-delivery prediction/decision workflow. This CA-II package demonstrates CI/CD, configuration management, containerization, Kubernetes deployment, rolling update/rollback, and monitoring.

## Folder structure
- `github-actions/` – CI/CD workflow
- `ansible/` – inventory and playbook
- `docker/` – Dockerfile and .dockerignore
- `kubernetes/` – Deployment, Service, ConfigMap and Prometheus configuration
- `monitoring/` – Prometheus and Grafana setup
- `docs/` – pipeline/architecture diagrams, execution guide and reflection

## Important
Run the commands in `docs/EXECUTION_GUIDE.md` to produce the required screenshots. Do not submit invented screenshots; capture the actual output from your environment.


## Submission checklist
- Q1 + Q2 case-study answers: `docs/CASE_STUDY_ANSWERS.md`
- Task 1: `.github/workflows/ci-cd.yml` + `docs/PIPELINE_DIAGRAM.md`
- Task 2: `ansible/setup.yml` + `ansible/inventory.ini`
- Task 3: `docker/Dockerfile` + `kubernetes/*.yaml`
- Task 4: `monitoring/*.yaml` + execution guide for Prometheus/Grafana
- Task 5: `docs/CA-II_Reflection_Report.pptx` + `docs/REFLECTION.md`
- Execution instructions and screenshot checklist: `docs/EXECUTION_GUIDE.md`
- Bonus: requires your own external challenge submission/leaderboard/PR proof.
