import { integrationStatus } from "../_lib/integrations.js";
import { decryptCanvaTokens } from "../_lib/canva-mcp.js";

export async function onRequestGet({ env }) {
  const integrations = integrationStatus(env);
  const canva = integrations.find(item => item.id === "canva");
  if (canva) {
    canva.connected = false;
    canva.toolsCount = 0;
    canva.status = canva.enabled ? "oauth_pending" : "needs_configuration";
    if (canva.enabled) {
      try {
        const tokens = await decryptCanvaTokens(env, await env.AGENCY_KV.get("canva-oauth:tokens"));
        canva.connected = Boolean(tokens?.access_token || tokens?.refresh_token);
        const tools = JSON.parse(await env.AGENCY_KV.get("canva-oauth:tools") || "[]");
        canva.toolsCount = Array.isArray(tools) ? tools.length : 0;
        canva.status = canva.connected ? "connected_tokens_stored" : "oauth_pending";
      } catch {
        canva.status = "token_record_unreadable";
      }
    }
  }
  return new Response(JSON.stringify({
    ok: true,
    policy: "cost-zero-by-default",
    message: "Las integraciones sujetas a cuota o facturación permanecen desactivadas por defecto. Canva Connect no requiere un flag de facturación; la disponibilidad depende de OAuth, scopes y plan de Canva.",
    integrations
  }), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" }
  });
}
