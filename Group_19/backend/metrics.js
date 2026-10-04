const client = require("@prometheus-io/client");

const {
  collectDefaultMetrics,
  Counter,
  Histogram,
  Gauge,
  register,
} = client;

// Node.js runtime metrics: memory, CPU, event loop, GC, etc.
collectDefaultMetrics({
  prefix: "meditwin_",
});

// Total HTTP requests.
const httpRequestsTotal = new Counter({
  name: "meditwin_http_requests_total",
  help: "Total number of HTTP requests handled by MediTwin backend",
  labelNames: ["method", "route", "status_code"],
});

// HTTP request latency in seconds.
const httpRequestDuration = new Histogram({
  name: "meditwin_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});

// Application uptime.
const uptimeSeconds = new Gauge({
  name: "meditwin_uptime_seconds",
  help: "MediTwin backend process uptime in seconds",
  collect() {
    this.set(process.uptime());
  },
});

// Express middleware for request metrics.
function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationSeconds =
      Number(process.hrtime.bigint() - start) / 1_000_000_000;

    let route = "unmatched";

    if (req.route?.path) {
      route = `${req.baseUrl || ""}${req.route.path}`;
    }

    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };

    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, durationSeconds);
  });

  next();
}

async function metricsHandler(_req, res) {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    console.error("Metrics generation failed:", error);
    res.status(500).end("Failed to generate metrics");
  }
}

module.exports = {
  metricsMiddleware,
  metricsHandler,
};