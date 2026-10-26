import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";
import express from "express";
import { collectHttpMetrics, metricsRegistry, serveMetrics } from "./metrics";

test("HTTP metrics record completed requests and exclude the metrics endpoint", async () => {
  const app = express();
  app.use(collectHttpMetrics);
  app.get("/success", (_req, res) => res.sendStatus(204));
  app.get("/client-error", (_req, res) => res.sendStatus(400));
  app.get("/metrics", serveMetrics);

  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const baseUrl = `http://127.0.0.1:${address.port}`;

    assert.equal((await fetch(`${baseUrl}/success`)).status, 204);
    assert.equal((await fetch(`${baseUrl}/client-error`)).status, 400);

    const response = await fetch(`${baseUrl}/metrics`);
    assert.equal(response.status, 200);
    const metrics = await response.text();

    assert.match(
      metrics,
      /http_requests_total\{method="GET",status_code="204"\} 1/,
    );
    assert.match(
      metrics,
      /http_errors_total\{method="GET",status_code="400"\} 1/,
    );
    assert.match(
      metrics,
      /http_request_duration_seconds_count\{method="GET",status_code="204"\} 1/,
    );
    assert.doesNotMatch(
      metrics,
      /http_requests_total\{method="GET",status_code="200"\}/,
    );

    assert.equal(response.headers.get("content-type"), metricsRegistry.contentType);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
