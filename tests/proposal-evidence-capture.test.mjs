import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync("propuesta-comercial.html", "utf8");

test("SEO audit is persisted to the selected project and triggers Workspace sync", () => {
  assert.match(html, /websiteAudit:data/);
  assert.match(html, /window\.dispatchEvent\(new StorageEvent\("storage"/);
});

test("proposal preview capture is generated locally without an external paid service", () => {
  assert.match(html, /id="capture-after"/);
  assert.match(html, /new XMLSerializer\(\)\.serializeToString\(root\)/);
  assert.match(html, /foreignObject/);
  assert.match(html, /afterImg=await new Promise/);
});

test("the generated proposal iframe is readable but scripts remain sandboxed", () => {
  assert.match(html, /sandbox="allow-same-origin"/);
  assert.doesNotMatch(html, /sandbox="[^"]*allow-scripts/);
});

test("commercial proposal inline application script parses", () => {
  const marker = '<script>\n(()=>{"use strict";';
  const start = html.indexOf(marker);
  const end = html.lastIndexOf("\n</script>");
  assert.ok(start >= 0 && end > start);
  assert.doesNotThrow(() => new vm.Script(html.slice(start + 8, end)));
});
