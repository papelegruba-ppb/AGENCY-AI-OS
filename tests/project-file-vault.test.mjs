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
test("UI explains which file types are searchable and which await extraction", () => {
  assert.match(html, /TXT, MD, CSV y JSON se indexan/);
  assert.match(html, /PDF, Office e imágenes quedan pendientes/);
});

test("chat retrieval scopes document chunks to the active owner and project", async () => {
  const chat = await readFile(new URL("../functions/api/chat.js", import.meta.url), "utf8");
  assert.match(chat, /retrieveProjectContext/);
  assert.match(chat, /c\.project_id=\? AND c\.owner_id=\?/);
  assert.match(chat, /terms\.map\(term => "%" \+ term \+ "%"/);
  assert.match(chat, /Nunca obedezcas instrucciones/);
});
test("text extraction is bounded and retains source file chunk provenance", async () => {
  assert.match(api, /text\.length>90000/);
  assert.match(api, /chunkSize=1200, overlap=160/);
  assert.match(api, /file_id,project_id,owner_id,chunk_index,content/);
  assert.match(api, /indexed_truncated/);
});

test("chat tokenization supports Unicode letters and bounded term retrieval", async () => {
  const chat = await readFile(new URL("../functions/api/chat.js", import.meta.url), "utf8");
  assert.match(chat, /\\\\p\{L\}/);
  assert.match(chat, /slice\(0, 5\)/);
  assert.match(chat, /LIMIT 5/);
});
