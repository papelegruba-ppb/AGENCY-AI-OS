import { withCanvaClient, canvaJson } from "../../_lib/canva-mcp.js";
export async function onRequestGet({ request, env }) {
  try {
    const tools = await withCanvaClient(env, new URL(request.url).origin, async client => (await client.listTools()).tools || []);
    await env.AGENCY_KV.put("canva-oauth:tools", JSON.stringify(tools));
    return canvaJson({ ok: true, tools });
  } catch (error) {
    console.error(JSON.stringify({ event: "canva_tools_error", message: String(error?.message || error).slice(0, 160) }));
    return canvaJson({ ok: false, error: "No se han podido recuperar las herramientas de Canva. Puede ser necesario volver a autorizar." }, 502);
  }
}
