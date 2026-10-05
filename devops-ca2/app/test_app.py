from app import app


def client():
    return app.test_client()


def test_health():
    r = client().get("/health")
    assert r.status_code == 200 and r.get_json()["status"] == "ok"


def test_quote_ok():
    r = client().post("/quote", json={"size": "medium", "hours": 10})
    assert r.status_code == 200
    assert r.get_json()["total_usd"] == 0.8


def test_quote_bad_input():
    r = client().post("/quote", json={"size": "huge", "hours": 1})
    assert r.status_code == 400


def test_metrics_exposed():
    client().get("/health")
    r = client().get("/metrics")
    assert b"http_requests_total" in r.data
