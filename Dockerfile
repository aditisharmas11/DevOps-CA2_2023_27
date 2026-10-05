# syntax=docker/dockerfile:1
# ---------- Stage 1: train the model from the dataset ----------
FROM python:3.11-slim AS trainer
WORKDIR /build
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ app/
COPY training/ training/
COPY airline_dataset.csv .
# The quality gate fails the image build if the model is worse than expected
RUN python training/train.py --data airline_dataset.csv --out models/model.joblib --min-roc-auc 0.98

# ---------- Stage 2: slim runtime image ----------
FROM python:3.11-slim AS runtime
ENV MODEL_PATH=/app/models/model.joblib \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# libgomp is needed by XGBoost; curl is used by the container health check
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 --create-home appuser

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ app/
COPY --from=trainer /build/models/ models/

# Declared last so building v1 / v2 reuses every cached layer above
ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION}
LABEL org.opencontainers.image.title="airline-satisfaction-api" \
      org.opencontainers.image.version="${APP_VERSION}"

USER 10001
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -fsS http://localhost:8000/ready || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
