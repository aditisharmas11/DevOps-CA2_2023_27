\# Architecture



The matrimonial application includes:

\- React frontend for user interaction

\- Spring Boot backend for authentication, profile management, and matchmaking logic

\- MySQL for relational application data

\- MongoDB for profile-related and document-based data storage

\- JWT authentication and Spring Security

\- GitHub Actions for CI/CD automation

\- Docker for containerization

\- Kubernetes for orchestration and rolling deployment

\- Prometheus and Grafana for monitoring and dashboards



\## Architecture Flow



The deployment pipeline is designed to keep the application scalable and easy to update through automated source-to-container production deployment.



\## Components



\- \*\*Frontend\*\*: React SPA with Vite build system, Tailwind CSS, Axios for API calls

\- \*\*Backend\*\*: Spring Boot 3.3.4 with Spring Security, JWT, JPA/Hibernate

\- \*\*Database\*\*: MySQL for users, MongoDB for profiles and detailed user data

\- \*\*CI/CD\*\*: GitHub Actions for automated build, test, and deploy

\- \*\*Containerization\*\*: Docker for backend and frontend isolation

\- \*\*Orchestration\*\*: Kubernetes for scaling and rolling updates

\- \*\*Monitoring\*\*: Prometheus for metrics, Grafana for visualization

