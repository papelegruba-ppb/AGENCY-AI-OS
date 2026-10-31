import test from "node:test";
import assert from "node:assert/strict";
import { aiStatus, reserveAiCall } from "../functions/_lib/ai-runtime.js";

function makeKV(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    values,
    async get(key) { return values.has(key) ? values.get(key) : null; },
    async put(key, value) { values.set(key, value); }
  };
}
function request(ip = "203.0.113.10") {
  return new Request("https://example.test/api/ai-status", { headers: { "CF-Connecting-IP": ip } });
}

test("AI remains disabled unless AI_ENABLED is explicitly true", async () => {
  const result = await reserveAiCall({ env: {}, request: request(), endpoint: "/test" });
  assert.equal(result.ok, false);
  assert.equal(result.response.status, 503);
  assert.equal((await result.response.json()).code, "AI_DISABLED");
});

test("AI status never reports configured when the usage store is missing", () => {
  const status = aiStatus({
    AI_ENABLED: "true", AI_PROVIDER: "deepseek",
    DEEPSEEK_API_KEY: "not-a-real-key", DEEPSEEK_MODEL: "test-model"
  });
  assert.equal(status.configured, false);
  assert.equal(status.usageStoreConfigured, false);
});


test("billable providers remain blocked without explicit spend authorization", async () => {
  let reads = 0;
  const kv = { async get() { reads += 1; return null; }, async put() {} };
  const result = await reserveAiCall({
    env: {
      AI_ENABLED: "true", AI_BILLABLE_ENABLED: "true", AI_PROVIDER: "deepseek",
      DEEPSEEK_API_KEY: "not-a-real-key", DEEPSEEK_MODEL: "test-model",
      AGENCY_KV: kv
    },
    request: request(), endpoint: "/test"
  });
  assert.equal(result.ok, false);
  assert.equal(result.response.status, 503);
  assert.equal((await result.response.json()).code, "AI_SPEND_NOT_AUTHORIZED");
  assert.equal(reads, 0);
});

test("global daily limit blocks requests before provider fetch", async () => {
  const day = new Date().toISOString().slice(0, 10);
  const kv = makeKV({ ["ai-usage:global:" + day]: "1" });
  const result = await reserveAiCall({
    env: {
      AI_ENABLED: "true", AI_BILLABLE_ENABLED: "true", AI_SPEND_AUTHORIZED: "true", AI_PROVIDER: "deepseek",
      DEEPSEEK_API_KEY: "not-a-real-key", DEEPSEEK_MODEL: "test-model",
      AI_DAILY_LIMIT: "1", AGENCY_KV: kv
    },
    request: request(), endpoint: "/test"
  });
  assert.equal(result.ok, false);
  assert.equal(result.response.status, 429);
  assert.equal((await result.response.json()).code, "AI_DAILY_LIMIT_REACHED");
});

test("usage-store failure fails closed", async () => {
  const kv = { async get() { throw new Error("KV unavailable"); }, async put() {} };
  const result = await reserveAiCall({
    env: {
      AI_ENABLED: "true", AI_BILLABLE_ENABLED: "true", AI_SPEND_AUTHORIZED: "true", AI_PROVIDER: "deepseek",
      DEEPSEEK_API_KEY: "not-a-real-key", DEEPSEEK_MODEL: "test-model",
      AGENCY_KV: kv
    },
    request: request(), endpoint: "/test"
  });
  assert.equal(result.ok, false);
  assert.equal(result.response.status, 503);
  assert.equal((await result.response.json()).code, "AI_USAGE_STORE_UNAVAILABLE");
});
