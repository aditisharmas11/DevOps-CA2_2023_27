# NetworkX

**Group 32**

NetworkX is a phishing detection application built with Python, FastAPI, pandas, and scikit-learn. It accepts a CSV of numeric network-security features, applies a saved preprocessing model, and returns a prediction table with a `predicted_column` for each record.

The project includes an existing machine-learning pipeline for data ingestion, validation, transformation, training, and MLflow experiment tracking. Our implementation work focused on running the saved model reliably, deploying the API, preparing CI/CD, and adding application monitoring.

**Hosted API:** [Open the prediction interface](https://networkx-devops-group32.onrender.com/docs).

## What we implemented

### Step 1: Working prediction service

- Verified the saved model and preprocessor with Python 3.12.6 and scikit-learn 1.8.0, and pinned the serving dependencies.
- Included both model files in the deployment and made model/output paths independent of the working directory.
- Kept training disabled by default so prediction startup does not need MongoDB, AWS, or MLflow.
- Tested the sample CSV: all 12 rows, containing 30 features each, returned predictions with HTTP 200.

The existing model was reused without retraining. [Verification details](NetworkX-main/STEP1_RESULT.md).

### Step 2: Docker and Render deployment

- Packaged the API and saved models in a Python 3.12 Docker image.
- Configured the server to use Render's assigned port and added a readiness check for model loading.
- Deployed the application from GitHub to Render and verified a successful 12-row prediction through the public API.
- Added a `/version` endpoint to identify the deployed Git commit.

The deployment files and saved results are in [step2-deployment](NetworkX-main/step2-deployment/). Free hosting may take a little time to wake after inactivity.

### Step 3: Jenkins CI/CD preparation

The prepared pipeline checks out the repository, builds the Docker image, runs a prediction smoke test, triggers Render deployment, and checks that `/version` reports the tested commit. It reads the Render deploy hook from a Jenkins credential named `render-deploy-hook`, keeping the hook URL out of source code.

The [Jenkins pipeline and setup instructions](https://github.com/AryanSheladia/DevOps_CA2_Group32/tree/DevOps_CA2/NetworkX-main/step3-jenkins) are currently on the `DevOps_CA2` branch. A successful end-to-end Jenkins run is still pending in the saved implementation notes.

### Step 4: Prometheus and Grafana monitoring

- Added a protected `/metrics` endpoint, HTTP request counters, and response-duration measurements.
- Created a Grafana dashboard for availability, total requests, traffic rate, average prediction time, client errors, and server errors.
- Added CSV validation with clear HTTP 422 responses and console logging for error details.
- Provided Docker Compose configuration, dashboard provisioning, and scripts to generate traffic and verify the stack.

The recorded local verification passed seven automated tests. Two demonstration batches produced 18 requests, including two invalid-CSV errors, with Prometheus reporting the target as UP and Grafana's datasource working. Monitoring the hosted Render service still requires its metrics token to be configured and the updated application to be deployed.

Prometheus collects metrics; detailed error messages are available in application logs. [Monitoring setup and demonstration](NetworkX-main/monitoring/README.md).

## Run the application locally

From the repository root, using Python 3.12:

```powershell
cd NetworkX-main
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-serving.txt
.\.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000
```

Open [localhost:8000/docs](http://127.0.0.1:8000/docs), expand **POST /predict**, select **Try it out**, upload `valid_data/test.csv`, and select **Execute**. The response contains the input records and their predictions. This API expects feature data in a CSV, rather than a website URL.

## API endpoints

| Endpoint | Purpose |
|---|---|
| `GET /docs` | Interactive API documentation and CSV upload interface |
| `POST /predict` | Validate the uploaded CSV and return predictions |
| `GET /health` | Check that the API responds |
| `GET /ready` | Check that the saved prediction model can load |
| `GET /version` | Return the deployed commit, or `local` during local development |
| `GET /metrics` | Prometheus metrics, protected by `METRICS_TOKEN` |

The original `/train` route is retained but returns HTTP 403 unless training is explicitly enabled.

## Repository contents

`NetworkX-main/` contains the application, training pipeline, saved models, sample data, Docker/Render configuration, deployment evidence, and monitoring tools. The `DevOps_CA2` branch also contains GitHub Actions, Ansible, and Kubernetes configuration for NetworkX.

The root `Step1/` through `Step5/` folders and `Lex_Orion_Task_5.pptx` contain the separate Lex Orion submission material and final group presentation.

## Group members

| Name | PRN |
|---|---|
| Sreehari Nair | 23070122144 |
| Parth Damle | 23070122161 |
| Pratik Lakra | 23070122166 |
| Aryan Sheladia | 23070122202 |
