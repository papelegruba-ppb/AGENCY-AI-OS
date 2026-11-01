import test from "node:test";
import assert from "node:assert/strict";
import { buildFallbackPlan, classifyTask } from "../project-workflows-core.js";

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
