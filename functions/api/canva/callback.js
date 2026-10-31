import { finishCanvaOAuth } from "../../_lib/canva-mcp.js";
import { sanitizeCanvaDiagnosticMessage } from "../../_lib/canva-diagnostics.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const destination = new URL("/", url.origin);
  destination.searchParams.set("integration", "canva");
  try {
    await finishCanvaOAuth(env, url.origin, url.searchParams);
    destination.searchParams.set("status", "connected");
    return Response.redirect(destination.toString(), 303);
  } catch (error) {
    const requestId = crypto.randomUUID();
    const diagnostic = {
      event: "canva_oauth_callback_error",
      phase: String(error?.canvaPhase || "oauth_callback").slice(0, 64),
      name: String(error?.name || "Error").slice(0, 80),
      message: sanitizeCanvaDiagnosticMessage(error?.message || error, env),
      upstreamStatus: Number.isInteger(error?.status) ? error.status : null,
      requestId,
      timestamp: new Date().toISOString()
    };
    console.error(JSON.stringify(diagnostic));
    destination.searchParams.set("status", "error");
    destination.searchParams.set("requestId", requestId);
    return Response.redirect(destination.toString(), 303);
  }
}
