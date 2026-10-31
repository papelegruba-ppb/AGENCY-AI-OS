import { disconnectCanva, canvaJson } from "../../_lib/canva-mcp.js";
export async function onRequestPost({ env }) {
  try { await disconnectCanva(env); return canvaJson({ ok: true, disconnected: true }); }
  catch { return canvaJson({ ok: false, error: "No se pudo borrar la sesión Canva." }, 503); }
}
