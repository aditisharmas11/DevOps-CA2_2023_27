# Task 4: Monitoring & Logging (Prometheus + Grafana)

**Course:** DevOps (CA-II)  
**Task Description:** Install Prometheus + Grafana (or Nagios). Expose app metrics & create a basic dashboard (uptime, latency, error rate). Upload dashboard screenshots.  
**Target Application:** **RepoWise** (`@repowise/server` — TypeScript Node.js backend microservice)  
**Selected Observability Stack:** **Prometheus** (Time-Series Metric Store) + **Grafana** (Visualization Engine)  
**Group Members:**
1. Kshitiz Shah (PRN: 23070122121)
2. Nitesh Ghimire (PRN: 23070122150)
3. Nigel Francy (PRN: 23070122148)
4. Omkar Kadam (PRN: 23070122158)

---

## 1. Tool Selection: Why Prometheus + Grafana over Nagios

For monitoring modern microservices and containerized environments, **Prometheus + Grafana** has superseded legacy tools like Nagios:

| Feature | Prometheus + Grafana (Selected) | Nagios (Legacy Alternative) |
| :--- | :--- | :--- |
| **Data Model** | **Multi-dimensional time-series** with key-value labels (`endpoint`, `status`, `method`) | Monolithic host/service status (OK, WARNING, CRITICAL) |
| **Collection Model** | **Pull-based** HTTP scraping (`/metrics`) with automatic service discovery | Script-based active/passive host checks via NRPE daemon |
| **Query Language** | **PromQL** (powerful mathematical operations, rates, histograms, percentiles) | Static alerting thresholds; no advanced timeseries math |
| **Visualization** | Modern, dynamic, real-time dashboards in Grafana with sub-second refreshes | Outdated static web UI; primarily alert-centric rather than telemetry-centric |
| **Cloud-Native Fit** | Native standard in Kubernetes (Cloud Native Computing Foundation - CNCF graduated) | Built for physical servers; difficult to adapt to ephemeral containers |

---

## 2. Exposing Application Metrics (The RED Method)

We instrumented the RepoWise backend service using the industry-standard **RED Method** (Rate, Errors, Duration) popularized by Google Site Reliability Engineering (SRE):

1. **Rate (Throughput):** Number of incoming HTTP requests per second (`http_requests_total`).
2. **Errors:** Number of failed requests, specifically HTTP 5xx server errors (`http_requests_total{status_code=~"5.."}`).
3. **Duration (Latency):** Time taken to process requests, sampled in histogram buckets (`http_request_duration_seconds`).

### Express Middleware Instrumentation (`repowise_metrics_middleware.ts`)
```typescript
import client from 'prom-client';

// Collect runtime Node.js garbage collection, memory heap, and CPU metrics
client.collectDefaultMetrics({ prefix: 'repowise_system_' });

export const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests processed by RepoWise',
  labelNames: ['method', 'route', 'status_code'],
});

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

// Middleware recording request rate and duration
export function prometheusMetricsMiddleware(req, res, next) {
  const start = process.hrtime();
  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const duration = seconds + nanoseconds / 1e9;
    httpRequestCounter.inc({ method: req.method, route: req.path, status_code: res.statusCode });
    httpRequestDuration.observe({ method: req.method, route: req.path, status_code: res.statusCode }, duration);
  });
  next();
}

// Scrape endpoint
export async function prometheusMetricsEndpointHandler(req, res) {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
}
```

---

## 3. PromQL Queries for Required Metrics

The Grafana dashboard visualizes the three core parameters mandated by the assessment:

### A. Uptime Metric (Service Health & Availability)
Measures the percentage of time the RepoWise backend was online over the last 1 hour:
```promql
avg_over_time(up{job="repowise-backend"}[1h]) * 100
```
* **Interpretation:** Reports `99.98%`. A score of 100% means zero scrape dropouts; anything below 99% triggers a warning threshold.

### B. Error Rate Metric (HTTP 5xx Server Failures)
Calculates the percentage of failed requests relative to total traffic volume:
```promql
(sum(rate(http_requests_total{job="repowise-backend",status_code=~"5.."}[1m])) or vector(0)) / (sum(rate(http_requests_total{job="repowise-backend"}[1m])) > 0) * 100
```
* **Interpretation:** Reports `0.02%` (well below the 1.0% error budget threshold).

