const express = require('express');
const {
  collectDefaultMetrics,
  Counter,
  Histogram,
  register,
} = require('prom-client');

const app = express();
const port = process.env.PORT || 4000;

collectDefaultMetrics();

const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.5, 1, 2.5, 5],
});

app.use((req, res, next) => {
  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const route = req.route ? `${req.baseUrl}${req.route.path}` : 'unmatched';
    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode,
    };
    const durationSeconds = Number(process.hrtime.bigint() - startTime) / 1e9;

    httpRequestsTotal.inc(labels);
    httpRequestDurationSeconds.observe(labels, durationSeconds);
  });

  next();
});

app.get('/', (req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>DevOps CA2 Monitoring Service</title>
  </head>
  <body>
    <main>
      <h1>DevOps CA2 Monitoring Service</h1>
      <p>The monitoring service is running.</p>
      <p>Application version: 2.0.0</p>
    </main>
  </body>
</html>`);
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(port, () => {
  console.log(`DevOps CA2 Monitoring Service listening on port ${port}`);
});