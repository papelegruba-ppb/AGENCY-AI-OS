import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, script, styles] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../ai-resources.js", import.meta.url), "utf8"),
  readFile(new URL("../ai-resources.css", import.meta.url), "utf8")
]);

test("AI Resources Hub is linked from the workspace navigation", () => {
  assert.match(html, /data-view="ai-resources"/);
  assert.match(html, /id="view-ai-resources"/);
  assert.match(html, /href="ai-resources\.css"/);
  assert.match(html, /src="ai-resources\.js"/);
});

test("the four resource areas are present", () => {
  for (const section of ["prompts", "skills", "connectors", "compatibility"]) {
    assert.match(html, new RegExp('data-ar-pane="' + section + '"'));
  }
  for (const id of ["ar-prompts", "ar-skills", "ar-connectors"]) {
    assert.ok(script.includes(id), "missing renderer target: " + id);
  }
});

test("portable Claude prompt packs and agency skills are defined", () => {
  for (const role of ["Claude Web Designer", "Claude SEO Specialist", "Claude Developer", "Claude Automation", "Claude Marketing", "Claude Agency Manager"]) {
    assert.ok(script.includes(role), "missing prompt pack: " + role);
  }
  assert.ok(script.includes("MCP"));
  assert.ok(script.includes("localStorage"));
});

test("responsive styles and accessible interaction hooks exist", () => {
  assert.ok(styles.includes("@media(max-width:760px)"));
  assert.ok(script.includes("data-ar-tab"));
  assert.ok(script.includes("navigator.clipboard"));
});
