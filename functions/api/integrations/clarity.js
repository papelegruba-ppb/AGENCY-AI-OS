import { requireIntegration } from "../../_lib/integrations.js";

const ALLOWED_DIMENSIONS = new Set(["Browser","Device","Country/Region","OS","Source","Medium","Campaign","Channel","URL"]);
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type":"application/json; charset=utf-8", "cache-control":"no-store", "x-content-type-options":"nosniff" }
});

export async function onRequestGet({ request, env }) {
  const blocked = requireIntegration(env, "clarity");
  if (blocked) return blocked;
  if (!env.AGENCY_KV) return json({ ok:false, error:"Microsoft Clarity requiere el binding AGENCY_KV para caché y control de cuota." }, 503);
  const url = new URL(request.url);
  const days = Number(url.searchParams.get("numOfDays") || 1);
  if (![1,2,3].includes(days)) return json({ ok:false, error:"numOfDays solo admite 1, 2 o 3." }, 400);
  const dimensions = [1,2,3].map(n => url.searchParams.get("dimension"+n)).filter(Boolean);
  if (dimensions.some(d => !ALLOWED_DIMENSIONS.has(d))) return json({ ok:false, error:"Dimensión no admitida por Clarity." }, 400);
  if (new Set(dimensions).size !== dimensions.length) return json({ ok:false, error:"No repitas dimensiones." }, 400);

  const cacheKey = "global-integration-cache:clarity:" + days + ":" + dimensions.join("|");
  try {
    const cached = await env.AGENCY_KV.get(cacheKey);
    if (cached) return new Response(cached, { headers: { "content-type":"application/json; charset=utf-8", "cache-control":"private, max-age=300", "x-data-source":"cache" } });

    // Best-effort daily guard. KV is eventually consistent; it is not an atomic hard quota.
    const dayKey = "global-integration-quota:clarity:" + new Date().toISOString().slice(0,10);
    const used = Number(await env.AGENCY_KV.get(dayKey) || 0);
    if (used >= 8) return json({ ok:false, code:"LOCAL_DAILY_GUARD", error:"Límite preventivo diario alcanzado (8 llamadas). Reutiliza la caché o espera al siguiente día UTC." }, 429);
    await env.AGENCY_KV.put(dayKey, String(used + 1), { expirationTtl: 172800 });

    const params = new URLSearchParams({ numOfDays:String(days) });
    dimensions.forEach((dimension, index) => params.set("dimension"+(index+1), dimension));
    const upstream = await fetch("https://www.clarity.ms/export-data/api/v1/project-live-insights?" + params.toString(), {
      headers: { "Authorization":"Bearer " + env.CLARITY_API_TOKEN, "Content-Type":"application/json", "Accept":"application/json" }
    });
    const body = await upstream.text();
    if (!upstream.ok) return json({ ok:false, provider:"microsoft-clarity", status:upstream.status, error: upstream.status === 401 ? "Token Clarity inválido o caducado." : upstream.status === 403 ? "El token no tiene permisos para exportar este proyecto." : upstream.status === 429 ? "Clarity ha alcanzado su límite de 10 llamadas por proyecto y día." : "Clarity no pudo completar la exportación.", detail:body.slice(0,400) }, upstream.status === 429 ? 429 : 502);
    let data;
    try { data = JSON.parse(body); } catch { return json({ ok:false, error:"Clarity devolvió una respuesta no JSON." }, 502); }
    const result = JSON.stringify({ ok:true, provider:"microsoft-clarity", numOfDays:days, dimensions, timezone:"UTC", fetchedAt:new Date().toISOString(), data });
    await env.AGENCY_KV.put(cacheKey, result, { expirationTtl: 14400 });
    return new Response(result, { headers: { "content-type":"application/json; charset=utf-8", "cache-control":"private, max-age=300", "x-data-source":"live" } });
  } catch {
    return json({ ok:false, error:"No se pudo consultar Clarity. Comprueba AGENCY_KV y la conectividad del servicio." }, 502);
  }
}
