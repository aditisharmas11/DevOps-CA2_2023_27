"""Check provisioned Grafana, the Prometheus target, and dashboard queries."""
import argparse
import base64
from datetime import datetime
import json
import math
import time
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

MONITORING_DIR = Path(__file__).resolve().parent


def read_json(url, headers=None):
    with urlopen(Request(url, headers=headers or {}), timeout=10) as response:
        return json.load(response)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prometheus-url", default="http://127.0.0.1:9090")
    parser.add_argument("--grafana-url", default="http://127.0.0.1:3000")
    parser.add_argument("--require-traffic", action="store_true")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    password = (MONITORING_DIR / "secrets/grafana_password.txt").read_text().strip()
    auth = {"Authorization": "Basic " + base64.b64encode(("admin:" + password).encode()).decode()}
    prometheus = args.prometheus_url.rstrip("/")
    grafana = args.grafana_url.rstrip("/")
    started_at = time.time()
    deadline = time.monotonic() + 90
    last_error = ""
    while time.monotonic() < deadline:
        try:
            targets = read_json(prometheus + "/api/v1/targets")
            target = next(t for t in targets["data"]["activeTargets"] if t["labels"]["job"] == "networkx")
            if target["health"] != "up":
                raise RuntimeError("Prometheus target DOWN: " + target.get("lastError", ""))
            last_scrape = datetime.fromisoformat(target["lastScrape"].replace("Z", "+00:00")).timestamp()
            if args.require_traffic and last_scrape < started_at:
                raise RuntimeError("Waiting for a fresh scrape after the demo traffic")
            dashboard = read_json(grafana + "/api/dashboards/uid/networkx-devops", auth)["dashboard"]
            datasource = read_json(grafana + "/api/datasources/uid/networkx-prometheus/health", auth)
            if datasource.get("status") != "OK":
                raise RuntimeError("Grafana datasource health failed")
            values = {}
            for panel in dashboard["panels"]:
                expression = panel["targets"][0]["expr"]
                response = read_json(prometheus + "/api/v1/query?" + urlencode({"query": expression}))
                if response["status"] != "success":
                    raise RuntimeError("Panel query failed: " + panel["title"])
                values[panel["title"]] = [item["value"][1] for item in response["data"]["result"]]
            if args.require_traffic:
                requests = float(values["Requests since restart"][0])
                clients = float(values["Client errors (4xx)"][0])
                if requests < 9 or clients < 1:
                    raise RuntimeError("Run demo_traffic.py before verifying traffic")
                durations = values["Average prediction response time"]
                if not durations or not math.isfinite(float(durations[0])) or float(durations[0]) <= 0:
                    raise RuntimeError("Waiting for two scrapes and a positive response-time sample")
            result = {"target": target["scrapeUrl"], "target_health": target["health"],
                      "grafana_datasource_health": datasource["status"], "dashboard_uid": dashboard["uid"],
                      "panel_values": values}
            if args.output:
                args.output.parent.mkdir(parents=True, exist_ok=True)
                args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
            print(json.dumps(result, indent=2))
            return
        except Exception as exc:
            last_error = str(exc)
            time.sleep(2)
    raise SystemExit("Monitoring verification failed: " + last_error)


if __name__ == "__main__":
    main()
