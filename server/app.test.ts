import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import { createApp } from "./app";

test("API Endpoints & Wellness Services Test Suite", async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip("Skipping live database integration tests in runner without DATABASE_URL");
    return;
  }
  const { server } = await createApp();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const baseUrl = `http://127.0.0.1:${address.port}`;

    // 1. Test Health endpoint
    const healthRes = await fetch(`${baseUrl}/health`);
    assert.equal(healthRes.status, 200);
    const healthData = await healthRes.json();
    assert.equal(healthData.status, "ok");

    // 2. Test Resources endpoint
    const resourcesRes = await fetch(`${baseUrl}/api/resources`);
    assert.equal(resourcesRes.status, 200);
    const resources = await resourcesRes.json();
    assert.ok(Array.isArray(resources));
    assert.ok(resources.length >= 6);

    // 3. Test Assessment scoring endpoint
    const sampleAnswers: Record<string, number> = {};
    for (let i = 1; i <= 20; i++) {
      sampleAnswers[i] = 1; // "Several days"
    }

    const assessmentRes = await fetch(`${baseUrl}/api/assessment/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: sampleAnswers }),
    });
    assert.equal(assessmentRes.status, 200);
    const assessmentData = await assessmentRes.json();
    assert.ok(typeof assessmentData.overallScore === "number");
    assert.ok(typeof assessmentData.moodScore === "number");
    assert.ok(typeof assessmentData.anxietyScore === "number");
    assert.ok(typeof assessmentData.socialScore === "number");
    assert.ok(typeof assessmentData.summary === "string");
    assert.ok(Array.isArray(assessmentData.predictions));
    assert.ok(Array.isArray(assessmentData.recommendations));

    // 4. Test Chat endpoint (General question)
    const chatRes = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "What is a good breathing exercise for anxiety?" }],
      }),
    });
    assert.equal(chatRes.status, 200);
    const chatData = await chatRes.json();
    assert.ok(chatData.message);
    assert.equal(chatData.message.role, "assistant");
    assert.ok(typeof chatData.message.content === "string");
    assert.ok(chatData.message.content.length > 10);

    // 5. Test Chat endpoint crisis escalation safety
    const crisisChatRes = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "I feel like I want to die and kill myself" }],
      }),
    });
    assert.equal(crisisChatRes.status, 200);
    const crisisChatData = await crisisChatRes.json();
    assert.ok(crisisChatData.message.content.includes("988"));
    assert.ok(crisisChatData.message.content.includes("Lifeline") || crisisChatData.message.content.includes("crisis"));

    // 6. Test Unauthenticated user /api/user returns 401
    const userRes = await fetch(`${baseUrl}/api/user`);
    assert.equal(userRes.status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
