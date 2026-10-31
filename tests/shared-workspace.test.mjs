import test from "node:test";
import assert from "node:assert/strict";
import { onRequestGet, onRequestPost, onRequestDelete } from "../functions/api/projects.js";

const request = (url, method = "GET", body) => new Request(url, {
  method,
  headers: { "content-type": "application/json", origin: "https://agency-ai-os.test", cookie: "__Host-agency_owner=" + "d".repeat(64) },
  ...(body === undefined ? {} : { body: JSON.stringify(body) })
});
const context = (req, env = {}) => ({ request: req, env });

test("projects API rejects unauthenticated requests", async () => {
  const response = await onRequestGet(context(request("https://agency-ai-os.test/api/projects")));
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, "OWNER_AUTH_REQUIRED");
});

test("projects API rejects cross-origin writes", async () => {
  const req = new Request("https://agency-ai-os.test/api/projects", {
    method: "POST", headers: { origin: "https://evil.example", cookie: "__Host-agency_owner=" + "a".repeat(64), "content-type": "application/json" },
    body: JSON.stringify({ project: { id: "p1", name: "Test" } })
  });
  const response = await onRequestPost(context(req, { AGENCY_KV: { get: async () => "active" } }));
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, "ORIGIN_NOT_ALLOWED");
});

test("projects API reports missing D1 binding without writing", async () => {
  const token = "b".repeat(64);
  const req = new Request("https://agency-ai-os.test/api/projects", {
    headers: { cookie: "__Host-agency_owner=" + token }
  });
  const response = await onRequestGet(context(req, { AGENCY_KV: { get: async () => "active" } }));
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "D1_NOT_CONFIGURED");
});

test("projects API persists, lists and deletes an authenticated project", async () => {
  const rows = new Map();
  const db = {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async run() {
              if (sql.startsWith("INSERT INTO projects")) rows.set(args[0], { data_json: args[3] });
              else if (sql.startsWith("DELETE FROM projects")) rows.delete(args[0]);
              return { success: true };
            },
            async all() { return { results: [...rows.values()] }; }
          };
        }
      };
    }
  };
  const token = "c".repeat(64);
  const env = { AGENCY_KV: { get: async () => "active" }, AGENCY_DB: db };
  const project = { id: "project_1", name: "Demo", createdAt: "2026-10-31T10:00:00.000Z" };
  const save = await onRequestPost(context(request("https://agency-ai-os.test/api/projects", "POST", { project }), env));
  assert.equal(save.status, 200);
  const list = await onRequestGet(context(new Request("https://agency-ai-os.test/api/projects", { headers: { cookie: "__Host-agency_owner=" + token } }), env));
  assert.equal(list.status, 200);
  assert.equal((await list.json()).projects[0].name, "Demo");
  const remove = await onRequestDelete(context(new Request("https://agency-ai-os.test/api/projects?id=project_1", {
    method: "DELETE", headers: { origin: "https://agency-ai-os.test", cookie: "__Host-agency_owner=" + token }
  }), env));
  assert.equal(remove.status, 200);
  assert.equal(rows.size, 0);
});
