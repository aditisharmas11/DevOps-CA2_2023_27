"""Check the hosted API and save reproducible Step 2 evidence; no extra packages."""

import argparse
import csv
import json
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen


class TableRows(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_body = False
        self.rows = 0

    def handle_starttag(self, tag, attrs):
        if tag == "tbody":
            self.in_body = True
        elif tag == "tr" and self.in_body:
            self.rows += 1

    def handle_endtag(self, tag):
        if tag == "tbody":
            self.in_body = False


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base_url")
    parser.add_argument("--expected-commit")
    args = parser.parse_args()
    base = args.base_url.rstrip("/")
    evidence_dir = Path(__file__).resolve().parent
    sample = evidence_dir.parent / "valid_data/test.csv"
    results = {"base_url": base, "checked_at_utc": datetime.now(timezone.utc).isoformat()}

    for route in ("/health", "/ready", "/version", "/docs"):
        with urlopen(base + route, timeout=120) as response:
            content = response.read()
            assert response.status == 200, route
            results[route] = {"http_status": response.status}
            if route == "/docs":
                assert b"Swagger UI" in content
            else:
                payload = json.loads(content)
                results[route]["body"] = payload
                if route == "/ready":
                    assert payload["status"] == "ready"
                elif route == "/version" and args.expected_commit:
                    assert payload["commit"] == args.expected_commit

    boundary = "networkx-step2-demo"
    body = (
        f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.csv"\r\n'
        "Content-Type: text/csv\r\n\r\n"
    ).encode() + sample.read_bytes() + f"\r\n--{boundary}--\r\n".encode()
    request = Request(base + "/predict", data=body,
                      headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    with urlopen(request, timeout=120) as response:
        html = response.read().decode("utf-8")
        assert response.status == 200 and "predicted_column" in html
        table = TableRows()
        table.feed(html)
        with sample.open(newline="") as handle:
            reader = csv.reader(handle)
            feature_count = len(next(reader))
            expected_rows = sum(1 for _ in reader)
        assert table.rows == expected_rows
        results["/predict"] = {"http_status": response.status, "rows": table.rows,
                               "features": feature_count, "prediction_column": True}
        (evidence_dir / "hosted-prediction.html").write_text(html, encoding="utf-8")

    try:
        urlopen(base + "/train", timeout=30)
    except HTTPError as error:
        assert error.code == 403
        results["/train"] = {"http_status": error.code, "training_disabled": True}
    else:
        raise AssertionError("Training must remain disabled")

    results["result"] = "PASS"
    (evidence_dir / "verification.json").write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
