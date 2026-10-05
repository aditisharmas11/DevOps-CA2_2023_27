import importlib
import os
import subprocess
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

SAMPLE_PASSENGER = {
    'Gender': 'Female', 'Customer Type': 'Loyal Customer', 'Age': 41, 'Type of Travel': 'Business travel',
    'Class': 'Business', 'Flight Distance': 2300, 'Departure Delay in Minutes': 0,
    'Inflight wifi service': 5, 'Departure/Arrival time convenient': 4, 'Ease of Online booking': 5,
    'Gate location': 4, 'Food and drink': 4, 'Online boarding': 5, 'Seat comfort': 5,
    'Inflight entertainment': 5, 'On-board service': 5, 'Leg room service': 5, 'Baggage handling': 5,
    'Checkin service': 4, 'Inflight service': 5, 'Cleanliness': 5,
}


@pytest.fixture(scope='session')
def model_path(tmp_path_factory):
    """Use MODEL_PATH if it already exists (CI trains first); otherwise train a small model."""
    existing = os.getenv('MODEL_PATH')
    if existing and Path(existing).exists():
        return Path(existing)
    out = tmp_path_factory.mktemp('model') / 'model.joblib'
    subprocess.run([sys.executable, str(ROOT / 'training' / 'train.py'), '--data', str(ROOT / 'airline_dataset.csv'),
                    '--out', str(out), '--sample', '5000'], check=True, cwd=ROOT)
    return out


def _client(monkeypatch, path):
    monkeypatch.setenv('MODEL_PATH', str(path))
    monkeypatch.setenv('APP_VERSION', 'test')
    import app.main
    importlib.reload(app.main)
    return TestClient(app.main.app)


@pytest.fixture
def client(monkeypatch, model_path):
    return _client(monkeypatch, model_path)


@pytest.fixture
def client_without_model(monkeypatch, tmp_path):
    return _client(monkeypatch, tmp_path / 'missing.joblib')
