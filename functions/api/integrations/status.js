import { integrationStatus } from "../_lib/integrations.js";

export async function onRequestGet({ env }) {
  const integrations = integrationStatus(env);
  const canva = integrations.find(item => item.id === "canva");
  if (canva && env.AGENCY_KV) {
    try {
      canva.connected = Boolean(await env.AGENCY_KV.get("canva-oauth:tokens"));
      canva.toolsCount = JSON.parse(await env.AGENCY_KV.get("canva-oauth:tools") || "[]").length;
      canva.status = canva.connected ? "connected" : (canva.enabled ? "oauth_pending" : "needs_configuration");
    } catch { canva.connected = false; canva.status = "status_unavailable"; }
  }
  return new Response(JSON.stringify({
    ok: true,
    policy: "cost-zero-by-default",
    message: "Las integraciones externas están desactivadas por defecto. No se realizarán llamadas hasta habilitar cada servicio de forma expresa.",
    integrations
  }), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" }
  });
}
