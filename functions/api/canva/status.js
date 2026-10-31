import { jsonResponse } from "../../_lib/owner-auth.js";
export async function onRequestGet({ env }) {
  const credentialsConfigured = Boolean(env.CANVA_CLIENT_ID && env.CANVA_CLIENT_SECRET);
  const storageConfigured = Boolean(env.AGENCY_KV);
  let connected = false;
  if (storageConfigured) {
    try { connected = Boolean(await env.AGENCY_KV.get("canva_connection_status")); } catch {}
  }
  return jsonResponse({
    ok: true,
    credentialsConfigured,
    storageConfigured,
    connected,
    integration: "canva-mcp",
    message: connected ? "Existe una sesión Canva guardada." : "Credenciales detectadas; la autorización OAuth y el cliente MCP aún no están completados."
  });
}
