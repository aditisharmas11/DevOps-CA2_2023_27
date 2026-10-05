"""
Student Management System - Flask REST API
A simple BTech project demonstrating CRUD operations for student records.
Includes Prometheus metrics instrumentation for monitoring.
"""

import os
import time
import logging
from flask import Flask, request, jsonify
from prometheus_client import (
    Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
)

# ---------------------------------------------------------------------------
# Logging configuration
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("student-api")

# ---------------------------------------------------------------------------
# Flask application
# ---------------------------------------------------------------------------
app = Flask(__name__)

# ---------------------------------------------------------------------------
# Prometheus metrics
# ---------------------------------------------------------------------------
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"],
)
REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
)
ACTIVE_REQUESTS = Gauge(
    "http_requests_active",
    "Number of active HTTP requests",
)
STUDENTS_TOTAL = Gauge(
    "students_total",
    "Total number of students in the system",
)
ERROR_COUNT = Counter(
    "http_errors_total",
    "Total HTTP error responses",
    ["method", "endpoint", "status"],
)

# ---------------------------------------------------------------------------
# In-memory "database"
# ---------------------------------------------------------------------------
students: dict[int, dict] = {}
next_id: int = 1


# ---------------------------------------------------------------------------
# Middleware: instrument every request
# ---------------------------------------------------------------------------
@app.before_request
def _before():
    request._start_time = time.time()
    ACTIVE_REQUESTS.inc()


@app.after_request
def _after(response):
    latency = time.time() - getattr(request, "_start_time", time.time())
    endpoint = request.path
    method = request.method
    status = str(response.status_code)

    REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=status).inc()
    REQUEST_LATENCY.labels(method=method, endpoint=endpoint).observe(latency)
    ACTIVE_REQUESTS.dec()

    if response.status_code >= 400:
        ERROR_COUNT.labels(method=method, endpoint=endpoint, status=status).inc()

    logger.info("%s %s -> %s (%.3fs)", method, endpoint, status, latency)
    return response


# ---------------------------------------------------------------------------
# Health & metrics endpoints
# ---------------------------------------------------------------------------
@app.route("/health", methods=["GET"])
def health():
    """Health-check endpoint used by Kubernetes liveness/readiness probes."""
    return jsonify({"status": "healthy"}), 200


@app.route("/metrics", methods=["GET"])
def metrics():
    """Prometheus scrape endpoint."""
    return generate_latest(), 200, {"Content-Type": CONTENT_TYPE_LATEST}


# ---------------------------------------------------------------------------
# CRUD API
# ---------------------------------------------------------------------------
@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "service": "Student Management System",
        "version": os.getenv("APP_VERSION", "1.0.0"),
        "endpoints": [
            "GET  /students",
            "GET  /students/<id>",
            "POST /students",
            "PUT  /students/<id>",
            "DELETE /students/<id>",
            "GET  /health",
            "GET  /metrics",
        ],
    })


@app.route("/students", methods=["GET"])
def list_students():
    """Return all students."""
    return jsonify(list(students.values())), 200


@app.route("/students/<int:sid>", methods=["GET"])
def get_student(sid: int):
    """Return a single student by ID."""
    student = students.get(sid)
    if not student:
        return jsonify({"error": "Student not found"}), 404
    return jsonify(student), 200


@app.route("/students", methods=["POST"])
def create_student():
    """Create a new student record."""
    global next_id
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    department = data.get("department", "General")
    year = data.get("year", 1)

    if not name:
        return jsonify({"error": "name is required"}), 400

    student = {
        "id": next_id,
        "name": name,
        "department": department,
        "year": year,
    }
    students[next_id] = student
    next_id += 1
    STUDENTS_TOTAL.set(len(students))
    logger.info("Created student: %s", student)
    return jsonify(student), 201


@app.route("/students/<int:sid>", methods=["PUT"])
def update_student(sid: int):
    """Update an existing student record."""
    student = students.get(sid)
    if not student:
        return jsonify({"error": "Student not found"}), 404

    data = request.get_json(silent=True) or {}
    student["name"] = data.get("name", student["name"])
    student["department"] = data.get("department", student["department"])
    student["year"] = data.get("year", student["year"])
    logger.info("Updated student: %s", student)
    return jsonify(student), 200


@app.route("/students/<int:sid>", methods=["DELETE"])
def delete_student(sid: int):
    """Delete a student record."""
    if sid not in students:
        return jsonify({"error": "Student not found"}), 404

    deleted = students.pop(sid)
    STUDENTS_TOTAL.set(len(students))
    logger.info("Deleted student: %s", deleted)
    return jsonify({"message": "Student deleted", "student": deleted}), 200


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
