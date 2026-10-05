"""Simple Task Tracker API with Prometheus metrics (used across all DevOps tasks)."""
import os
import time
from flask import Flask, jsonify, request, g
from prometheus_client import (
    Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST,
)

app = Flask(__name__)
VERSION = os.getenv("APP_VERSION", "1.0.0")

REQUESTS = Counter(
    "http_requests_total", "Total HTTP requests", ["method", "endpoint", "status"]
)
LATENCY = Histogram(
    "http_request_duration_seconds", "Request latency in seconds", ["endpoint"]
)

TASKS = [{"id": 1, "title": "Learn CI/CD", "done": False}]


@app.before_request
def start_timer():
    g.start = time.time()


@app.after_request
def record_metrics(resp):
    if request.path != "/metrics":
        endpoint = request.url_rule.rule if request.url_rule else "unknown"
        LATENCY.labels(endpoint).observe(time.time() - g.start)
        REQUESTS.labels(request.method, endpoint, resp.status_code).inc()
    return resp


@app.get("/")
def index():
    return jsonify(service="task-tracker", version=VERSION)


@app.get("/health")
def health():
    return jsonify(status="ok"), 200


@app.get("/tasks")
def list_tasks():
    return jsonify(TASKS)


@app.post("/tasks")
def add_task():
    data = request.get_json(silent=True) or {}
    if not data.get("title"):
        return jsonify(error="title is required"), 400
    task = {"id": len(TASKS) + 1, "title": data["title"], "done": False}
    TASKS.append(task)
    return jsonify(task), 201


@app.get("/error")
def error():
    """Deliberately fails so you can demo the error-rate panel in Grafana."""
    return jsonify(error="simulated failure"), 500


@app.get("/metrics")
def metrics():
    return generate_latest(), 200, {"Content-Type": CONTENT_TYPE_LATEST}


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
