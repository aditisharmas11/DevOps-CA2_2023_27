# Task 5 – Reflection & Report Content

## Slide 1 – Architecture
**AI Food Delivery System – DevOps Architecture**
- Streamlit application provides the user-facing service.
- GitHub stores source code and workflow.
- GitHub Actions performs CI checks and Docker image builds.
- Docker packages the application consistently.
- Kubernetes runs multiple replicas and manages rolling updates.
- Prometheus collects monitoring data.
- Grafana visualizes operational metrics.

## Slide 2 – Pipeline Flow
Developer → GitHub → GitHub Actions → Build/Test → Docker Image → Kubernetes → Service → Monitoring

Key benefits:
- Repeatable builds
- Automated validation
- Consistent runtime environment
- Controlled deployment
- Rollback support

## Slide 3 – Challenges
- Dependency/version compatibility
- Containerizing a Streamlit application
- Kubernetes image availability
- Service exposure and networking
- Designing meaningful monitoring metrics
- Understanding the difference between infrastructure metrics and application-level metrics

## Slide 4 – Lessons Learned
- Automation reduces manual deployment effort.
- Containers improve environment consistency.
- Kubernetes provides self-healing, scaling and rollout mechanisms.
- Rolling updates reduce deployment downtime.
- Rollback provides a recovery path after a failed release.
- Monitoring is essential for observing application health.

## Slide 5 – Conclusion
The project demonstrates a complete DevOps workflow from source code to deployment and monitoring. CI/CD, configuration management, containers, Kubernetes and observability work together to make software delivery more repeatable, scalable and recoverable.
