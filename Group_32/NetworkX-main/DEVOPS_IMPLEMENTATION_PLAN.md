# NetworkX — simple DevOps proof plan

Updated: 5 October 2026
Status: Steps 1 and 2 completed and verified. Step 3 pipeline files are prepared
for the existing local Jenkins instance at port 8080; the job/Render credential
and a successful pipeline run are still pending. Step 4 is implemented and verified with the local Docker stack; deployed HTTPS verification is pending Render configuration and deployment. See monitoring/README.md.

## What we are trying to achieve

A working demonstration for the DevOps subject assessment. The project already exists; we will add just enough to show deployment, Jenkins CI/CD, and a monitoring dashboard.

Only `NetworkX-main` is in scope. No sibling project folders will be used.

## The setup

| Tool | Where it runs | Proof we will show |
|---|---|---|
| Render | Online | Public project URL and a successful prediction |
| Docker | Local build and Render deployment | The application runs in a container |
| Jenkins | Your laptop | A successful pipeline that checks the app and triggers deployment |
| Prometheus | Your laptop | It collects metrics from the deployed application |
| Grafana | Your laptop | A dashboard changes when we use the application |

Jenkins, Prometheus, and Grafana only need to run when preparing or demonstrating the assessment.

One terminology correction: Prometheus collects metrics such as error counts, not error log messages. We will show error counts in Grafana and use Render's console logs for error details. Loki is unnecessary for this scope. [Prometheus documentation](https://prometheus.io/docs/introduction/overview/).

## Step 1 — get the existing application running

**Complete:** the existing sample CSV returned HTTP 200 with predictions for all 12 rows. See `STEP1_RESULT.md` for the result and local demo instructions.

1. Run the FastAPI app and test a prediction with the existing CSV sample.
2. Fix only issues that prevent it from starting or predicting.
3. Check the saved models against the installed Python dependencies. The Dockerfile uses Python 3.10, while one saved training run records Python 3.14.3; we need a working combination, not a full dependency redesign.
4. Make sure both files in `final_model/` are included in deployment. They exist locally but are currently excluded by `.gitignore`.
5. Disable the hosted `/train` endpoint and avoid initializing training during API startup. The demo uses the existing saved model.

Proof: upload a CSV through `/docs` and receive the prediction table. This project takes numeric feature CSVs, so that is the demonstration input.

## Step 2 — deploy on Render

**Complete:** https://networkx-devops-group32.onrender.com/docs is live. Render built the Docker image and the hosted sample prediction passed for all 12 rows. Settings and evidence are saved in `step2-deployment/`.

1. Make the Dockerfile work with the verified environment and Render's port setting.
2. Add a small `.dockerignore` so logs, old training outputs, and secrets are not copied into the image.
3. Push only this project to the agreed GitHub repository.
4. Create a Render Docker web service and deploy it.
5. Open the public `/docs` URL and upload the sample CSV.

Start with the free option if the application fits. Render free services can sleep when idle, so open the app before the demonstration. Runtime files are temporary; the saved model must be packaged with the app. [Render free-service documentation](https://render.com/docs/free).

Proof: a screenshot of the public URL and successful prediction.

## Step 3 — add a small Jenkins pipeline

**Implementation prepared for the existing Jenkins instance:** see
`step3-jenkins/README.md` and `Jenkinsfile`. Configure the pipeline job and
Render hook credential, and run the pipeline to verify this step before
starting Step 4.

1. Run Jenkins locally using Docker with persistent storage.
2. Give its build environment the tools needed to build and test this project's container.
3. Connect Jenkins to the GitHub repository and add a `Jenkinsfile`.
4. Use these stages: **Checkout → Build → Prediction smoke test → Deploy → Verify**.
5. The smoke test starts the built container and checks that the app can make a prediction. If it fails, deployment stops.
6. Store Render's deploy hook in Jenkins Credentials. Use the hook to deploy the tested Git commit after the smoke test passes.
7. Turn off Render's independent automatic deployment so Jenkins controls this route. Stop the old AWS GitHub Actions deployment from running automatically too.
8. Use Jenkins SCM polling to detect pushes; **Build Now** is available for rehearsals. There is no need to expose local Jenkins for a webhook.
9. Check that the deployed app is ready and reports the expected commit through a small version endpoint.

Render rebuilds the source commit that Jenkins tested. We do not need an image registry for this demonstration. [Render deploy hooks](https://render.com/docs/deploy-hooks).

Proof: make one small change, push it, and show the green Jenkins stages followed by the updated deployed version.

## Step 4 — add a basic Prometheus/Grafana dashboard

**Local verification complete:** protected metrics, CSV validation, console logging, and the provisioned Docker dashboard passed seven tests and two real 9-request demonstrations. Prometheus target UP, Grafana datasource OK, 18 requests, 2 client errors, 0 server errors. **Hosted proof pending:** deploy this version and set METRICS_TOKEN on Render, then repeat the demo against the HTTPS target. See monitoring/README.md.

1. Add a health endpoint and a Prometheus metrics endpoint to FastAPI.
2. Track request count, response duration, and errors by HTTP status. Keep metrics access protected with a token stored in configuration.
3. Run Prometheus and Grafana locally through Docker Compose.
4. Configure Prometheus to scrape the deployed app over HTTPS.
5. Add Prometheus as a Grafana datasource.
6. Create one dashboard with availability, request count, response time, and error count panels.
7. Make several predictions and send an invalid CSV with a clear 4xx response. Show the dashboard updating; explain that invalid-input errors differ from server errors.
8. Write application errors to the console so their details are visible in Render logs.

Proof: Prometheus shows the target as UP, Grafana shows actual traffic, and application logs are accessible.

Scrapes count as traffic and can keep the free Render service awake. Run the monitoring stack for preparation and demonstration, then stop it when finished.

## What we will hand in / show

- Public project link and a successful CSV prediction.
- Jenkins pipeline screenshot and the corresponding deployed commit.
- Prometheus target screenshot.
- Grafana dashboard screenshot after actual requests.
- Application log screenshot.
- A short README describing how to start the local tools and repeat the demo.

What you can tell your sir once this works:

> We deployed our project using Docker and Render, used Jenkins to check and deploy changes automatically, and used Prometheus and Grafana to monitor requests, response time, and errors.

## Implementation order and approval

We will do this in four small parts: **working app → online deployment → Jenkins → dashboard**. The monitoring stack can be rehearsed locally while the Jenkins setup is finished. Hosted monitoring requires the updated application to be deployed.

We need GitHub/Render access and Docker available on your laptop. No paid services are assumed; account access will be handled when needed.

The hackathon link's event details were not readable during review. Registration and participation proof should be handled separately according to the event's rules.

Steps 1 and 2 are complete. Step 3 pipeline setup is prepared but still needs its successful run. Step 4 is locally verified; configure the Render metrics token and deploy this version to finish the hosted proof.
