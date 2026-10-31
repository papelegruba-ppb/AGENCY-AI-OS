import { jsonResponse, ownerSession } from "../_lib/owner-auth.js";
export async function onRequestGet({ request, env }) {
  if (!env.OWNER_PASSWORD || !env.AGENCY_KV) return jsonResponse({ ok: true, configured: false, authenticated: false });
  return jsonResponse({ ok: true, configured: true, authenticated: await ownerSession(request, env) });
}
