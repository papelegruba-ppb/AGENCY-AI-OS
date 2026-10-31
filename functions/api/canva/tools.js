import { withCanvaClient, canvaJson } from "../../_lib/canva-mcp.js";

function diagnostic(error) {
  const message = String(error?.message || error || "Unknown error")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/(access_token|refresh_token|client_secret|code_verifier|code)=([^&\s]+)/gi, "$1=[redacted]")
    .slice(0, 240);
  return { diagnosticId: crypto.randomUUID(), errorName: String(error?.name || "Error").slice(0, 80), message };
}

export async function onRequestGet({ request, env }) {
  try {
    const tools = await withCanvaClient(env, new URL(request.url).origin, async client => (await client.listTools()).tools || []);
    await env.AGENCY_KV.put("canva-oauth:tools", JSON.stringify(tools));
    return canvaJson({ ok: true, tools });
  } catch (error) {
    const details = diagnostic(error);
    console.error(JSON.stringify({ event: "canva_tools_error", ...details }));
    return canvaJson({
      ok: false,
      error: "No se han podido recuperar las herramientas de Canva.",
      diagnosticId: details.diagnosticId,
      diagnostic: { errorName: details.errorName, message: details.message }
    }, 502);
  }
}
