# DevOps CA2 — MediTwin AI

> **B.Tech Project / PBL:** MediTwin — AI-Powered Personalized Health Intelligence Platform  
> **Assignment:** DevOps CA2  
> **Group:** Group 19  
> **Submission Repository:** https://github.com/aditisharmas11/DevOps-CA2_2023_27  
> **Submission Deadline:** 5 October 2026

---

## 1. Assignment Overview

This repository contains the DevOps CA2 implementation for **MediTwin**, our B.Tech Project / PBL.

The objective of the assignment is to take an existing B.Tech/PBL service and apply a complete DevOps workflow covering:

1. Deployment automation
2. Configuration management and Infrastructure as Code (IaC)
3. Containerization and orchestration
4. Monitoring and logging
5. Architecture and reflection documentation
6. Optional participation in an external DevOps challenge

### Task 2 Requirement

Students were required to work in groups of up to four members and identify a suitable DevOps challenge from platforms such as **Kaggle, Devpost, or Cloud hackathons**, related to the tools covered in the assignment.

The selected problem statement had to be entered in the provided class spreadsheet before **21 September 2026**. The first group to register a problem statement was assigned that statement, and other groups were not allowed to select the same one.

After completing the competition/assignment activities, the group repository had to be pushed to the prescribed GitHub repository by **5 October 2026**.

---

## 2. Team Details

| PRN | Student Name |
|---:|---|
| 23070122261 | Adarsh Jha |
| 23070122278 | Jyoti Kumari Sah |
| 23070122279 | Muskan Shah |
| 23070122280 | Prabin Yadav |

**Group:** Group 19

---

# 3. CA2 Deliverables

## Step 1 — Deployment Strategy

### Selected Tool: GitHub Actions

GitHub Actions is used to automate the application's CI/CD workflow.

The workflow file is maintained at:

```text
.github/
└── workflows/
    └── meditwin-ci-cd.yml
```

### Purpose

The CI/CD workflow is intended to automate repetitive deployment tasks such as:

- Triggering builds from source-control changes
- Installing project dependencies
- Validating the application
- Building Docker images
- Preparing images for deployment
- Supporting a repeatable deployment process

### Pipeline Flow

```text
Developer Push
      |
      v
GitHub Repository
      |
      v
GitHub Actions Workflow
      |
      +--------------------+
      |                    |
      v                    v
Frontend Build       Backend Build
      |                    |
      +----------+---------+
                 |
                 v
          Docker Image Build
                 |
                 v
         Docker Hub / Registry
                 |
                 v
          Deployment Environment
```

### Submission Artifact

```text
.github/workflows/meditwin-ci-cd.yml
```

---

# 4. Step 2 — Configuration Management & IaC

### Selected Tool: Ansible

Ansible is used to configure the runtime environment in a repeatable and automated way.

The Ansible configuration is maintained under:

```text
ansible/
├── inventory.ini
└── playbook.yml
```

### Objectives

The configuration-management stage focuses on:

- Preparing the runtime environment
- Installing required packages
- Managing runtime configuration
- Creating/managing required files and directories
- Reducing manual environment setup
- Making environment provisioning repeatable

### Execution

The playbook can be executed with:

```bash
ansible-playbook -i inventory.ini playbook.yml --ask-become-pass
```

For a local environment using privilege escalation:

```bash
ansible-playbook -i inventory.ini playbook.yml -K
```

### Configuration Management Flow

```text
Ansible Inventory
        |
        v
   Ansible Playbook
        |
        v
 Runtime Environment
        |
        +---- Required Packages
        +---- Directories
        +---- Configuration
        +---- Runtime Setup
```

### Submission Artifacts

```text
ansible/inventory.ini
ansible/playbook.yml
```

---

# 5. Step 3 — Containerization & Orchestration

## 5.1 Docker Containerization

MediTwin is containerized so that the application can be built and executed consistently across environments.

The application is separated into frontend and backend services.

### Frontend

```text
Image:
meditwin-frontend
```

### Backend

```text
Image:
meditwin-backend-service
```

The backend Docker image contains the Node.js/Express API together with the Python-based ML runtime required by the MediTwin inference modules.

### Containerized Application Flow

