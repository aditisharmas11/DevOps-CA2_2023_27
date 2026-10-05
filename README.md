\# Matrimonial Website DevOps Project



This project demonstrates a complete DevOps workflow for the Matrimonial Website application.



\## Tech Stack

\- Java Spring Boot

\- React frontend

\- MySQL

\- MongoDB

\- GitHub Actions

\- Docker

\- Kubernetes

\- Prometheus

\- Grafana



\## Deployment Pipeline

\- GitHub Actions builds and tests the app

\- Docker images are built and pushed

\- Kubernetes deploys the application with rolling updates

\- Prometheus and Grafana monitor the system



\## IaC

\- Ansible automates runtime setup

\- Kubernetes manifests manage deployment and scaling



\## Monitoring

\- Prometheus scrapes metrics from the backend

\- Grafana visualizes uptime, latency, and error rate



\## Run locally

```bash

docker-compose -f docker/docker-compose.yml up --build

