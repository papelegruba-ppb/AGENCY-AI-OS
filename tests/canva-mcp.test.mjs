import test from "node:test";
import assert from "node:assert/strict";
import {
  CanvaOAuthProvider,
  encryptCanvaTokens,
  decryptCanvaTokens
} from "../functions/_lib/canva-mcp.js";

const secret = "test-only-canva-encryption-secret-0123456789";

test("Canva OAuth tokens are encrypted at rest and round-trip", async () => {
  const tokens = {
    access_token: "canva-access-token-sensitive",
    refresh_token: "canva-refresh-token-sensitive",
    token_type: "Bearer",
    expires_in: 14400
  };
  const stored = await encryptCanvaTokens({ CANVA_TOKEN_ENCRYPTION_KEY: secret }, tokens);
  assert.equal(stored.includes(tokens.access_token), false);
  assert.equal(stored.includes(tokens.refresh_token), false);
  assert.deepEqual(await decryptCanvaTokens({ CANVA_TOKEN_ENCRYPTION_KEY: secret }, stored), tokens);
});

test("Canva token ciphertext cannot be decrypted with another key", async () => {
  const stored = await encryptCanvaTokens({ CANVA_TOKEN_ENCRYPTION_KEY: secret }, { access_token: "private" });
  await assert.rejects(() => decryptCanvaTokens({ CANVA_TOKEN_ENCRYPTION_KEY: "different-secret-012345678901234567" }, stored));
});

test("Canva token encryption fails closed without a sufficiently long secret", async () => {
  await assert.rejects(() => encryptCanvaTokens({ CANVA_TOKEN_ENCRYPTION_KEY: "short" }, { access_token: "private" }), /32\+ character/);
});

test("OAuth provider persists state, PKCE verifier, discovery and encrypted tokens in KV", async () => {
  const data = new Map();
  const kv = {
    async get(key) { return data.get(key) ?? null; },
    async put(key, value) { data.set(key, value); },
    async delete(key) { data.delete(key); }
  };
  const env = { AGENCY_KV: kv, CANVA_TOKEN_ENCRYPTION_KEY: secret };
  const provider = new CanvaOAuthProvider(env, "https://agency-ai-os-1cm.pages.dev");
  const state = await provider.state();
  assert.equal(await kv.get("canva-oauth:state"), state);
  await provider.saveCodeVerifier("pkce-verifier");
  assert.equal(await provider.codeVerifier(), "pkce-verifier");
  await provider.saveDiscoveryState({ issuer: "https://auth.example" });
  assert.deepEqual(await provider.discoveryState(), { issuer: "https://auth.example" });
  const tokens = { access_token: "sensitive-access-token", refresh_token: "sensitive-refresh-token" };
  await provider.saveTokens(tokens);
  const raw = await kv.get("canva-oauth:tokens");
  assert.equal(raw.includes(tokens.access_token), false);
  assert.deepEqual(await provider.tokens(), tokens);
});


import { sanitizeCanvaDiagnosticMessage } from "../functions/_lib/canva-diagnostics.js";

test("Canva OAuth diagnostics redact secrets, bearer tokens and OAuth URL parameters", () => {
  const message = "secret=topsecret Bearer abc.def.ghi https://example.test/callback?state=secret-state&code=secret-code&scope=design";
  const result = sanitizeCanvaDiagnosticMessage(message, { CANVA_CLIENT_SECRET: "topsecret" });
  assert.doesNotMatch(result, /topsecret|abc\.def\.ghi|secret-state|secret-code/);
  assert.match(result, /scope=design/);
});

test("Canva OAuth diagnostic messages are length-limited", () => {
  assert.equal(sanitizeCanvaDiagnosticMessage("x".repeat(500)).length, 240);
});
