import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildFallbackPlan, classifyTask } from "../project-workflows-core.js";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const ui = await readFile(new URL("../project-workflows.js", import.meta.url), "utf8");

test("classifies social content requests", () => {
  assert.equal(classifyTask("Prepara historias y carruseles para Instagram"), "social");
});
test("classifies video requests", () => {
  assert.equal(classifyTask("Crea un Reel promocional"), "video");
});
test("builds a complete fallback plan with integration instructions", () => {
  const plan = buildFallbackPlan({ task: "Crear 5 posts de Instagram", projectName: "Demo" });
  assert.equal(plan.category, "social");
  assert.match(plan.prompt, /APLICACIÓN SUGERIDA/);
  assert.match(plan.prompt, /PROMPT PARA LA APLICACIÓN/);
  assert.match(plan.prompt, /APLICACIÓN POSTERIOR EN AGENCY AI OS/);
  assert.match(plan.prompt, /VALIDACIÓN/);
});
test("rejects an empty task", () => {
  assert.throws(() => buildFallbackPlan({ task: " " }), /Describe la tarea/);
});

test("project task panel is embedded in the existing chat workspace", () => {
  for (const id of ["pw-title", "pw-project", "pw-task", "pw-category", "pw-generate", "pw-copy", "pw-save", "pw-recommendation", "pw-output", "pw-history"]) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(html, /type="module" src="project-workflows.js"/);
});
test("task history is keyed by project and never sent to an external API", () => {
  assert.match(ui, /WORKFLOWS_KEY/);
  assert.match(ui, /store\[project\.id\]/);
  assert.doesNotMatch(ui, /\bfetch\s*\(/);
});
