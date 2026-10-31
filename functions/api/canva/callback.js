import { finishCanvaOAuth, canvaJson } from "../../_lib/canva-mcp.js";
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  try {
    const result = await finishCanvaOAuth(env, url.origin, url.searchParams);
    return Response.redirect(new URL("/creative-engine.html?canva=connected", url.origin).toString(), 303);
  } catch (error) {
    console.error(JSON.stringify({ event: "canva_oauth_callback_error", message: String(error?.message || error).slice(0, 180) }));
    return canvaJson({ ok: false, error: "No se ha podido completar la autorización de Canva. Vuelve a Agency AI OS e inténtalo de nuevo." }, 400);
  }
}
