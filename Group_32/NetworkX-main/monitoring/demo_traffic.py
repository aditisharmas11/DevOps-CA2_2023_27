"""Send real demo requests and optionally verify authenticated metrics."""
import argparse
import json
import os
import secrets
import time
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

PROJECT_DIR = Path(__file__).resolve().parents[1]


def fetch(base, path, data=None, headers=None):
    request = Request(base + path, data=data, headers=headers or {})
    try:
        with urlopen(request, timeout=180) as response:
            return response.status, response.read()
    except HTTPError as response:
        return response.code, response.read()


def upload(base, csv_bytes):
    boundary = "networkx-" + secrets.token_hex(16)
    body = (f"--{boundary}\r\n"
            'Content-Disposition: form-data; name="file"; filename="demo.csv"\r\n'
            "Content-Type: text/csv\r\n\r\n").encode() + csv_bytes + f"\r\n--{boundary}--\r\n".encode()
    return fetch(base, "/predict", body, {"Content-Type": f"multipart/form-data; boundary={boundary}"})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="https://networkx-devops-group32.onrender.com")
    parser.add_argument("--count", type=int, default=8)
    parser.add_argument("--interval", type=float, default=2)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    if args.count < 1 or args.interval < 0:
        parser.error("count must be positive and interval must not be negative")
    base = args.base_url.rstrip("/")
    checks = []
    for path in ("/health", "/ready"):
        status, body = fetch(base, path)
        checks.append({"path": path, "status": status})
        if status != 200:
            raise SystemExit(f"{path}: expected 200, got {status}")
    token = os.getenv("METRICS_TOKEN")
    if token:
        status, _ = fetch(base, "/metrics")
        if status != 401:
            raise SystemExit(f"Unprotected metrics: expected 401, got {status}. Deploy the updated app first.")
        status, body = fetch(base, "/metrics", headers={"Authorization": "Bearer " + token})
        if status != 200 or b"networkx_http_requests_total" not in body:
            raise SystemExit(f"Authenticated metrics check failed: HTTP {status}. Check the deployment and token.")
        checks.append({"path": "/metrics", "unauthenticated_status": 401, "authenticated_status": status})
    else:
        print("METRICS_TOKEN is unset; metrics authentication checks will be skipped.")
    sample = (PROJECT_DIR / "valid_data/test.csv").read_bytes()
    for index in range(args.count):
        status, body = upload(base, sample)
        if status != 200 or b"predicted_column" not in body or body.count(b"<tr>") != 12:
            raise SystemExit(f"Prediction {index + 1} failed: HTTP {status}")
        checks.append({"path": "/predict", "case": "valid", "status": status, "rows": 12})
        print(f"Prediction {index + 1}/{args.count}: HTTP 200, 12 rows")
        if index + 1 < args.count:
            time.sleep(args.interval)
    status, body = upload(base, b"some_column\nnot-a-number\n")
    if status != 422:
        raise SystemExit(f"Invalid CSV: expected 422, got {status}")
    checks.append({"path": "/predict", "case": "invalid", "status": status, "detail": json.loads(body)})
    print("Invalid CSV: HTTP 422 (client input error)")
    if token:
        status, body = fetch(base, "/metrics", headers={"Authorization": "Bearer " + token})
        if status != 200:
            raise SystemExit(f"Metrics after traffic: HTTP {status}")
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.with_suffix(".prom").write_bytes(body)
    result = {"base_url": base, "checks": checks}
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print("Demo checks passed. Allow 30 seconds for Prometheus and Grafana to refresh.")


if __name__ == "__main__":
    main()
