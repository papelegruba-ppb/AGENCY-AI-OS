import { ownerSession, sameOrigin, jsonResponse } from "../_lib/owner-auth.js";

const MAX_PROJECTS = 100;
const MAX_PROJECT_BYTES = 900_000;
const OWNER_ID = "owner";

function validId(value) {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
}
function normalizeProject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const id = String(value.id || "");
  if (!validId(id)) return null;
  const json = JSON.stringify(value);
  if (new TextEncoder().encode(json).byteLength > MAX_PROJECT_BYTES) return null;
  const now = new Date().toISOString();
  return {
    id,
    name: String(value.name || "Proyecto sin nombre").slice(0, 160),
    data_json: json,
    created_at: String(value.createdAt || now).slice(0, 40),
    updated_at: String(value.updatedAt || value.createdAt || now).slice(0, 40)
  };
}
async function authorize(context) {
  if (!sameOrigin(context.request)) return jsonResponse({ ok: false, code: "ORIGIN_NOT_ALLOWED" }, 403);
  if (!(await ownerSession(context.request, context.env))) return jsonResponse({ ok: false, code: "OWNER_AUTH_REQUIRED", error: "Inicia sesión en tu Workspace privado." }, 401);
  if (!context.env.AGENCY_DB) return jsonResponse({ ok: false, code: "D1_NOT_CONFIGURED", error: "Falta configurar el binding AGENCY_DB de Cloudflare D1." }, 503);
  return null;
}
export async function onRequestGet(context) {
  const denied = await authorize(context);
  if (denied) return denied;
  try {
    const { results = [] } = await context.env.AGENCY_DB.prepare(
      "SELECT data_json FROM projects WHERE owner_id = ? ORDER BY updated_at DESC LIMIT ?"
    ).bind(OWNER_ID, MAX_PROJECTS).all();
    const projects = results.map(row => {
      try { return JSON.parse(row.data_json); } catch { return null; }
    }).filter(Boolean);
    return jsonResponse({ ok: true, projects, storage: "cloudflare-d1" });
  } catch {
    return jsonResponse({ ok: false, code: "PROJECT_STORAGE_ERROR", error: "No se pudieron cargar los proyectos de D1." }, 503);
  }
}
export async function onRequestPost(context) {
  const denied = await authorize(context);
  if (denied) return denied;
  let body;
  try {
    const raw = await context.request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_PROJECT_BYTES + 2048) return jsonResponse({ ok: false, error: "El proyecto supera el tamaño permitido." }, 413);
    body = JSON.parse(raw);
  } catch { return jsonResponse({ ok: false, error: "JSON no válido." }, 400); }
  const project = normalizeProject(body?.project);
  if (!project) return jsonResponse({ ok: false, error: "Proyecto inválido o demasiado grande." }, 400);
  try {
    await context.env.AGENCY_DB.prepare(
      "INSERT INTO projects (id, owner_id, name, data_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, data_json=excluded.data_json, updated_at=excluded.updated_at WHERE projects.owner_id=excluded.owner_id"
    ).bind(project.id, OWNER_ID, project.name, project.data_json, project.created_at, project.updated_at).run();
    await context.env.AGENCY_DB.prepare(
      "INSERT INTO project_events (id, project_id, owner_id, event_type, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(crypto.randomUUID(), project.id, OWNER_ID, "project_saved", JSON.stringify({ updatedAt: project.updated_at }), new Date().toISOString()).run();
    return jsonResponse({ ok: true, id: project.id, updatedAt: project.updated_at, storage: "cloudflare-d1" });
  } catch {
    return jsonResponse({ ok: false, code: "PROJECT_STORAGE_ERROR", error: "No se pudo guardar el proyecto en D1." }, 503);
  }
}
export async function onRequestDelete(context) {
  const denied = await authorize(context);
  if (denied) return denied;
  const id = new URL(context.request.url).searchParams.get("id") || "";
  if (!validId(id)) return jsonResponse({ ok: false, error: "Identificador inválido." }, 400);
  try {
    await context.env.AGENCY_DB.prepare("DELETE FROM projects WHERE id = ? AND owner_id = ?").bind(id, OWNER_ID).run();
    return jsonResponse({ ok: true, id });
  } catch {
    return jsonResponse({ ok: false, code: "PROJECT_STORAGE_ERROR", error: "No se pudo eliminar el proyecto." }, 503);
  }
}
