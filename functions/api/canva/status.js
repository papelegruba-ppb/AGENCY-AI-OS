import { jsonResponse } from "../../_lib/owner-auth.js";
export async function onRequestGet({ env }) {
  const credentialsConfigured = Boolean(env.CANVA_CLIENT_ID && env.CANVA_CLIENT_SECRET);
  const encryptionConfigured = String(env.CANVA_TOKEN_ENCRYPTION_KEY || "").length >= 32;
  const storageConfigured = Boolean(env.AGENCY_KV);
  let connected = false, toolsCount = 0;
  if (storageConfigured) {
    try {
      const tokenRecord = await env.AGENCY_KV.get("canva-oauth:tokens");
      connected = Boolean(tokenRecord);
      const tools = JSON.parse(await env.AGENCY_KV.get("canva-oauth:tools") || "[]");
      toolsCount = Array.isArray(tools) ? tools.length : 0;
    } catch {}
  }
  return jsonResponse({ ok: true, credentialsConfigured, encryptionConfigured, storageConfigured, connected, toolsCount, integration: "canva-mcp" });
}
