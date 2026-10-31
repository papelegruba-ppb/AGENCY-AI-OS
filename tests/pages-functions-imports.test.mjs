import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "functions");

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (entry.isFile() && entry.name.endsWith(".js")) files.push(full);
  }
  return files;
}

test("all relative imports in Pages Functions resolve to existing files", async () => {
  const files = await walk(root);
  const missing = [];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    const imports = /\\bfrom\\s*["']([^"']+)["']|\\bimport\\s*["']([^"']+)["']/g;
    for (const match of source.matchAll(imports)) {
      const specifier = match[1] || match[2];
      if (!specifier.startsWith(".")) continue;
      const target = path.resolve(path.dirname(file), specifier);
      try { await access(target); }
      catch { missing.push(`${path.relative(process.cwd(), file)} -> ${specifier}`); }
    }
  }
  assert.deepEqual(missing, [], `Unresolved Pages Functions imports:\\n${missing.join("\\n")}`);
});
