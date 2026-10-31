import { connectCanva, canvaJson } from "../../_lib/canva-mcp.js";
export async function onRequestGet({ request, env }) {
  try {
    const result = await connectCanva(env, new URL(request.url).origin);
    if (result.authorizationUrl) return Response.redirect(result.authorizationUrl, 302);
    return canvaJson({ ok: true, connected: true, tools: result.tools.map(t => t.name) });
  } catch (error) {
    console.error(JSON.stringify({ event: "canva_oauth_start_error", message: String(error?.message || error).slice(0, 180) }));
    return canvaJson({ ok: false, error: "No se pudo iniciar OAuth con Canva. Revisa credenciales, Redirect URL y configuración MCP." }, 502);
  }
}
