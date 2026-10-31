import { connectCanva, canvaJson } from "../../_lib/canva-mcp.js";
import { sanitizeCanvaDiagnosticMessage } from "../../_lib/canva-diagnostics.js";

export async function onRequestGet({ request, env }) {
  try {
    const result = await connectCanva(env, new URL(request.url).origin);
    if (result?.authorizationUrl) return Response.redirect(result.authorizationUrl, 302);
    const tools = Array.isArray(result?.tools) ? result.tools : [];
    return canvaJson({ ok: true, connected: true, tools: tools.map(tool => tool.name).filter(Boolean) });
  } catch (error) {
    const diagnostic = {
      event: "canva_oauth_start_error",
      phase: String(error?.canvaPhase || "unclassified").slice(0, 64),
      name: String(error?.name || "Error").slice(0, 80),
      message: sanitizeCanvaDiagnosticMessage(error?.message || error, env),
      upstreamStatus: Number.isInteger(error?.status) ? error.status : null,
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };
    console.error(JSON.stringify(diagnostic));
    // This endpoint is owner-authenticated by functions/api/canva/_middleware.js.
    // Never include stack traces, request headers, OAuth parameters, or tokens.
    return canvaJson({
      ok: false,
      error: "No se pudo iniciar OAuth con Canva.",
      diagnostic: {
        phase: diagnostic.phase,
        type: diagnostic.name,
        message: diagnostic.message,
        upstreamStatus: diagnostic.upstreamStatus,
        requestId: diagnostic.requestId,
        timestamp: diagnostic.timestamp
      }
    }, 502);
  }
}
