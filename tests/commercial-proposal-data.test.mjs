import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const proposal = readFileSync("propuesta-comercial.html", "utf8");

test("commercial proposal reads the original website audit and PageSpeed evidence", () => {
  assert.match(proposal, /p\.websiteAudit\s*\|\|\s*p\.audit/);
  assert.match(proposal, /audit\?\.pageSpeed\?\.mobile/);
  assert.match(proposal, /audit\.scoreType===\"heuristic_html_checks_not_lighthouse\"/);
  assert.match(proposal, /findings\.slice\(0,12\)/);
});

test("measured baseline scores populate before metrics without inventing after scores", () => {
  assert.match(proposal, /const value=psi\?\.scores\?\.\[id\]/);
  assert.match(proposal, /input\.value\.trim\(\)===\"\"&&Number\.isFinite\(value\)/);
  assert.match(proposal, /value:raw===\"\"\?null/);
});

test("proposal edits persist inside the selected shared project", () => {
  assert.match(proposal, /commercialProposal:proposal/);
  assert.match(proposal, /localStorage\.setItem\(PKEY,JSON\.stringify\(projects\)\)/);
  assert.match(proposal, /saveProposalToProject\)/);
});

test("uploaded screenshots are compressed for safe shared-project storage", () => {
  assert.match(proposal, /1280\/image\.width/);
  assert.match(proposal, /180\*1024/);
  assert.match(proposal, /Pulsa Guardar ajustes para incluirla en el proyecto/);
});

test("proposal labels distinguish a live embedded site from an actual screenshot", () => {
  assert.match(proposal, /Esto no es una captura de pantalla/);
  assert.match(proposal, /No hay captura real de la web original/);
});

test("commercial proposal inline JavaScript parses", () => {
  const marker = '<script>\n(()=>{"use strict";';
  const start = proposal.indexOf(marker);
  const end = proposal.lastIndexOf("\n</script>");
  assert.ok(start >= 0 && end > start, "Expected an inline application script");
  assert.doesNotThrow(() => new vm.Script(proposal.slice(start + 8, end)));
});
