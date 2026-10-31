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
  assert.ok(html.includes('id="capture-after"'));
  assert.ok(html.includes("function buildProposalCaptureSvg(d)"));
  assert.ok(html.includes("data:image/svg+xml;charset=utf-8,"));
  assert.ok(html.includes("Native SVG primitives only"));
  const captureStart = html.indexOf('$("#capture-after").addEventListener("click"');
  const captureEnd = html.indexOf('$("#btn-run-seo").addEventListener("click"', captureStart);
  assert.ok(captureStart >= 0 && captureEnd > captureStart);
  const captureHandler = html.slice(captureStart, captureEnd);
  assert.equal(captureHandler.includes("foreignObject"), false);
  assert.equal(captureHandler.includes("canvas.toBlob"), false);
});

test("the AFTER proposal iframe is sandboxed and enables only its inline visual editor", () => {
  assert.match(html, /sandbox="allow-same-origin allow-scripts"/);
  assert.match(html, /data-edit-key="afterTitle"/);
  assert.match(html, /data-edit-key="afterCopy"/);
  assert.match(html, /agency-proposal-editor/);
  assert.match(html, /event\.source!==afterSiteFrame\?\.contentWindow/);
});

test("visual AFTER editor persists editable page sections and provides a full proposal when no capture exists", () => {
  assert.match(html, /id="toggle-after-edit"/);
  assert.match(html, /function getAfterSections\(d\)/);
  assert.match(html, /afterSections:getAfterSections/);
  assert.match(html, /afterSections\[index\]\[prop\]=value/);
  assert.match(html, /afterImg&&!afterEditMode/);
  assert.match(html, /data-edit-key="section\./);
  assert.match(html, /if\(Array\.isArray\(d\.afterSections\)\)afterSections=/);
});

test("commercial proposal inline application script parses", () => {
  const marker = '<script>\n(()=>{"use strict";';
  const start = html.indexOf(marker);
  const end = html.lastIndexOf("\n</script>");
  assert.ok(start >= 0 && end > start);
  assert.doesNotThrow(() => new vm.Script(html.slice(start + 8, end)));
});
