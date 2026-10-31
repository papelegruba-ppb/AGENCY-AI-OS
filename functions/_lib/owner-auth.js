const SESSION_COOKIE = "__Host-agency_owner";
const SESSION_TTL = 60 * 60 * 12;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" }
  });
}
function cookieValue(request, name) {
  const cookies = request.headers.get("Cookie") || "";
  for (const part of cookies.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return "";
}
async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2, "0")).join("");
}
export function jsonResponse(data, status = 200) { return json(data, status); }
export function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  return !origin || origin === new URL(request.url).origin;
}
export async function ownerSession(request, env) {
  if (!env.AGENCY_KV) return false;
  const token = cookieValue(request, SESSION_COOKIE);
  if (!/^[a-f0-9]{64}$/.test(token)) return false;
  try { return (await env.AGENCY_KV.get("owner-session:" + await sha256(token))) === "active"; }
  catch { return false; }
}
export async function requireOwner(context) {
  if (!(await ownerSession(context.request, context.env))) {
    return json({ ok: false, error: "Acceso privado requerido.", code: "OWNER_AUTH_REQUIRED" }, 401);
  }
  return context.next();
}
export async function ownerLogin(request, env) {
  if (request.method !== "POST" || !sameOrigin(request)) return json({ ok: false, error: "Petición no válida." }, 403);
  if (!env.OWNER_PASSWORD || !env.AGENCY_KV) return json({ ok: false, error: "Falta configurar OWNER_PASSWORD o el binding AGENCY_KV en Cloudflare." }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "Formato JSON no válido." }, 400); }
  const password = String(body?.password || "").slice(0, 512);
  if (!password) return json({ ok: false, error: "Introduce tu contraseña." }, 400);
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const attemptKey = "owner-login-attempts:" + await sha256(ip);
  let attempts = 0;
  try {
    attempts = Number.parseInt(await env.AGENCY_KV.get(attemptKey) || "0", 10) || 0;
    if (attempts >= 8) return json({ ok: false, error: "Demasiados intentos. Espera 15 minutos antes de volver a intentarlo." }, 429);
  } catch { return json({ ok: false, error: "No se pudo comprobar el límite de intentos. Acceso bloqueado por seguridad." }, 503); }
  const supplied = await sha256(password);
  const expected = await sha256(String(env.OWNER_PASSWORD));
  if (supplied !== expected) {
    try { await env.AGENCY_KV.put(attemptKey, String(attempts + 1), { expirationTtl: 900 }); } catch {}
    return json({ ok: false, error: "Contraseña incorrecta." }, 401);
  }
  try {
    await env.AGENCY_KV.delete(attemptKey);
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const token = [...bytes].map(v => v.toString(16).padStart(2, "0")).join("");
    await env.AGENCY_KV.put("owner-session:" + await sha256(token), "active", { expirationTtl: SESSION_TTL });
    return new Response(JSON.stringify({ ok: true, expiresIn: SESSION_TTL }), {
      headers: {
        "content-type": "application/json; charset=utf-8", "cache-control": "no-store",
        "set-cookie": SESSION_COOKIE + "=" + token + "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=" + SESSION_TTL
      }
    });
  } catch { return json({ ok: false, error: "No se pudo crear la sesión privada." }, 503); }
}
export async function ownerLogout(request, env) {
  if (!sameOrigin(request)) return json({ ok: false, error: "Petición no válida." }, 403);
  const token = cookieValue(request, SESSION_COOKIE);
  if (/^[a-f0-9]{64}$/.test(token) && env.AGENCY_KV) {
    try { await env.AGENCY_KV.delete("owner-session:" + await sha256(token)); } catch {}
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store",
      "set-cookie": SESSION_COOKIE + "=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0" }
  });
}
