const test = require('node:test');
const assert = require('node:assert');
const app = require('../server');

test('health and metrics endpoints respond', async () => {
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const h = await fetch(`${base}/health`);
    assert.strictEqual(h.status, 200);
    assert.strictEqual((await h.json()).status, 'ok');
    const m = await fetch(`${base}/metrics`);
    assert.strictEqual(m.status, 200);
    assert.match(await m.text(), /http_request_duration_seconds/);
    const bad = await fetch(`${base}/api/login`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: '{}' });
    assert.strictEqual(bad.status, 400);
  } finally {
    server.close();
    await require('mongoose').disconnect();
  }
});
