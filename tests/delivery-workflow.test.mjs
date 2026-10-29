import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync("index.html", "utf8");
const app = readFileSync("app.js", "utf8");
const css = readFileSync("styles.css", "utf8");

test("the builder shows the six delivery stages", () => {
  assert.match(html, /id="delivery-roadmap-title"/);
  assert.equal((html.match(/class="roadmap-step(?: current)?"/g) || []).length, 6);
  for (const label of ["Briefing", "Estrategia y UX/UI", "Demo funcional", "Aprobación del cliente", "Construcción e integración", "Publicación y entrega"]) {
    assert.ok(html.includes(label), `Missing roadmap stage: ${label}`);
  }
});

test("all delivery choices are named form controls and are collected", () => {
  const fields = ["webSituation", "demoFormat", "buildMethod", "hostingPlan", "ownership", "paidApproval"];
  for (const name of fields) {
    assert.match(html, new RegExp(`<select[^>]*name="${name}"[^>]*id="${name}"|<select[^>]*id="${name}"[^>]*name="${name}"`), `Missing form select ${name}`);
    assert.ok(app.includes(`fd.get("${name}")`), `Form handler does not collect ${name}`);
  }
});

test("delivery choices are included in project data and persisted", () => {
  assert.match(app, /delivery:\s*\{/);
  assert.match(app, /JSON\.stringify\(projects\)/);
  assert.match(app, /localStorage\.setItem\(STORE_KEY/);
});

test("roadmap has mobile responsive styling", () => {
  assert.match(css, /\.roadmap-steps\s*\{\s*grid-template-columns:\s*repeat\(3/);
  assert.match(css, /@media\s*\(max-width:\s*620px\)[\s\S]*?\.roadmap-steps\s*\{\s*grid-template-columns:\s*1fr/);
});

test("publishing workflow warns against unapproved paid services", () => {
  assert.match(html, /No comprar ni activar pagos sin aprobación expresa/);
});

test("the builder preserves Spanish document metadata and mobile viewport", () => {
  assert.match(html, /<html lang="es">/);
  assert.match(html, /name="viewport"/);
  assert.match(html, /<link rel="stylesheet" href="styles\.css">/);
});
