import { connectCanva, canvaJson } from "../../_lib/canva-mcp.js";

function diagnostic(error) {
  const message = String(error?.message || error || "Unknown error")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/(access_token|refresh_token|client_secret|code_verifier|code)=([^&\s]+)/gi, "$1=[redacted]")
    .slice(0, 240);
  return { diagnosticId: crypto.randomUUID(), errorName: String(error?.name || "Error").slice(0, 80), message };
}

export async function onRequestGet({ request, env }) {
  try {
    const result = await connectCanva(env, new URL(request.url).origin);
    if (result.authorizationUrl) return Response.redirect(result.authorizationUrl, 302);
    return canvaJson({ ok: true, connected: true, tools: result.tools.map(t => t.name) });
  } catch (error) {
    const details = diagnostic(error);
    console.error(JSON.stringify({ event: "canva_oauth_start_error", ...details }));
    return canvaJson({
      ok: false,
      error: "No se pudo iniciar OAuth con Canva.",
      diagnosticId: details.diagnosticId,
      diagnostic: { errorName: details.errorName, message: details.message }
    }, 502);
  }
}
