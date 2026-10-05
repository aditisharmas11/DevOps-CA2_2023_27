"""Request metrics with bounded route labels and no credentials in labels."""

from time import perf_counter

from prometheus_client import CollectorRegistry, Counter, Histogram

from networksecurity.logging.logger import logging

REGISTRY = CollectorRegistry()
REQUESTS = Counter(
    "networkx_http_requests_total", "Completed application requests by HTTP status.",
    ["method", "route", "status"], registry=REGISTRY,
)
DURATION = Histogram(
    "networkx_http_request_duration_seconds", "Application response duration in seconds.",
    ["method", "route", "status"], registry=REGISTRY,
    buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60),
)
# Establish a baseline before the first demo prediction, so increase() sees it.
for status in ("200", "422", "500"):
    REQUESTS.labels("POST", "/predict", status)
    DURATION.labels("POST", "/predict", status)


class RequestMetricsMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["path"] in {"/metrics", "/health", "/ready"}:
            await self.app(scope, receive, send)
            return

        started = perf_counter()
        status = 500

        async def record_status(message):
            nonlocal status
            if message["type"] == "http.response.start":
                status = message["status"]
            await send(message)

        try:
            await self.app(scope, receive, record_status)
        finally:
            route = getattr(scope.get("route"), "path", "unmatched")
            method = scope["method"] if scope["method"] in {
                "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"
            } else "OTHER"
            labels = (method, route, str(status))
            REQUESTS.labels(*labels).inc()
            DURATION.labels(*labels).observe(perf_counter() - started)
            if status >= 400:
                logging.warning("HTTP request failed: method=%s route=%s status=%s", *labels)
