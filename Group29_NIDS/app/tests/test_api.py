import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
SAMPLE = json.loads((Path(__file__).resolve().parents[2] / "samples" / "attack.json").read_text())


def test_health():
    r = client.get("/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


def test_predict():
    r = client.post("/predict", json=SAMPLE)
    assert r.status_code == 200
    assert "label" in r.json()


def test_metrics():
    client.get("/health")
    assert "http_requests_total" in client.get("/metrics").text