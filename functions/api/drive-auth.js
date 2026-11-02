import { ownerSession, sameOrigin, jsonResponse } from "../_lib/owner-auth.js";

export async function onRequestGet({ request, env }) {
  if (!sameOrigin(request)) return jsonResponse({ ok: false, error: "Origen de solicitud no válido." }, 403);
  if (!(await ownerSession(request, env))) return jsonResponse({ ok: false, error: "Inicia sesión en el Workspace privado.", code: "OWNER_AUTH_REQUIRED" }, 401);
  if (env.GOOGLE_DRIVE_ENABLED !== "true") return new Response("Google Drive está desactivado. No se iniciará OAuth ni se contactará con Google.", { status: 503, headers: { "cache-control": "no-store" } });
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_REDIRECT_URI || !env.AGENCY_KV) return jsonResponse({ ok: false, error: "Falta configuración OAuth de Google Drive.", code: "DRIVE_OAUTH_CONFIG_MISSING" }, 503);
  const state = crypto.randomUUID() + crypto.randomUUID();
  try {
    await env.AGENCY_KV.put("drive_oauth_state:" + state, "1", { expirationTtl: 600 });
  } catch {
    return jsonResponse({ ok: false, error: "No se pudo iniciar el estado seguro de OAuth.", code: "DRIVE_OAUTH_STATE_UNAVAILABLE" }, 503);
  }
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", env.GOOGLE_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/drive.file");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return Response.redirect(url.toString(), 302);
}
