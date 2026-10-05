# Step 4 — Prometheus and Grafana

Status: implemented and verified with the complete local Docker stack on 5 October 2026. Hosted verification is pending deployment of these changes and configuration of `METRICS_TOKEN` on Render. Local screenshots are rehearsal evidence, not evidence of the deployed HTTPS target.

## What is included

- Existing `/health` and `/ready` endpoints remain available.
- `/metrics` uses a bearer token configured through `METRICS_TOKEN`. An unset token returns 503; missing/incorrect credentials return 401.
- Request counters and duration histograms use HTTP method, route template, and status labels. Scrapes, health checks and readiness checks are excluded from application traffic.
- Invalid CSVs return 422 with a clear reason. The saved model still predicts all 12 sample rows.
- Errors and exception details go to stdout, visible through Docker logs or Render's Logs tab.
- Prometheus scrapes the deployed app over verified HTTPS every 15 seconds. Grafana automatically provisions the datasource and six dashboard panels.
- Docker images are pinned. Prometheus/Grafana data survives container restarts in named volumes. The two web interfaces bind to localhost.

## Verified local result

Seven automated tests passed, covering bearer authentication, health/scrape exclusion, successful predictions, malformed and nonnumeric input, reordered columns, server exceptions and bounded route labels.

The Docker rehearsal showed:

| Check | Result |
|---|---|
| Prometheus target | UP: `http://app:8000/metrics` |
| Grafana datasource | OK |
| Valid prediction uploads | 16 × HTTP 200 across two demo batches, 12 rows per upload |
| Invalid CSV | 2 × HTTP 422 |
| Application request counter | 18 |
| Client error counter | 2 |
| Server error counter | 0 |
| Average prediction duration | Recorded from real requests; varies by batch |

Machine-readable results, metrics, console logs and screenshots are in `monitoring/evidence/`. These generated files and `monitoring/secrets/` are ignored by Git. Server-failure counting was verified through an injected failure in the automated tests; no artificial server failure is needed during the assessment.

## Initial setup

Run from the `NetworkX-main` directory in PowerShell with Docker Desktop's Linux engine running:

```powershell
.\monitoring\setup.ps1
```

This creates random token/password files and preserves them on subsequent runs. The script does not print their contents.

## Deploy to the existing Render service

1. Apply `step4-changes.patch` from the root of a current clone of `AryanSheladia/DevOps_CA2_Group32`. The patch paths start with `NetworkX-main/`. It changes only this project and preserves the existing Jenkins files:

   ```powershell
   git apply --check 'C:\path\to\step4-changes.patch'
   git apply 'C:\path\to\step4-changes.patch'
   git add NetworkX-main
   git commit -m "Add Prometheus metrics and Grafana monitoring"
   git push
   ```

   This requires repository write access. The checked-in source does not include your locally generated secrets.

2. In the [existing Render service](https://dashboard.render.com/web/srv-db1slg3ncjis73c6o7k0), open **Environment**, add `METRICS_TOKEN`, and set it to the contents of your local `monitoring/secrets/metrics_token.txt`. Obtain it locally:

   ```powershell
   Get-Content -Raw monitoring/secrets/metrics_token.txt
   ```

   The `render.yaml` entry documents this required secret; updating YAML alone does not set it for the existing service.

3. Deploy the updated commit using Jenkins if step 3 is ready, or **Manual Deploy → Deploy latest commit** on Render. Automatic deployment stays off.
4. Wait for the service to become live. Unauthenticated `/metrics` should return **401**. A **404** means the monitoring version has not been deployed; **503** means the token has not been configured.

## Run monitoring against Render

If the local rehearsal is running, stop it first while retaining its data:

```powershell
$env:METRICS_TOKEN = Get-Content -Raw monitoring/secrets/metrics_token.txt
docker compose -f monitoring/compose.yaml -f monitoring/compose.local.yaml down
Remove-Item Env:METRICS_TOKEN
```

Start the normal stack:

```powershell
docker compose -f monitoring/compose.yaml up -d
```

- [Prometheus targets](http://localhost:9090/targets): `networkx` must be **UP**, with the scrape URL `https://networkx-devops-group32.onrender.com/metrics`.
- [Grafana dashboard](http://localhost:3000/d/networkx-devops): sign in as `admin` using the contents of `monitoring/secrets/grafana_password.txt`.
- Dashboard availability means authenticated metrics scraping succeeds. `/ready` separately checks whether the prediction model can load.
- Counters show totals since the app restarted. The traffic graph shows a rate over one minute; the duration panel shows an average over five minutes. They need at least two scrapes and real predictions. Zero-traffic duration is shown as no data.
- Client errors are 4xx (including invalid CSV 422). Server errors are 5xx. Prometheus collects counts; detailed error messages are in Render's console logs.

A sleeping Render instance can initially cause timeouts. Open the public `/docs` page and allow it to wake before expecting an UP target.

## Repeat the assessment demonstration

Create a Python environment if one does not already exist:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-serving.txt
```

Allow at least 30 seconds for initial scrapes, then generate traffic and save hosted verification:

```powershell
$env:METRICS_TOKEN = Get-Content -Raw monitoring/secrets/metrics_token.txt
.\.venv\Scripts\python.exe monitoring/demo_traffic.py --output monitoring/evidence/hosted-traffic.json
.\.venv\Scripts\python.exe monitoring/verify_stack.py --require-traffic --output monitoring/evidence/hosted-stack-verification.json
Remove-Item Env:METRICS_TOKEN
```

Save screenshots of the HTTPS target showing UP, the Grafana panels after traffic, and Render logs showing the 422 input rejection. Never include tokens or passwords in screenshots.

Stop monitoring after preparing or demonstrating, so scrapes do not keep the free Render service awake:

```powershell
docker compose -f monitoring/compose.yaml down
```

The volumes are retained. If you change the Grafana password file after its first start, reset the existing administrator password in Grafana; changing the initial-password secret alone does not update an existing database.

## Optional complete local rehearsal

This runs the app, Prometheus and Grafana together without changing the hosted service:

```powershell
$env:METRICS_TOKEN = Get-Content -Raw monitoring/secrets/metrics_token.txt
docker compose -f monitoring/compose.yaml -f monitoring/compose.local.yaml up -d --build
.\.venv\Scripts\python.exe monitoring/verify_stack.py
# Allow at least two scrapes before generating traffic.
.\.venv\Scripts\python.exe monitoring/demo_traffic.py --base-url http://127.0.0.1:8000 --output monitoring/evidence/local-traffic.json
.\.venv\Scripts\python.exe monitoring/verify_stack.py --require-traffic --output monitoring/evidence/local-stack-verification.json
Remove-Item Env:METRICS_TOKEN
```

The local app is at [localhost:8000/docs](http://localhost:8000/docs). Stop this stack with the same two Compose files; set `METRICS_TOKEN` as above before running Compose.

## Automated checks

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-test.txt
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
docker compose -f monitoring/compose.yaml config --quiet
docker compose -f monitoring/compose.yaml exec -T prometheus promtool check config /etc/prometheus/prometheus.yml
```

Keep the app on one Uvicorn worker, as the existing Dockerfile does. The metrics registry is process-local and resets on a deployment/restart.

References: [Prometheus HTTP authorization configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/), [Grafana provisioning](https://grafana.com/docs/grafana/latest/administration/provisioning/), [Grafana Docker configuration](https://grafana.com/docs/grafana/latest/setup-grafana/installation/docker/).
