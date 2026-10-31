import { connectCanva, canvaJson } from "../../_lib/canva-mcp.js";

export async function onRequestGet({ request, env }) {
  try {
    const result = await connectCanva(env, new URL(request.url).origin);
    if (result?.authorizationUrl) return Response.redirect(result.authorizationUrl, 302);
    const tools = Array.isArray(result?.tools) ? result.tools : [];
    return canvaJson({ ok: true, connected: true, tools: tools.map(tool => tool.name).filter(Boolean) });
  } catch (error) {
    console.error(JSON.stringify({
      event: "canva_oauth_start_error",
      name: String(error?.name || "Error").slice(0, 80),
      message: String(error?.message || error).slice(0, 180)
    }));
    return canvaJson({ ok: false, error: "No se pudo iniciar OAuth con Canva. Revisa credenciales, Redirect URL, AGENCY_KV y configuración MCP." }, 502);
  }
}