```text
                MediTwin
                   |
          +--------+--------+
          |                 |
          v                 v
   Frontend Container   Backend Container
          |                 |
          |                 +------> Module 1
          |                 +------> Module 2
          |                 +------> Module 3
          |                 |
          |                 +------> MongoDB
          |
          v
      User Browser
```

## 5.2 Kubernetes / Minikube

Kubernetes manifests are used to represent the application in an orchestration environment.

The deployment stage demonstrates the use of Kubernetes concepts such as:

- Deployments
- Services
- Pods
- Rolling updates
- Rollback
- Service exposure

Minikube is used as the local Kubernetes environment.

### Kubernetes Flow

```text
                Kubernetes / Minikube
                         |
                +--------+--------+
                |                 |
                v                 v
          Frontend Service   Backend Service
                |                 |
                v                 v
          Frontend Pods      Backend Pods
                                  |
                                  v
                               MongoDB
```

### Rolling Update / Rollback Concept

```text
Version 1
   |
   v
Deploy
   |
   v
Rolling Update
   |
   v
Version 2
   |
   +---- If healthy ----> Continue
   |
   +---- If failed -----> Rollback
```

The Kubernetes YAML files and deployment screenshots should be kept in the relevant submission directories.

---

# 6. Step 4 — Monitoring & Logging

### Monitoring Stack

The assignment requires a monitoring solution using:

- Prometheus
- Grafana

The monitoring objective is to make application behaviour observable through basic operational metrics.

### Metrics to Monitor

The dashboard should cover metrics such as:

| Metric | Purpose |
|---|---|
| Uptime / Availability | Checks whether the service is reachable |
| Latency | Measures request response time |
| Error Rate | Tracks failed requests |
| Service Health | Indicates application/runtime health |

### Monitoring Architecture

```text
                 MediTwin Application
                         |
                         v
                  Metrics Endpoint
                         |
                         v
                    Prometheus
                         |
                         v
                      Grafana
                         |
                         v
                 Monitoring Dashboard
```

### Evidence

Add the final Prometheus/Grafana configuration files and dashboard screenshots to this repository.

> **Submission note:** Replace/add the screenshot paths below with the actual files used by Group 19.

Example:

```text
docs/
└── screenshots/
    ├── prometheus-targets.png
    ├── grafana-dashboard.png
    └── application-metrics.png
```

---

# 7. Step 5 — Reflection & Report

The CA2 reflection/report covers:

### Architecture

MediTwin is organized as a multi-layer application with:

```text
React Frontend
      |
      v
Express.js Backend
      |
      +---- MongoDB
      |
      +---- Module 1 — Risk Prediction
      |
      +---- Module 2 — Differential Diagnosis
      |
      +---- Module 3 — Clinical Decision Support
```

### Pipeline Flow

```text
Code Commit
     |
     v
GitHub Actions
     |
     v
Build & Validate
     |
     v
Docker Image
     |
     v
Container Registry
     |
     v
Kubernetes / Deployment
     |
     v
Prometheus + Grafana
```

### Challenges

Major DevOps challenges addressed in this project include:

- Managing a multi-service application
- Running Node.js and Python ML dependencies together
- Containerizing an ML-enabled backend
- Preparing repeatable environment configuration
- Managing Kubernetes deployment locally
- Integrating CI/CD with Docker-based deployment
- Handling large ML dependencies and Docker build layers
- Keeping secrets and environment-specific configuration outside source control

### Lessons Learned

Through this assignment, the group gained practical exposure to:

- CI/CD pipeline design
- GitHub Actions workflow configuration
- Ansible-based configuration management
- Docker image creation and container execution
- Kubernetes deployments and services
- Rolling updates and rollback concepts
- Application observability
- DevOps automation and reproducibility
- Managing a real B.Tech project using DevOps practices

---

# 8. Bonus — External DevOps Challenge

The assignment provides an optional bonus for participating in an external DevOps challenge on platforms such as:

- Kaggle
- Devpost
- Cloud hackathons

### Proof of Participation

Add the relevant proof here, such as:

```text
docs/
└── challenge/
    ├── submission-proof.png
    ├── leaderboard.png
    └── challenge-details.md
```

> **Important:** Add actual proof/link only after participation is completed. Do not claim participation without supporting evidence.

---

# 9. Project Overview — MediTwin

## 9.1 What is MediTwin?

