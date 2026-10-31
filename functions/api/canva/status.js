import { jsonResponse } from "../../_lib/owner-auth.js";
export async function onRequestGet({ env }) {
  const credentialsConfigured = Boolean(env.CANVA_CLIENT_ID && env.CANVA_CLIENT_SECRET);
  const storageConfigured = Boolean(env.AGENCY_KV);
  let connected = false, toolsCount = 0;
  if (storageConfigured) {
    try {
      const tokens = await env.AGENCY_KV.get("canva-oauth:tokens");
      connected = Boolean(tokens && JSON.parse(tokens)?.access_token);
      const tools = JSON.parse(await env.AGENCY_KV.get("canva-oauth:tools") || "[]");
      toolsCount = Array.isArray(tools) ? tools.length : 0;
    } catch {}
  }
  return jsonResponse({ ok: true, credentialsConfigured, storageConfigured, connected, toolsCount, integration: "canva-mcp" });
}
