# Step 2 — Render deployment

**Complete:** deployed and verified on 5 October 2026.

Public app: https://networkx-devops-group32.onrender.com/docs

Render dashboard: https://dashboard.render.com/web/srv-db1slg3ncjis73c6o7k0

Initial deployment: `dep-db1slgrncjis73c6ob30`  
Initial application commit: `2aa8419c1fa53fc561936491e5c44fe9f1273c67`

After expanding the repository, deployment `dep-db1stcajnfac73eg7f0g` succeeded with application commit `4f25beb2114acbce635d13aee327570451d37e53`. All hosted checks passed again, including predictions for all 12 rows.

Repository: https://github.com/AryanSheladia/DevOps_CA2_Group32

## Files prepared

- Root `Dockerfile`: Python 3.12, pinned prediction requirements, saved model pair, one Uvicorn worker, and Render's `PORT` variable.
- Root `.dockerignore`: excludes local environments, secrets, caches, and old training outputs.
- Root `render.yaml`: records a free Docker web service with `/ready` as its health check and automatic deployment disabled for the later Jenkins stage.
- `app.py`: adds `/health`, `/ready`, and `/version`, and caches the existing model pair after its first load.
- `.gitignore`: keeps the serving models and sample CSV while excluding generated files and the unused credential-containing MongoDB test script.
- Original AWS Actions workflow: retained as manual-only so pushing this assessment project does not start an unrelated deployment.

## Intended Render settings

| Setting | Value |
|---|---|
| Name | networkx-devops-group32 |
| Repository | AryanSheladia/DevOps_CA2_Group32 |
| Branch | main |
| Runtime | Docker |
| Root directory | NetworkX-main; the repository now contains the full case study |
| Dockerfile path | ./Dockerfile |
| Docker context | . |
| Instance type | Free |
| Region | Singapore if available |
| Health-check path | /ready |
| Automatic deployment | Off |
| ENABLE_TRAINING | false |
| OMP_NUM_THREADS | 1 |
| OPENBLAS_NUM_THREADS | 1 |

## Verification

The updated app passed a local readiness and sample prediction check. Render then built the Docker image successfully and reported **Deploy succeeded / Live**. The first deployment took 1 minute 25 seconds. Local Docker Desktop did not provide a running engine during this step; the successful container build and runtime check were performed on Render.

Hosted verification passed at approximately **9:37 PM IST on 5 October 2026**:

| Check | Result |
|---|---|
| `/health` | HTTP 200, status ok |
| `/ready` | HTTP 200, model ready |
| `/version` | HTTP 200, matches application commit above |
| `/docs` | HTTP 200, Swagger UI available |
| Sample CSV upload to `/predict` | HTTP 200, all 12 rows predicted from 30 features |
| `/train` | HTTP 403, training disabled |

Saved evidence:

- `verification.json`: machine-readable hosted check results.
- `hosted-prediction.html`: actual prediction table returned by Render.
- `render-live.jpg`: screenshot showing the successful deployment.
- `verify_deployment.py`: reusable check script using Python's standard library.

Repeat the check from the project root:

```powershell
.\.venv\Scripts\python.exe step2-deployment/verify_deployment.py https://networkx-devops-group32.onrender.com --expected-commit 4f25beb2114acbce635d13aee327570451d37e53
```

To demonstrate the app, open the public `/docs` page, expand **POST /predict**, click **Try it out**, select `valid_data/test.csv`, and click **Execute**.

The free instance may sleep when idle. Allow time for it to wake before a demonstration. Model files are baked into the image; generated output files are temporary on Render.

Automatic deployment is Off. Evidence/documentation commits may therefore be newer than the running application commit. Jenkins configuration is the next step and has not been started.

No credentials or Render deploy-hook URLs will be placed in committed evidence.

References: [Docker on Render](https://render.com/docs/docker), [Render environment variables](https://render.com/docs/environment-variables).

## Repository layout update

At the user's request, the repository was expanded to include the entire case-study assessment: `Step1/`–`Step4/`, the presentation, and `NetworkX-main/`. Git history was preserved. Render's root directory is updated to `NetworkX-main` to keep the app's Dockerfile and serving files together. Local downloaded tools and generated runtime data remain excluded by the root `.gitignore`.

The original numeric training dataset, `Network_Data/phisingData.csv`, is included with the project. The local Git repository is now rooted at `E:\Case Study Devops`; commands from `NetworkX-main` also find that repository automatically.
