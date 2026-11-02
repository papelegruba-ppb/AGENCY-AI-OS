import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const script = await readFile(new URL("../ai-delegation.js", import.meta.url), "utf8");
const css = await readFile(new URL("../ai-delegation.css", import.meta.url), "utf8");

test("AI Delegation Engine script has valid JavaScript syntax", () => {
  assert.doesNotThrow(() => new vm.Script(script));
});

test("AI Delegation Engine assets are loaded by the workspace", () => {
  assert.match(html, /href="ai-delegation\.css"/);
  assert.match(html, /src="ai-delegation\.js"/);
  assert.match(html, /id="view-ai-toolbox"/);
});

test("delegation UI exposes prompt, response review and five acceptance controls", () => {
  for (const id of ["delegation-engine","de-provider","de-task","de-context","de-constraints","de-generate","de-copy","de-download","de-open","de-response","de-save-review"]) {
    assert.ok(script.includes(id), "Missing control: " + id);
  }
  assert.equal((script.match(/data-check=/g) || []).length, 5);
});

test("delegation supports four external AI providers and structured engineering instructions", () => {
  for (const value of ["Claude","ChatGPT","Gemini","DeepSeek","Repositorio","Criterios de aceptación","PR","pruebas"]) {
    assert.ok(script.includes(value), "Missing prompt capability: " + value);
  }
});

test("delegation is manual-first and does not transmit data to external services", () => {
  assert.doesNotMatch(script, /\bfetch\s*\(/);
  assert.doesNotMatch(script, /API_KEY|Bearer\s+/i);
  assert.match(script, /localStorage/);
});

test("delegation stylesheet includes responsive layouts", () => {
  assert.match(css, /@media/);
});
