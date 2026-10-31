import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeCanvaDiagnosticMessage } from "../functions/_lib/canva-diagnostics.js";

test("redacts configured Canva secrets and bearer credentials", () => {
  const message = "failed secret=topsecret Bearer abc.def.ghi";
  const result = sanitizeCanvaDiagnosticMessage(message, {
    CANVA_CLIENT_SECRET: "topsecret"
  });
  assert.doesNotMatch(result, /topsecret|abc\.def\.ghi/);
  assert.match(result, /\[REDACTED\]/);
});

test("redacts OAuth parameters from URLs", () => {
  const result = sanitizeCanvaDiagnosticMessage(
    "OAuth URL https://example.test/callback?state=secret-state&code=secret-code&scope=design"
  );
  assert.doesNotMatch(result, /secret-state|secret-code/);
  assert.match(result, /scope=design/);
});

test("bounds diagnostic message length", () => {
  assert.equal(sanitizeCanvaDiagnosticMessage("x".repeat(500)).length, 240);
});