**MediTwin** is an AI-powered personalized health intelligence and clinical decision-support platform.

It brings together:

- Longitudinal health records
- Laboratory observations
- Patient symptoms
- AI-based risk prediction
- Differential diagnosis
- Drug and treatment safety information
- Doctor feedback
- Consolidated clinical reporting

The platform provides role-based workflows for:

- Patients
- Doctors
- Administrators

---

# 10. Healthcare Problem

The system is designed around three major healthcare challenges:

### 1. Fragmented Patient Trajectories

Health information such as laboratory results, vitals, symptoms, and previous records can exist in different places and may be difficult to interpret as a single longitudinal trajectory.

### 2. Delayed Intervention

Potential deterioration may not be identified early enough when historical health observations are considered in isolation.

### 3. Information Overload

Clinicians may need to cross-reference health history, differential diagnoses, and drug-related safety information while making time-sensitive decisions.

---

# 11. MediTwin Solution

MediTwin combines three specialized AI/decision-support engines into a unified clinical workflow.

## Module 1 — Future Acute-Event Risk Prediction

An XGBoost-based engine analyzes longitudinal laboratory and vital-sign trajectories and estimates the probability of an acute hospital encounter within a 90-day forward horizon.

Key characteristics:

- 29 health observations
- 348 engineered temporal features
- 90-day and 365-day windows
- XGBoost classifier
- SHAP-based interpretability
- Patient-grouped split to reduce temporal leakage

Reported evaluation metrics include:

- ROC-AUC: **0.8162**
- PR-AUC: **0.7582**
- Specificity: **91.2%** at threshold 0.50
- Precision: **78.4%** at threshold 0.50
- F1: **0.661** at the recommended threshold 0.45

## Module 2 — Symptom-to-Disease Differential Diagnosis

The second module converts patient symptom descriptions into a ranked differential across **49 pathologies**.

It uses:

- DDXPlus evidence concepts
- 223 evidence codes
- Symptom alias matching
- Fuzzy matching
- Typo tolerance
- Negation detection
- Pain location/intensity/onset extraction
- PyTorch MLP classification

## Module 3 — Clinical Decision Support

Module 3 combines outputs from the first two modules and generates prioritized recommendations.

It incorporates:

- Disease probability
- Relevance
- Severity
- Acute risk
- Safety penalties
- Uncertainty penalties
- RxNorm normalization
- OpenFDA safety information
- Offline drug-information cache

---

# 12. Core Features

MediTwin includes the following major application features:

- Role-based patient, doctor, and administrator access
- JWT authentication
- Google OAuth sign-in
- PDF laboratory-report ingestion
- Manual health-data entry
- 90-day acute-risk forecasting
- Symptom-based differential diagnosis
- Personalized treatment recommendations
- Drug safety and contraindication flags
- Doctor verification workflow
- Doctor feedback workflow
- Administrative dashboard
- Consolidated clinical reports
- Health timeline and dashboard KPIs
- Surveillance alerts

---

# 13. System Architecture

```text
                         +--------------------------------+
                         |     PATIENT / DOCTOR / ADMIN   |
                         | React + Vite + Tailwind CSS    |
                         +---------------+----------------+
                                         |
                              REST API / Authentication
                                         |
                                         v
                         +--------------------------------+
                         |        EXPRESS.JS BACKEND     |
                         |      Node.js + REST API        |
                         |                                |
                         | Auth | Health | Disease       |
                         | Treatment | Reports | Doctor  |
                         | Admin | Dashboard              |
                         +--------+-----------+-----------+
                                  |           |
                                  |           +----------+
                                  |                      |
                                  v                      v
                         +----------------+       +-------------+
                         |    MongoDB     |       | PDF Ingest  |
                         | Patient Data  |       |   PyMuPDF   |
                         +----------------+       +-------------+
                                  |
                                  v
              +------------------+------------------+
              |                  |                  |
              v                  v                  v
       +-------------+    +-------------+    +-------------+
       |  Module 1   |    |  Module 2   |    |  Module 3   |
       | XGBoost     |    | PyTorch/NLP |    | Rules/Drug  |
       | Risk Engine |    | Differential |    | Decision    |
       +-------------+    +-------------+    +-------------+
              |                  |                  |
              +------------------+------------------+
                                 |
                                 v
                     Personalized Clinical Output
```

