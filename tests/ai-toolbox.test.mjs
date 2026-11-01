import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const script = await readFile(new URL("../ai-toolbox.js", import.meta.url), "utf8");

test("AI Toolbox client script has valid JavaScript syntax", () => {
  assert.doesNotThrow(() => new vm.Script(script));
});

test("AI Toolbox view includes every control required by its client script", () => {
  for (const id of ["view-ai-toolbox","tb-tool","tb-task","tb-brand","tb-audience","tb-format","tb-style","tb-rules","tb-output","tb-copy","tb-save","tb-open","tb-history","tb-search","tb-filters","tb-tools"]) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
});

test("AI Toolbox offers reasoning, research, video, image and app tools", () => {
  for (const name of ["Claude","ChatGPT","Gemini","DeepSeek","Perplexity","Google Flow","Google Veo","Runway","Kling AI","Midjourney","Adobe Firefly","Wron AI","Lovable","Bolt"]) {
    assert.ok(script.includes(name), "Missing tool: " + name);
  }
});

test("manual-first prompt tool does not make network calls or expose API credentials", () => {
  assert.doesNotMatch(script, /\bfetch\s*\(/);
  assert.doesNotMatch(script, /API_KEY|Bearer\s+/i);
});
