import test from "node:test";
import assert from "node:assert/strict";
import { createPreviewServer, resolvePreviewPath } from "../scripts/preview-server.mjs";

test("preview path only resolves web assets inside the project root", () => {
  assert.ok(resolvePreviewPath("/index.html"));
  assert.ok(resolvePreviewPath("/styles.css"));
  assert.equal(resolvePreviewPath("/../../etc/passwd"), null);
  assert.equal(resolvePreviewPath("/.env"), null);
  assert.equal(resolvePreviewPath("/.git/config"), null);
  assert.equal(resolvePreviewPath("/functions/api/owner-login.js"), null);
  assert.equal(resolvePreviewPath("/scripts/preview-server.mjs"), null);
  assert.equal(resolvePreviewPath("/README.md"), null);
});

test("preview server serves the app and rejects private project files", async () => {
  const server = createPreviewServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    const home = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(home.status, 200);
    assert.match(home.headers.get("content-type"), /text\/html/);
    assert.match(await home.text(), /Agency AI OS/);
    const secret = await fetch(`http://127.0.0.1:${port}/.env`);
    assert.equal(secret.status, 404);
    const api = await fetch(`http://127.0.0.1:${port}/functions/api/owner-login.js`);
    assert.equal(api.status, 404);
    const post = await fetch(`http://127.0.0.1:${port}/index.html`, { method: "POST" });
    assert.equal(post.status, 405);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
