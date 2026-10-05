"""Prometheus metrics for the API (kept in their own module so they are registered once)."""
from prometheus_client import Counter, Gauge, Histogram

REQUESTS = Counter('airline_api_http_requests_total', 'HTTP requests', ['method', 'path', 'status'])
LATENCY = Histogram('airline_api_http_request_duration_seconds', 'HTTP request latency', ['method', 'path'],
                    buckets=(0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 1, 2.5, 5))
IN_PROGRESS = Gauge('airline_api_http_requests_in_progress', 'Requests being served')
PREDICTIONS = Counter('airline_api_predictions_total', 'Predictions made', ['prediction'])
PREDICTION_ERRORS = Counter('airline_api_prediction_errors_total', 'Predictions that raised an exception')
MODEL_LOADED = Gauge('airline_api_model_loaded', '1 if the model is loaded and the pod is ready')
START_TIME = Gauge('airline_api_start_time_seconds', 'Unix time the process started')
APP_INFO = Gauge('airline_api_app_info', 'Static app information', ['version', 'model_roc_auc'])
