"""Negotiation Quote Service - a small Flask API (PBL service used for DevOps CA2).

Endpoints
  GET /health   liveness/readiness probe
  GET /version  running version (used to demonstrate rolling update / rollback)
  POST /quote   returns a cost quote for a cloud resource request
  GET /metrics  Prometheus metrics (request count, latency histogram, errors)
"""
import os
import time

from flask import Flask, Response, jsonify, request
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

APP_VERSION = os.getenv("APP_VERSION", "1.0.0")

app = Flask(__name__)

REQUESTS = Counter(
    "http_requests_total", "Total HTTP requests", ["method", "endpoint", "status"]
)
LATENCY = Histogram(
    "http_request_duration_seconds", "Request latency in seconds", ["endpoint"]
)

# Simple hourly price table (USD) - stands in for the real pricing logic.
PRICES = {"small": 0.02, "medium": 0.08, "large": 0.32}


@app.before_request
def _start_timer():
    request._start = time.perf_counter()


@app.after_request
def _record(resp):
    endpoint = request.url_rule.rule if request.url_rule else "unmatched"
    if endpoint != "/metrics":
        LATENCY.labels(endpoint).observe(time.perf_counter() - request._start)
        REQUESTS.labels(request.method, endpoint, resp.status_code).inc()
    return resp


@app.get("/health")
def health():
    return jsonify(status="ok")


@app.get("/version")
def version():
    return jsonify(version=APP_VERSION)


@app.post("/quote")
def quote():
    data = request.get_json(silent=True) or {}
    size = data.get("size")
    hours = data.get("hours")
    if size not in PRICES or not isinstance(hours, (int, float)) or hours <= 0:
        return jsonify(error="size must be small|medium|large and hours > 0"), 400
    return jsonify(size=size, hours=hours, total_usd=round(PRICES[size] * hours, 4))


@app.get("/metrics")
def metrics():
    return Response(generate_latest(), mimetype=CONTENT_TYPE_LATEST)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")))
