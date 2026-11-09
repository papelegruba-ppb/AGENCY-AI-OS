import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { onRequestGet as ahrefsGet } from "../functions/api/integrations/ahrefs.js";
import { onRequestGet as clarityGet } from "../functions/api/integrations/clarity.js";
import { integrationEnabled } from "../functions/_lib/integrations.js";

const token = "a".repeat(64);
const sessionKey = "owner-session:" + createHash("sha256").update(token).digest("hex");
function makeEnv(extra = {}) {
  const store = new Map([[sessionKey, "active"]]);
  return {
    OWNER_PASSWORD: "test-only",
    AHREFS_API_KEY: "ahrefs-test-key",
    CLARITY_API_TOKEN: "clarity-test-token",
    AGENCY_KV: {
      async get(key) { return store.get(key) ?? null; },
      async put(key, value) { store.set(key, value); },
      async delete(key) { store.delete(key); }
    },
    ...extra
  };
}
function request(path) {
  return new Request("https://agency.example" + path, {
    headers: { cookie: "__Host-agency_owner=" + token }
  });
}

test("Ahrefs is only reported ready when both API key and KV exist", () => {
  assert.equal(integrationEnabled({ AHREFS_API_KEY: "key", AGENCY_KV: {} }, "ahrefs"), true);
  assert.equal(integrationEnabled({ AHREFS_API_KEY: "key" }, "ahrefs"), false);
  assert.equal(integrationEnabled({ AGENCY_KV: {} }, "ahrefs"), false);
});

test("Ahrefs proxy rejects unauthenticated requests", async () => {
  const response = await ahrefsGet({
    request: new Request("https://agency.example/api/integrations/ahrefs?target=example.com"),
    env: makeEnv()
  });
  assert.equal(response.status, 401);
});

test("Ahrefs Domain Rating request includes its required date and never exposes API key", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamUrl = "";
  let upstreamHeaders;
  globalThis.fetch = async (url, options) => {
    upstreamUrl = String(url);
    upstreamHeaders = options.headers;
    return new Response(JSON.stringify({ domain_rating: { domain_rating: 42, ahrefs_rank: 1000 } }), { status: 200 });
  };
  try {
    const response = await ahrefsGet({
      request: request("/api/integrations/ahrefs?metric=domain-rating&target=example.com"),
      env: makeEnv()
    });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.match(new URL(upstreamUrl).searchParams.get("date"), /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(new URL(upstreamUrl).searchParams.get("target"), "example.com");
    assert.equal(upstreamHeaders.Authorization, "Bearer ahrefs-test-key");
    assert.equal(JSON.stringify(payload).includes("ahrefs-test-key"), false);
  } finally { globalThis.fetch = originalFetch; }
});

test("Clarity proxy rejects invalid periods before calling Microsoft", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => { called = true; return new Response("[]"); };
  try {
    const response = await clarityGet({
      request: request("/api/integrations/clarity?numOfDays=4"),
      env: makeEnv()
    });
    assert.equal(response.status, 400);
    assert.equal(called, false);
  } finally { globalThis.fetch = originalFetch; }
});

test("Clarity proxy sends supported dimensions and uses Bearer authentication", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamUrl = "";
  let upstreamHeaders;
  globalThis.fetch = async (url, options) => {
    upstreamUrl = String(url);
    upstreamHeaders = options.headers;
    return new Response(JSON.stringify([{ metricName: "Traffic", information: [] }]), { status: 200 });
  };
  try {
    const response = await clarityGet({
      request: request("/api/integrations/clarity?numOfDays=1&dimension1=URL&dimension2=Device"),
      env: makeEnv()
    });
    assert.equal(response.status, 200);
    assert.equal(new URL(upstreamUrl).searchParams.get("dimension1"), "URL");
    assert.equal(new URL(upstreamUrl).searchParams.get("dimension2"), "Device");
    assert.equal(upstreamHeaders.Authorization, "Bearer clarity-test-token");
  } finally { globalThis.fetch = originalFetch; }
});
