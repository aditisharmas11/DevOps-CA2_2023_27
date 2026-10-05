import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app"))
from main import app


def client():
    return app.test_client()


def test_health():
    r = client().get("/health")
    assert r.status_code == 200 and r.json["status"] == "ok"


def test_list_tasks():
    assert client().get("/tasks").status_code == 200


def test_add_task():
    r = client().post("/tasks", json={"title": "Write report"})
    assert r.status_code == 201 and r.json["title"] == "Write report"


def test_add_task_validation():
    assert client().post("/tasks", json={}).status_code == 400


def test_metrics_exposed():
    client().get("/health")
    r = client().get("/metrics")
    assert b"http_requests_total" in r.data
