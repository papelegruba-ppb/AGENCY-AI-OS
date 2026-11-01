import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = await readFile(new URL("../functions/api/project-files.js", import.meta.url), "utf8");
const migration = await readFile(new URL("../migrations/0002_project_files.sql", import.meta.url), "utf8");
test("private project files endpoint requires owner session, D1 and R2", () => {
  assert.match(source, /ownerSession/); assert.match(source, /sameOrigin/); assert.match(source, /AGENCY_DB/); assert.match(source, /AGENCY_FILES/);
});
test("uploads enforce bounded size, MIME allowlist and project ownership", () => {
  assert.match(source, /MAX_FILE_BYTES = 8 \* 1024 \* 1024/); assert.match(source, /ALLOWED/);
  assert.match(source, /WHERE id=\? AND owner_id=\?/); assert.match(source, /WHERE project_id=\? AND owner_id=\?/);
});
test("R2 objects are private and never exposed as public URLs", () => {
  assert.match(source, /AGENCY_FILES\.put/); assert.match(source, /AGENCY_FILES\.delete/);
  assert.doesNotMatch(source, /https?:\/\//); assert.doesNotMatch(source, /publicUrl|r2\.dev/);
});
test("D1 migration stores private metadata and indexes owner/project", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS project_files/); assert.match(migration, /owner_id TEXT NOT NULL/);
  assert.match(migration, /object_key TEXT NOT NULL UNIQUE/); assert.match(migration, /idx_project_files_owner_project_created/);
});
