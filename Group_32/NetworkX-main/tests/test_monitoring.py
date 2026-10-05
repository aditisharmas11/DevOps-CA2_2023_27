import csv
import io
import os
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

import app as api
from networksecurity.monitoring import REGISTRY

SAMPLE = (Path(__file__).resolve().parents[1] / "valid_data/test.csv").read_bytes()


def metric(name, **labels):
    return REGISTRY.get_sample_value(name, labels) or 0


class MonitoringTests(unittest.TestCase):
    def setUp(self):
        self.environment = patch.dict(os.environ, {"METRICS_TOKEN": "test-metrics-token"})
        self.environment.start()
        self.addCleanup(self.environment.stop)
        self.client = TestClient(api.app, raise_server_exceptions=False)
        self.addCleanup(self.client.close)

    def upload(self, content):
        return self.client.post("/predict", files={"file": ("input.csv", content, "text/csv")})

    def test_health_readiness_and_scrapes_do_not_count_as_application_traffic(self):
        before = sum(s.value for m in REGISTRY.collect() for s in m.samples
                     if s.name == "networkx_http_requests_total")
        self.assertEqual(self.client.get("/health").json(), {"status": "ok"})
        self.assertEqual(self.client.get("/ready").status_code, 200)
        self.client.get("/metrics", headers={"Authorization": "Bearer test-metrics-token"})
        after = sum(s.value for m in REGISTRY.collect() for s in m.samples
                    if s.name == "networkx_http_requests_total")
        self.assertEqual(before, after)

    def test_metrics_fail_closed_and_accept_only_correct_bearer_token(self):
        for authorization in ("", "Bearer wrong", "Basic test-metrics-token", b"Bearer caf\xe9"):
            response = self.client.get("/metrics", headers={"Authorization": authorization})
            self.assertEqual(response.status_code, 401)
            self.assertEqual(response.headers["www-authenticate"], "Bearer")
        with patch.dict(os.environ, {"METRICS_TOKEN": ""}):
            self.assertEqual(self.client.get("/metrics").status_code, 503)
        response = self.client.get("/metrics", headers={"Authorization": "bearer test-metrics-token"})
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/plain", response.headers["content-type"])
        self.assertIn("networkx_http_requests_total", response.text)
        self.assertNotIn("test-metrics-token", response.text)

    def test_saved_model_predicts_all_12_sample_rows_and_records_duration(self):
        labels = {"method": "POST", "route": "/predict", "status": "200"}
        before = metric("networkx_http_requests_total", **labels)
        duration_before = metric("networkx_http_request_duration_seconds_count", **labels)
        response = self.upload(SAMPLE)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertIn("predicted_column", response.text)
        self.assertEqual(response.text.count("<tr>"), 12)
        self.assertEqual(metric("networkx_http_requests_total", **labels), before + 1)
        self.assertEqual(metric("networkx_http_request_duration_seconds_count", **labels), duration_before + 1)

    def test_invalid_csv_cases_are_422_and_counted(self):
        parsed = list(csv.reader(io.StringIO(SAMPLE.decode())))
        cases = [b"", b"some_column\nnot-a-number\n", b'header\n"unterminated',
                 b"\xff\xfe", ",".join(parsed[0]).encode() + b"\n", SAMPLE.splitlines()[0] + b"\n1,2\n"]
        for value in ("bad-value", "NaN", "inf", ""):
            changed = [row[:] for row in parsed]
            changed[1][0] = value
            output = io.StringIO()
            csv.writer(output).writerows(changed)
            cases.append(output.getvalue().encode())
        duplicate = [row[:] for row in parsed]
        duplicate[0][1] = duplicate[0][0]
        output = io.StringIO()
        csv.writer(output).writerows(duplicate)
        cases.append(output.getvalue().encode())
        labels = {"method": "POST", "route": "/predict", "status": "422"}
        before = metric("networkx_http_requests_total", **labels)
        with self.assertLogs(level="WARNING"):
            for content in cases:
                with self.subTest(content=content[:50]):
                    self.assertEqual(self.upload(content).status_code, 422)
        self.assertEqual(metric("networkx_http_requests_total", **labels), before + len(cases))

    def test_reordered_features_produce_same_prediction_table(self):
        model = api.get_prediction_model()
        if getattr(model.preprocessor, "feature_names_in_", None) is None:
            self.skipTest("Saved preprocessor has no feature names")
        expected = self.upload(SAMPLE)
        rows = list(csv.reader(io.StringIO(SAMPLE.decode())))
        output = io.StringIO()
        csv.writer(output).writerows([list(reversed(row)) for row in rows])
        actual = self.upload(output.getvalue().encode())
        self.assertEqual(actual.status_code, 200, actual.text)
        self.assertEqual(actual.text, expected.text)

    def test_server_failure_is_500_counted_and_logged_without_response_traceback(self):
        model = api.get_prediction_model()
        labels = {"method": "POST", "route": "/predict", "status": "500"}
        before = metric("networkx_http_requests_total", **labels)
        with patch.object(model, "predict", side_effect=RuntimeError("test-private-detail")):
            with self.assertLogs(level="WARNING") as logs:
                response = self.upload(SAMPLE)
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json(), {"detail": "An internal application error occurred."})
        self.assertNotIn("test-private-detail", response.text)
        self.assertIn("test-private-detail", "\n".join(logs.output))
        self.assertEqual(metric("networkx_http_requests_total", **labels), before + 1)

    def test_unknown_paths_share_one_bounded_metric_label(self):
        labels = {"method": "GET", "route": "unmatched", "status": "404"}
        before = metric("networkx_http_requests_total", **labels)
        with self.assertLogs(level="WARNING"):
            for path in ("/missing/one", "/missing/two"):
                self.assertEqual(self.client.get(path).status_code, 404)
        self.assertEqual(metric("networkx_http_requests_total", **labels), before + 2)


if __name__ == "__main__":
    unittest.main()
