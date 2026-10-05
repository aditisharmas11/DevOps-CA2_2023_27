"""Run the real Lex Orion Streamlit app with HTTP metrics and request logs."""
import json
import logging
import os
import sys
import threading
import time
import urllib.request
from pathlib import Path

from prometheus_client import Counter, Gauge, Histogram, start_http_server
from tornado.web import RequestHandler
from streamlit.web import bootstrap

ROOT = Path(__file__).resolve().parent
APP = ROOT.parent / "devops" / "app.py"
LOGS = ROOT / "logs"
LOGS.mkdir(exist_ok=True)
logger = logging.getLogger("lex_orion.http")
logger.setLevel(logging.INFO)
handler = logging.FileHandler(LOGS / "app-requests.log", encoding="utf-8")
handler.setFormatter(logging.Formatter("%(message)s"))
logger.addHandler(handler)
requests = Counter("lex_orion_http_requests_total", "Completed Streamlit HTTP requests.", ["method", "status"])
latency = Histogram("lex_orion_http_request_duration_seconds", "Streamlit HTTP response latency.", buckets=(.001,.0025,.005,.01,.025,.05,.1,.25,.5,1,2.5,5))
uptime = Gauge("lex_orion_uptime_seconds", "Elapsed time since the application process started.")
available = Gauge("lex_orion_app_available", "Whether the Streamlit health endpoint returns HTTP 200.")
started = time.monotonic()
uptime.set_function(lambda: time.monotonic() - started)
for code in ("200", "304", "400", "404", "500", "503"):
    requests.labels("GET", code).inc(0)
original_finish = RequestHandler.finish

def instrumented_finish(self, chunk=None):
    was_finished = self._finished
    result = original_finish(self, chunk)
    if not was_finished:
        status = self.get_status()
        elapsed = self.request.request_time()
        requests.labels(self.request.method, str(status)).inc()
        latency.observe(elapsed)
        logger.info(json.dumps({
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "method": self.request.method,
            "path": self.request.path,
            "status": status,
            "latency_ms": round(elapsed * 1000, 3)
        }))
    return result

RequestHandler.finish = instrumented_finish

def probe():
    while True:
        try:
            with urllib.request.urlopen("http://127.0.0.1:8501/_stcore/health", timeout=3) as response:
                available.set(1 if response.status == 200 else 0)
        except Exception:
            available.set(0)
        time.sleep(5)

if __name__ == "__main__":
    os.chdir(APP.parent)
    sys.path.insert(0, str(APP.parent))
    start_http_server(8000, addr="127.0.0.1")
    threading.Thread(target=probe, daemon=True).start()
    bootstrap.run(str(APP), False, [], {
        "server.address": "127.0.0.1",
        "server.port": 8501,
        "server.headless": True,
        "browser.gatherUsageStats": False,
    })
