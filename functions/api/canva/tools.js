import { withCanvaClient, canvaJson } from "../../_lib/canva-mcp.js";

export async function onRequestGet({ request, env }) {
  try {
    const tools = await withCanvaClient(env, new URL(request.url).origin, async client => {
      const result = await client.listTools();
      return Array.isArray(result?.tools) ? result.tools : [];
    });
    await env.AGENCY_KV.put("canva-oauth:tools", JSON.stringify(tools));
    return canvaJson({ ok: true, tools });
  } catch (error) {
    console.error(JSON.stringify({
      event: "canva_tools_error",
      name: String(error?.name || "Error").slice(0, 80),
      message: String(error?.message || error).slice(0, 160)
    }));
    return canvaJson({ ok: false, error: "No se han podido recuperar las herramientas de Canva. Comprueba AGENCY_KV y vuelve a autorizar si es necesario." }, 502);
  }
}
