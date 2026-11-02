import { ownerSession, sameOrigin, jsonResponse } from "../_lib/owner-auth.js";

function redirect(request, status) {
  return Response.redirect(new URL("/?drive=" + encodeURIComponent(status), request.url).toString(), 302);
}

export async function onRequestGet({ request, env }) {
  if (!sameOrigin(request)) return jsonResponse({ ok: false, error: "Origen de solicitud no válido." }, 403);
  if (!(await ownerSession(request, env))) return new Response("Inicia sesión en el Workspace privado y vuelve a conectar Google Drive.", { status: 401, headers: { "cache-control": "no-store" } });
  if (env.GOOGLE_DRIVE_ENABLED !== "true") return new Response("Google Drive está desactivado. No se intercambiarán tokens ni se contactará con Google.", { status: 503, headers: { "cache-control": "no-store" } });
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!state || !env.AGENCY_KV) return new Response("No se recibió un estado OAuth válido.", { status: 400, headers: { "cache-control": "no-store" } });
  const stateKey = "drive_oauth_state:" + state;
  try {
    if (!(await env.AGENCY_KV.get(stateKey))) return new Response("El estado OAuth ha caducado o no coincide. Vuelve a iniciar la conexión.", { status: 400, headers: { "cache-control": "no-store" } });
    await env.AGENCY_KV.delete(stateKey);
  } catch {
    return new Response("No se pudo validar el estado OAuth. No se han intercambiado tokens.", { status: 503, headers: { "cache-control": "no-store" } });
  }
  if (url.searchParams.has("error")) return redirect(request, "error");
  if (!code) return new Response("No se recibió código de Google.", { status: 400, headers: { "cache-control": "no-store" } });

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code"
      }),
      signal: AbortSignal.timeout(12000)
    });
    const tokenData = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !tokenData.refresh_token) {
      console.error(JSON.stringify({ event: "drive_oauth_callback_failed", status: tokenRes.status, providerError: tokenData.error || "refresh_token_missing" }));
      return redirect(request, "error");
    }
    await env.AGENCY_KV.put("google_refresh_token", tokenData.refresh_token);
    await env.AGENCY_KV.put("drive_connected_at", new Date().toISOString());
    return redirect(request, "success");
  } catch (error) {
    console.error(JSON.stringify({ event: "drive_oauth_callback_failed", errorName: error?.name || "Error" }));
    return redirect(request, "error");
  }
}
