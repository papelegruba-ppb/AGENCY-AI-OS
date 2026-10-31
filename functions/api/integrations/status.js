import { integrationStatus } from "../_lib/integrations.js";

export async function onRequestGet({ env }) {
  return new Response(JSON.stringify({
    ok: true,
    policy: "cost-zero-by-default",
    message: "Las integraciones externas están desactivadas por defecto. No se realizarán llamadas hasta habilitar cada servicio de forma expresa.",
    integrations: integrationStatus(env)
  }), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" }
  });
}
