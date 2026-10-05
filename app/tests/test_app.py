"""Unit tests for the Student Management System API."""

import pytest
import sys, os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "healthy"


def test_index(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert "Student Management System" in resp.get_json()["service"]


def test_create_student(client):
    resp = client.post("/students", json={"name": "Alice", "department": "CS", "year": 3})
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["name"] == "Alice"
    assert data["department"] == "CS"


def test_create_student_missing_name(client):
    resp = client.post("/students", json={"department": "CS"})
    assert resp.status_code == 400


def test_list_students(client):
    client.post("/students", json={"name": "Bob"})
    resp = client.get("/students")
    assert resp.status_code == 200
    assert isinstance(resp.get_json(), list)


def test_get_student_not_found(client):
    resp = client.get("/students/9999")
    assert resp.status_code == 404


def test_update_student(client):
    create = client.post("/students", json={"name": "Charlie"})
    sid = create.get_json()["id"]
    resp = client.put(f"/students/{sid}", json={"name": "Charles"})
    assert resp.status_code == 200
    assert resp.get_json()["name"] == "Charles"


def test_delete_student(client):
    create = client.post("/students", json={"name": "Dave"})
    sid = create.get_json()["id"]
    resp = client.delete(f"/students/{sid}")
    assert resp.status_code == 200
