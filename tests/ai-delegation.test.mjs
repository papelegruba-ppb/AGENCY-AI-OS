import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("AI Delegation Engine is wired into the workspace without automatic provider calls", async () => {
  const [html, script, css] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../ai-delegation.js", import.meta.url), "utf8"),
    readFile(new URL("../ai-delegation.css", import.meta.url), "utf8")
  ]);
  assert.match(html, /data-view="delegation"/);
  assert.match(html, /id="view-delegation"/);
  assert.match(html, /ai-delegation\.js/);
  assert.match(script, /https:\/\/claude\.ai\//);
  assert.match(script, /clipboard\.writeText/);
  assert.match(script, /No se envía a ningún proveedor automáticamente/);
  assert.match(script, /agency-ai-os\.delegations\.v1/);
  assert.match(script, /No incluyas secretos en frontend/);
  assert.match(css, /\.delegation-grid/);
  assert.doesNotMatch(script, /fetch\s*\(/);
});
