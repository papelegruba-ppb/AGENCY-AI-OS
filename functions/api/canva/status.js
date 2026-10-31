import { jsonResponse } from "../../_lib/owner-auth.js";
import { decryptCanvaTokens } from "../../_lib/canva-mcp.js";

export async function onRequestGet({ env }) {
  const credentialsConfigured = Boolean(env.CANVA_CLIENT_ID && env.CANVA_CLIENT_SECRET);
  const encryptionConfigured = String(env.CANVA_TOKEN_ENCRYPTION_KEY || "").length >= 32;
  const storageConfigured = Boolean(env.AGENCY_KV);
  let connected = false, toolsCount = 0, tokenState = "not_connected";
  if (storageConfigured && encryptionConfigured) {
    try {
      const raw = await env.AGENCY_KV.get("canva-oauth:tokens");
      const tokens = await decryptCanvaTokens(env, raw);
      connected = Boolean(tokens?.access_token || tokens?.refresh_token);
      tokenState = connected ? "encrypted_tokens_present" : "not_connected";
      const tools = JSON.parse(await env.AGENCY_KV.get("canva-oauth:tools") || "[]");
      toolsCount = Array.isArray(tools) ? tools.length : 0;
    } catch {
      tokenState = "token_record_unreadable";
    }
  }
  return jsonResponse({
    ok: true, credentialsConfigured, encryptionConfigured, storageConfigured,
    connected, toolsCount, tokenState, integration: "canva-mcp",
    note: connected
      ? "Hay tokens cifrados almacenados; la validez remota debe confirmarse al invocar una herramienta."
      : "No se ha confirmado una sesión OAuth utilizable."
  });
}