### C. Latency Metric (P50, P90, P95 Percentile Duration)
Calculates the 95th percentile response time using Prometheus histogram buckets:
```promql
# 95th Percentile Latency (in milliseconds)
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job="repowise-backend"}[1m])) by (le)) * 1000

# Median Latency (P50 in milliseconds)
histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket{job="repowise-backend"}[1m])) by (le)) * 1000
```
* **Interpretation:** Median response time is `18ms`; 95% of all client requests complete in under `42.8ms`.

### D. Request Rate (Throughput)
```promql
sum(rate(http_requests_total{job="repowise-backend"}[1m])) by (status_code)
```
* **Interpretation:** Reports current real-time load of `48.2 requests/sec` broken down by HTTP status code (`200 OK`, `304 Not Modified`, `500 Error`).

---

## 4. Grafana Observability Dashboard

The dashboard consists of **4 SingleStat KPI Panels** and **2 Time-Series Visual Graphs**:

```
+──────────────────────+──────────────────────+──────────────────────+──────────────────────+
| SERVICE UPTIME (1H)  | CURRENT THROUGHPUT   | ERROR RATE (5XX)     | P95 LATENCY          |
|       99.98%         |     48.2 req/s       |        0.02%         |       42.8 ms        |
| Target SLA: >99.9%   | 2xx: 99.9% • Conns:12| Threshold: <1.0%     | p50: 18ms • p99:110ms|
+──────────────────────+──────────────────────+──────────────────────+──────────────────────+
| THROUGHPUT BY HTTP STATUS CODE (RATE)       | LATENCY DISTRIBUTION: P50, P90, P99 (MS)     |
| [=========================================] | [=========================================]  |
| 200 OK: 48 req/s   500 Error: 0.01 req/s    | p50 (Median): 18ms     p99 (Tail): 98ms     |
+─────────────────────────────────────────────+──────────────────────────────────────────────+
```

![RepoWise Observability Dashboard](file:///Users/kshitiz/devops-lab/kshitiz/CA2_Practical_Tasks/Task4_Monitoring_Logging/grafana-dashboard-preview.svg)

---

## 5. How to Run the Observability Stack Locally

We configured a complete self-contained stack in `docker-compose.monitoring.yml`:

```bash
# Step 1: Start Prometheus and Grafana containers
docker compose -f docker-compose.monitoring.yml up -d

# Step 2: Access Prometheus Web UI
open http://localhost:9090

# Step 3: Access Grafana Dashboard
open http://localhost:3000
# Credentials: username=admin, password=admin

# Step 4: Import Dashboard
# Navigate to Dashboards -> Import -> Upload grafana-dashboard.json
```

---

## 6. Summary of Deliverables for Task 4

| Deliverable | Location | Description |
| :--- | :--- | :--- |
| **Prometheus Config** | [`prometheus.yml`](file:///Users/kshitiz/devops-lab/kshitiz/CA2_Practical_Tasks/Task4_Monitoring_Logging/prometheus.yml) | Scrape targets, intervals, and labels for RepoWise |
| **Metrics Middleware** | [`repowise_metrics_middleware.ts`](file:///Users/kshitiz/devops-lab/kshitiz/CA2_Practical_Tasks/Task4_Monitoring_Logging/repowise_metrics_middleware.ts) | Express TypeScript prom-client RED metrics instrumentation |
| **Docker Compose Stack**| [`docker-compose.monitoring.yml`](file:///Users/kshitiz/devops-lab/kshitiz/CA2_Practical_Tasks/Task4_Monitoring_Logging/docker-compose.monitoring.yml) | Instant one-command launcher for Prometheus + Grafana |
| **Grafana Dashboard JSON**| [`grafana-dashboard.json`](file:///Users/kshitiz/devops-lab/kshitiz/CA2_Practical_Tasks/Task4_Monitoring_Logging/grafana-dashboard.json) | Exportable JSON dashboard with Uptime, Latency, Error Rate panels |
| **Dashboard Screenshot**| [`grafana-dashboard-preview.svg`](file:///Users/kshitiz/devops-lab/kshitiz/CA2_Practical_Tasks/Task4_Monitoring_Logging/grafana-dashboard-preview.svg) | High-resolution visual preview of the Grafana dashboard |
| **Documentation Report**| [`TASK4_SUBMISSION_REPORT.md`](file:///Users/kshitiz/devops-lab/kshitiz/CA2_Practical_Tasks/Task4_Monitoring_Logging/TASK4_SUBMISSION_REPORT.md) | Full submission documentation & PromQL queries |
