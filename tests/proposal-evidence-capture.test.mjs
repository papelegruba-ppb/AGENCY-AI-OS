import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync("propuesta-comercial.html", "utf8");

test("SEO audit is persisted to the selected project and triggers Workspace sync", () => {
  assert.match(html, /websiteAudit:data/);
  assert.match(html, /window\.dispatchEvent\(new StorageEvent\("storage"/);
});

test("proposal capture uses self-contained SVG and never exports a tainted canvas", () => {
  assert.match(html, /id="capture-after"/);
  assert.match(html, /function buildProposalCaptureSvg\(d\)/);
  assert.match(html, /data:image\/svg\+xml;charset=utf-8,/);
  assert.match(html, /Native SVG primitives only/);
  assert.doesNotMatch(html, /foreignObject/);
  assert.doesNotMatch(html, /canvas\.toBlob/);
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
