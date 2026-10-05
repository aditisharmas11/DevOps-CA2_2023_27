### Network Security Project for Phishing Data

## Deployed DevOps assessment demo

**Live app:** <https://networkx-devops-group32.onrender.com/docs>

Step 2 completed on 5 October 2026: Render built the Docker container and the
public API successfully predicted all 12 rows of the sample CSV. Use **POST
/predict → Try it out → select `valid_data/test.csv` → Execute**.

See [deployment settings and saved evidence](step2-deployment/README.md).
Free hosting can take time to wake after inactivity. Jenkins pipeline files are prepared;
the monitoring stack is implemented and locally verified. Hosted monitoring awaits deployment.

## Step 4 monitoring

See [monitoring setup, local verification, and the hosted demonstration](monitoring/README.md).
Includes protected Prometheus metrics, Grafana provisioning, clear invalid-CSV 422 responses,
console error logs, and demo/verification scripts. The local Docker rehearsal passed;
configure METRICS_TOKEN and deploy on Render to finish the hosted proof.

## Run the prediction demo (DevOps assessment)

Step 1 verified on 5 October 2026 using Python 3.12.6 and scikit-learn 1.8.0.
The existing model successfully predicts all 12 rows in `valid_data/test.csv`.

For this prediction-only demo, use the pinned serving requirements:

```powershell
cd 'E:\Case Study Devops\NetworkX-main'
# Create/install only when setting up a new environment:
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-serving.txt
# Start the local API:
.\.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000
```

Open <http://127.0.0.1:8000/docs>, expand **POST /predict**, click **Try it out**,
choose `valid_data/test.csv`, then click **Execute**. Expect HTTP 200 and an HTML
table containing `predicted_column`. Stop the server with Ctrl+C.

Training is disabled by default, and its dependencies are not imported during
prediction startup. The original training requirements below remain separate;
the assessment demo needs no MongoDB, AWS, or MLflow setup.

See [the Step 1 result](STEP1_RESULT.md) for the checks performed.

## Jenkins CI/CD (Step 3)

The existing local Jenkins service at <http://localhost:8080>, SCM polling job
instructions, and pipeline stages are documented in
[`step3-jenkins/README.md`](step3-jenkins/README.md). Configure the Render deploy
hook in Jenkins as the `render-deploy-hook` Secret text credential; never commit
the hook URL. The pipeline builds and predicts the sample CSV before deploying,
then confirms the deployed commit through `/version`.

This repository contains an end-to-end machine learning pipeline for phishing detection:
- data ingestion
- data validation
- data transformation
- model training and evaluation
- a FastAPI service for training and prediction

Setup GitHub secrets (Repository → Settings → Secrets → Actions):
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` (e.g. `us-east-1`)
- `AWS_ECR_LOGIN_URI` (e.g. `788614365622.dkr.ecr.us-east-1.amazonaws.com/networkssecurity`)
- `ECR_REPOSITORY_NAME` (e.g. `networkssecurity`)

Docker setup on EC2 (optional)

1) Update the system:

```bash
sudo apt-get update -y
sudo apt-get upgrade -y
```

2) Install Docker — two common options:

- Quick (official convenience script) — less safe because it runs a remote script:

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

- Safer (official Docker APT repository) — recommended:

```bash
sudo apt-get remove docker docker-engine docker.io containerd runc -y
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
	"deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
	https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
	sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

3) Add the `ubuntu` user (or your user) to the `docker` group and refresh membership:

```bash
sudo usermod -aG docker ubuntu
newgrp docker
```

Notes and recommendations:
- Replace example values with your real AWS credentials and URLs stored as GitHub repository secrets.
- Avoid committing secrets, large dataset files, model artifacts, logs, and the `mlruns` directory — use `.gitignore`.
- The convenience script at `https://get.docker.com` is official but piping remote scripts to `sh` can be risky; prefer the APT repository method when possible.

If you want, I can add a recommended `.gitignore` and push these changes.

## Project Overview

This repository implements an end-to-end Machine Learning pipeline for phishing detection, designed with MLOps practices in mind. The goal is to make model development, evaluation, deployment, and monitoring reproducible and automatable.

- Data: raw dataset is `Network_Data/phisingData.csv` (ingestion reads from MongoDB when configured, otherwise falls back to this CSV).
- Pipeline stages: ingestion → validation → transformation → training → artifact storage.
- Serving: `app.py` exposes a FastAPI app with `GET /train` (run pipeline) and `POST /predict` (CSV upload → prediction).

## How MLOps is used here

This project includes multiple MLOps building blocks to support production workflows:

- Experiment tracking: MLflow is configured with a local SQLite backend (`mlflow.db`) and experiment name `networksecurity_experiment`. Metrics and models are logged during training.
- Artifact management: Trained models, preprocessing objects, transformed data and train/test splits are saved under `Artifacts/` and `final_model/` for reproducibility.
- Continuous integration / delivery (CI/CD): A GitHub Actions workflow (`.github/workflows/main.yml`) is present to run checks/builds (you can extend it to run tests, linting, and model checks).
- Model packaging & deployment: A `Dockerfile` is included to containerize the FastAPI app. The README contains Docker/ECR notes for pushing images to AWS ECR and running on EC2.
- Remote sync (optional): `networksecurity/cloud/s3_syncer.py` provides lightweight helpers to `aws s3 sync` artifacts to/from S3. This is used by the pipeline to sync artifacts when AWS credentials and CLI are available.
- Reproducibility: The pipeline writes timestamped artifact directories (`Artifacts/<timestamp>/...`) so every run preserves its inputs and outputs.
- Monitoring & drift detection: `DataValidation` computes drift reports (KS test) and writes YAML drift reports under the artifact folder. Use these to trigger retraining or alerts.
- Secrets & credentials: GitHub Actions should use repository secrets for `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_ECR_LOGIN_URI`, and `ECR_REPOSITORY_NAME` — they are never committed to the repo.

## Developer quickstart (local)

1) Create a Python virtual environment and install dependencies:

```bash
python -m venv .venv
source .venv/bin/activate   # on Windows PowerShell: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2) Start the app locally:

```bash
python app.py
# then visit http://127.0.0.1:8000/docs
```

3) Run the training pipeline from the API or directly:

```bash
# via API
curl -X GET http://127.0.0.1:8000/train

# or via Python
python -c "from networksecurity.pipeline.training_pipeline import TrainingPipeline; TrainingPipeline().run_pipeline()"
```

4) Use `POST /predict` with a CSV file to get predictions (the app loads `final_model/preprocessor.pkl` and `final_model/model.pkl`).