The default application flow uses the Node.js backend to invoke the Python AI engines directly as child processes; separate FastAPI entry points exist as an optional alternative.

---

# 14. Technology Stack

## Frontend

- React 19.2
- Vite 8.2
- Tailwind CSS 4.3
- React Router DOM
- Recharts
- Lucide React
- Axios

## Backend

- Node.js 18+
- Express 4.21
- MongoDB
- Mongoose 8
- JWT
- bcryptjs
- Multer
- Axios
- dotenv

## Machine Learning

- Python 3.10–3.12
- XGBoost
- PyTorch
- scikit-learn
- pandas
- NumPy
- Matplotlib
- RapidFuzz
- spaCy
- joblib
- PyMuPDF

## DevOps

- GitHub
- GitHub Actions
- Docker
- Docker Hub
- Ansible
- Kubernetes
- Minikube
- Prometheus
- Grafana

---

# 15. Repository Structure

```text
Group_19/
│
├── .github/
│   └── workflows/
│       └── meditwin-ci-cd.yml
│
├── ansible/
│   ├── inventory.ini
│   └── playbook.yml
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── uploads/
│   ├── server.js
│   └── .env.example
│
├── frontend/
│   ├── src/
│   └── .env.example
│
├── Module_1/
│   ├── models/
│   ├── predict_risk.py
│   ├── extract_pdf_report.py
│   └── ...
│
├── Module_2/
│   ├── inference/
│   ├── mappings/
│   ├── module2_data_clean/
│   ├── runs/
│   ├── run_inference.py
│   └── ...
│
├── Module_3/
│   ├── cache/
│   ├── run_recommend.py
│   ├── module3_engine.py
│   └── ...
│
├── Kubernetes manifests/
│   ├── deployment YAMLs
│   ├── service YAMLs
│   └── related configuration
│
├── docs/
│   ├── screenshots/
│   └── challenge/
│
├── start.ps1
├── .gitignore
└── README.md
```

> Rename the Kubernetes directory above if the actual folder in Group 19 uses a different name.

---

# 16. Running MediTwin Locally

## Prerequisites

- Node.js 18+
- Python 3.10 / 3.11 / 3.12
- pip
- MongoDB or MongoDB Atlas
- Docker (for containerized execution)
- Kubernetes/Minikube (for orchestration)

## Python dependencies

```bash
pip install xgboost torch pandas numpy scikit-learn matplotlib rapidfuzz spacy joblib pymupdf
```

Optional spaCy model:

```bash
python -m spacy download en_core_web_sm
```

## Backend

```bash
cd backend
npm install
cp .env.example .env
```

Configure the required environment variables, including:

```text
MONGO_URI
JWT_SECRET
PORT
CLIENT_ORIGIN
PYTHON_EXEC
ADMIN_EMAIL
ADMIN_PASSWORD
ADMIN_NAME
GOOGLE_CLIENT_ID
```

## Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

For Google sign-in:

```text
VITE_GOOGLE_CLIENT_ID
```

## Start the application

### Windows PowerShell

From the project root:

```powershell
.\start.ps1
```

### Manual startup

Terminal 1:

```bash
cd backend
node server.js
```

Terminal 2:

```bash
cd frontend
npm run dev
```

