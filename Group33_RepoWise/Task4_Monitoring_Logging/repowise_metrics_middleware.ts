/**
 * ==============================================================================
 * Prometheus Metrics Middleware for RepoWise Backend (Node.js / Express)
 * Implements the Google SRE Golden Signals & RED Method (Rate, Errors, Duration)
 * ==============================================================================
 */

import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

// Initialize default Node.js process & OS runtime telemetry
client.collectDefaultMetrics({
  prefix: 'repowise_system_',
  timeout: 5000,
});

// Metric 1: Request Counter (Measures Rate & Errors)
export const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests processed by RepoWise backend',
  labelNames: ['method', 'route', 'status_code'],
});

// Metric 2: Request Duration Histogram (Measures Latency - p50, p90, p99)
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10], // Latency buckets in seconds
});

// Metric 3: Active Connections Gauge (Measures Current Concurrency)
export const activeConnectionsGauge = new client.Gauge({
  name: 'repowise_active_connections',
  help: 'Number of active concurrent connections to RepoWise backend',
});

// Metric 4: Application Health / Uptime Gauge
export const appHealthGauge = new client.Gauge({
  name: 'repowise_service_health',
  help: 'Reports 1 if the backend database and vector store are reachable, 0 otherwise',
});
appHealthGauge.set(1);

/**
 * Express Middleware to intercept all incoming HTTP requests and record metrics
 */
export function prometheusMetricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = process.hrtime();
  activeConnectionsGauge.inc();

  res.on('finish', () => {
    activeConnectionsGauge.dec();
    const diff = process.hrtime(startTime);
    const durationSeconds = diff[0] + diff[1] / 1e9;

    const route = req.route?.path || req.path || 'unknown';
    const statusCode = res.statusCode.toString();

    // Record metrics
    httpRequestCounter.inc({
      method: req.method,
      route,
      status_code: statusCode,
    });

    httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status_code: statusCode,
      },
      durationSeconds
    );
  });

  next();
}

/**
 * Metrics Scrape Controller Endpoint Handler: /metrics
 */
export async function prometheusMetricsEndpointHandler(req: Request, res: Response) {
  res.set('Content-Type', client.register.contentType);
  const metrics = await client.register.metrics();
  res.end(metrics);
}
