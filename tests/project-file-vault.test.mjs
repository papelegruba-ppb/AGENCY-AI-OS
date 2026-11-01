import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const api = await readFile(new URL("../functions/api/project-files.js", import.meta.url), "utf8");
const ui = await readFile(new URL("../project-file-vault.js", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
test("project file API enforces private owner and same-origin authentication", () => {
  assert.match(api, /ownerSession/); assert.match(api, /sameOrigin/);
  assert.match(api, /OWNER_ID = "owner"/); assert.match(api, /WHERE project_id=\? AND owner_id=\?/);
});
test("file API has size and type allowlists and does not publish object URLs", () => {
  assert.match(api, /MAX_FILE_BYTES = 8 \* 1024 \* 1024/); assert.match(api, /ALLOWED = new Map/);
  assert.match(api, /AGENCY_FILES\.put/); assert.match(api, /AGENCY_FILES\.delete/);
  assert.doesNotMatch(api, /r2\.dev|publicUrl|https?:\/\//);
});
test("project file library follows the active project and uses same-origin requests", () => {
  assert.match(ui, /agency:active-project-change/); assert.match(ui, /credentials:"same-origin"/);
  assert.match(ui, /x-project-id/); assert.match(ui, /method:"DELETE"/);
  assert.match(html, /id="pf-file-input"/); assert.match(html, /src="project-file-vault.js"/);
});
test("UI explicitly discloses that file contents are not yet in chat context", () => {
  assert.match(html, /todavía no se incorpora al contexto del chat/);
});
