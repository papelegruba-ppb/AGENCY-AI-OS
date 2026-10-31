import { withCanvaClient, canvaJson } from "../../_lib/canva-mcp.js";
const clean = value => String(value || "").trim().slice(0, 128);
export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return canvaJson({ ok: false, error: "JSON no válido." }, 400); }
  const name = clean(body?.name);
  const args = body?.arguments && typeof body.arguments === "object" && !Array.isArray(body.arguments) ? body.arguments : {};
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) return canvaJson({ ok: false, error: "Nombre de herramienta no válido." }, 400);
  try {
    const result = await withCanvaClient(env, new URL(request.url).origin, async client => {
      const listed = await client.listTools();
      if (!(listed.tools || []).some(tool => tool.name === name)) throw new Error("La herramienta solicitada no está disponible en Canva MCP.");
      return client.callTool({ name, arguments: args });
    });
    return canvaJson({ ok: true, result });
  } catch (error) {
    console.error(JSON.stringify({ event: "canva_tool_call_error", tool: name, message: String(error?.message || error).slice(0, 180) }));
    return canvaJson({ ok: false, error: "Canva no pudo completar esa operación. Revisa la conexión, los permisos y los parámetros." }, 502);
  }
}