Default development endpoints:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:5000
Backend health check:
http://localhost:5000/api/ping
```

---

# 17. Docker Deployment

The Dockerized architecture separates the frontend and backend services.

Typical services:

```text
Frontend → Port 8080
Backend  → Port 5000
MongoDB  → Port 27017
```

Example Docker images used in development:

```text
meditwin-frontend
meditwin-backend-service
```

Docker provides a consistent runtime environment and simplifies application packaging for CI/CD and Kubernetes deployment.

---

# 18. API Overview

## Authentication

```text
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/google
GET  /api/auth/me
```

## Health / Risk

```text
POST /api/health/upload-pdf
POST /api/health/confirm-extracted
POST /api/health/manual-entry
POST /api/health/upload
GET  /api/health/risk-latest
GET  /api/health/risk-history
GET  /api/health/records
```

## Disease

```text
POST /api/disease/predict
GET  /api/disease/latest
GET  /api/disease/history
```

## Treatment

```text
POST /api/treatment/generate
GET  /api/treatment/latest
GET  /api/treatment/history
```

## Reports / Dashboard

```text
GET /api/reports/full
GET /api/reports/history
GET /api/dashboard
```

## Doctor

```text
GET  /api/doctor/patient/:patientId
POST /api/doctor/feedback
GET  /api/doctor/recent-patients
```

## Admin

```text
GET  /api/admin/stats
GET  /api/admin/doctors
POST /api/admin/doctors/:id/verify
POST /api/admin/doctors/:id/reject
GET  /api/admin/patients
```

---

# 19. Data & Model Management

To keep the repository manageable, only artifacts required for inference are committed.

### Committed

- Application source code
- Module 1 inference model artifacts
- Module 2 trained checkpoint and required vocabulary/mapping files
- Module 3 local drug-information cache
- Sample inputs

### Ignored / Regenerable

Examples include:

- Training datasets
- Evaluation dumps
- Temporary outputs
- Tokenized training tensors
- Large intermediate artifacts
- `node_modules/`
- Python virtual environments
- `__pycache__/`
- `.env` files
- Uploaded documents / PII

This keeps the Git repository cleaner and avoids committing secrets or unnecessary generated data.

---

# 20. Security & Secret Management

Environment-specific secrets must not be committed to GitHub.

Examples include:

```text
.env
JWT_SECRET
ADMIN_PASSWORD
GOOGLE_CLIENT_ID / OAuth-related secrets
Database credentials
API credentials
```

Use `.env.example` files to document required variables without exposing real credentials.

---

# 21. DevOps Architecture Summary

The complete DevOps workflow implemented for the project can be summarized as:

```text
                        DEVELOPER
                            |
                            v
                     GitHub Repository
                            |
                            v
                    GitHub Actions
                            |
                 +----------+----------+
                 |                     |
                 v                     v
          Frontend Build       Backend/ML Build
                 |                     |
                 +----------+----------+
                            |
                            v
                       Docker Build
                            |
                            v
                       Docker Hub
                            |
                            v
                     Kubernetes/
                       Minikube
                            |
                            v
                    Running Services
                            |
                            v
                   Prometheus Metrics
                            |
                            v
                      Grafana
                            |
                            v
                 Monitoring Dashboard
```

---

# 22. Assignment Evidence Checklist

Before final submission, verify that this repository contains:

- [ ] Team details
- [ ] Selected DevOps challenge/problem statement
- [ ] GitHub Actions workflow
- [ ] Pipeline diagram
- [ ] Ansible inventory
- [ ] Ansible playbook
- [ ] Dockerfiles
- [ ] Kubernetes Deployment YAML
- [ ] Kubernetes Service YAML
- [ ] Rolling-update evidence
- [ ] Rollback evidence
- [ ] Prometheus configuration
- [ ] Grafana configuration/dashboard
- [ ] Monitoring screenshots
- [ ] Architecture diagram
- [ ] Pipeline flow documentation
- [ ] Challenges and lessons learned
- [ ] External challenge proof (bonus, if applicable)

---

# 23. Conclusion

MediTwin demonstrates how a real-world B.Tech AI application can be integrated with a practical DevOps lifecycle.

The project combines **GitHub Actions for CI/CD, Ansible for configuration management, Docker for containerization, Kubernetes/Minikube for orchestration, and Prometheus/Grafana for observability**.

From an application perspective, MediTwin combines longitudinal health-risk forecasting, symptom-based differential diagnosis, and clinical decision support into a single role-based platform.

The CA2 work therefore connects the development, AI, deployment, automation, orchestration, and monitoring aspects of the MediTwin project into one reproducible DevOps workflow.

---

# 24. Medical Disclaimer

> **IMPORTANT:** MediTwin is an academic and research-oriented clinical decision-support platform. Its risk calculations, differential diagnoses, and treatment recommendations are intended to assist healthcare professionals and educate patients. They are **not a medical diagnosis, prescription, or definitive clinical directive**. Any clinical decision must be verified by a qualified healthcare professional.

---

## Team — Group 19

**Adarsh Jha** — 23070122261  
**Jyoti Kumari Sah** — 23070122278  
**Muskan Shah** — 23070122279  
**Prabin Yadav** — 23070122280
