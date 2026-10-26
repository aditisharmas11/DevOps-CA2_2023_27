import type { Request, RequestHandler, Response, NextFunction } from "express";
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from "@prometheus-io/client";

export const metricsRegistry = new Registry();

collectDefaultMetrics({ register: metricsRegistry });

const standardHttpMethods = new Set([
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
]);

new Gauge({
  name: "process_uptime_seconds",
  help: "Time since the ZenGen process started, in seconds.",
  registers: [metricsRegistry],
  collect() {
    this.set(process.uptime());
  },
});

const httpRequests = new Counter({
  name: "http_requests_total",
  help: "Total number of completed HTTP requests, excluding /metrics.",
  labelNames: ["method", "status_code"] as const,
  registers: [metricsRegistry],
});

const httpErrors = new Counter({
  name: "http_errors_total",
  help: "Total number of completed HTTP requests with a 4xx or 5xx status.",
  labelNames: ["method", "status_code"] as const,
  registers: [metricsRegistry],
});

const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of completed HTTP requests, excluding /metrics.",
  labelNames: ["method", "status_code"] as const,
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [metricsRegistry],
});

export const collectHttpMetrics: RequestHandler = (req, res, next) => {
  if (req.path === "/metrics") {
    next();
    return;
  }

  const start = process.hrtime.bigint();

  res.once("finish", () => {
    const labels = {
      method: standardHttpMethods.has(req.method) ? req.method : "OTHER",
      status_code: String(res.statusCode),
    };

    httpRequests.inc(labels);
    httpRequestDuration.observe(
      labels,
      Number(process.hrtime.bigint() - start) / 1e9,
    );

    if (res.statusCode >= 400) {
      httpErrors.inc(labels);
    }
  });

  next();
};

export async function serveMetrics(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.setHeader("Content-Type", metricsRegistry.contentType);
    res.end(await metricsRegistry.metrics());
  } catch (error) {
    next(error);
  }
}
