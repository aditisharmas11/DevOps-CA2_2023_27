# Step 1 — working prediction demo

Verified on 5 October 2026. Step 1 is complete. Online deployment was subsequently completed in Step 2; see `step2-deployment/README.md`.

## Result

- Python 3.12.6 runs the existing saved models with scikit-learn 1.8.0.
- Both pickle files record scikit-learn 1.8.0; loading and prediction passed with version mismatch warnings treated as errors.
- The existing CSV has 12 rows and 30 feature columns; all rows received predictions.
- `GET /docs` returned HTTP 200.
- An actual multipart CSV upload to `POST /predict` returned HTTP 200 and an HTML prediction table.
- `GET /train` returned HTTP 403 because training is disabled by default.
- Prediction startup did not import the training pipeline or MLflow.
- `pip check` found no broken requirements in the local environment.

## Small changes made

- Created `.venv` inside this project and recorded its packages in `requirements-serving.txt`.
- Moved the training import into the opt-in training route; no model was retrained.
- Resolved model/output paths relative to `app.py`, so they do not depend on the shell's current directory.
- Made the output folder create itself if missing and removed noisy prediction-data prints.
- Updated `.gitignore` to exclude `.venv` and include only the two serving model files and the existing sample CSV.
- Added the local demo commands to `README.md`.

The model files and training algorithm were not changed. Predictions still produce the original HTML table and `prediction_output/output.csv`.

## Try it yourself

The local docs page is <http://127.0.0.1:8000/docs> while the server is running.

1. Expand **POST /predict**.
2. Click **Try it out**.
3. Select `valid_data/test.csv` from this project.
4. Click **Execute** and look for HTTP 200 and `predicted_column` in the response.

To restart later, run this command from `NetworkX-main`:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000
```

Step 2 subsequently updated the Dockerfile and deployed the app on Render. See `step2-deployment/README.md` for the live URL and verification evidence.
