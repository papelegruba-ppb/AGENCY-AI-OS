import { ownerSession, sameOrigin } from "../../_lib/owner-auth.js";
import { requireIntegration } from "../../_lib/integrations.js";

const ENDPOINTS = {
  "domain-rating": "domain-rating",
  "ai-responses-count": "ai-responses-count",
  "backlinks-stats": "backlinks-stats"
};
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" }
});

export async function onRequestGet({ request, env }) {
  if (!sameOrigin(request) || !(await ownerSession(request, env))) return json({ ok:false, code:"OWNER_AUTH_REQUIRED", error:"Inicia sesión como propietario para consultar integraciones globales." }, 401);
  const blocked = requireIntegration(env, "ahrefs");
  if (blocked) return blocked;
  if (!env.AGENCY_KV) return json({ ok:false, error:"Falta el binding AGENCY_KV para caché segura." }, 503);
  const url = new URL(request.url);
  const metric = url.searchParams.get("metric") || "domain-rating";
  const endpoint = ENDPOINTS[metric];
  if (!endpoint) return json({ ok:false, error:"Métrica Ahrefs no permitida." }, 400);

  const target = (url.searchParams.get("target") || "").trim();
  if (!target || target.length > 253 || /[\s?#]/.test(target)) return json({ ok:false, error:"Indica un dominio válido en target, sin protocolo ni ruta." }, 400);
  const normalizedTarget = target.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  if (!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(normalizedTarget)) return json({ ok:false, error:"Dominio no válido." }, 400);

  const params = new URLSearchParams();
  params.set("target", normalizedTarget);
  if (metric !== "domain-rating") {
    const mode = url.searchParams.get("mode") || "subdomains";
    if (!["exact","prefix","domain","subdomains"].includes(mode)) return json({ ok:false, error:"Modo de alcance no válido." }, 400);
    params.set("mode", mode);
    const protocol = url.searchParams.get("protocol") || "both";
    if (!["both","http","https"].includes(protocol)) return json({ ok:false, error:"Protocolo no válido." }, 400);
    params.set("protocol", protocol);
  }
  const select = url.searchParams.get("select") || "all_platforms,chatgpt,google_ai_overviews,google_ai_overviews_keywords,google_ai_mode,gemini,perplexity,copilot,grok";
  if (metric === "ai-responses-count") params.set("select", select);
  const requestedDate = url.searchParams.get("date");
  const date = requestedDate || new Date().toISOString().slice(0,10);
  if ((metric === "domain-rating" || metric === "backlinks-stats") && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ ok:false, error:"La fecha debe tener formato YYYY-MM-DD." }, 400);
  if (metric === "domain-rating" || metric === "backlinks-stats" || (metric === "ai-responses-count" && requestedDate)) params.set("date", date);
  const limit = url.searchParams.get("limit");
  if (limit && /^\d{1,3}$/.test(limit)) params.set("limit", String(Math.min(100, Math.max(1, Number(limit)))));

  const keyFingerprint = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(env.AHREFS_API_KEY));
  const keyScope = [...new Uint8Array(keyFingerprint)].slice(0,12).map(v=>v.toString(16).padStart(2,"0")).join("");
  const cacheKey = "global-integration-cache:ahrefs:" + keyScope + ":" + metric + ":" + params.toString();
  try {
    const cached = await env.AGENCY_KV.get(cacheKey);
    if (cached) return new Response(cached, { headers: { "content-type":"application/json; charset=utf-8", "cache-control":"private, max-age=300", "x-data-source":"cache" } });
    const upstream = await fetch("https://api.ahrefs.com/v3/site-explorer/" + endpoint + "?" + params.toString(), {
      headers: { "Authorization": "Bearer " + env.AHREFS_API_KEY, "Accept":"application/json" }
    });
    const body = await upstream.text();
    if (!upstream.ok) return json({ ok:false, provider:"ahrefs", status:upstream.status, error: upstream.status === 401 ? "Ahrefs rechazó la clave." : upstream.status === 429 ? "Cuota o unidades API de Ahrefs agotadas." : "Ahrefs no pudo completar la consulta.", detail: body.slice(0, 500) }, upstream.status === 429 ? 429 : 502);
    let data;
    try { data = JSON.parse(body); } catch { return json({ ok:false, error:"Ahrefs devolvió una respuesta no JSON." }, 502); }
    const result = JSON.stringify({ ok:true, provider:"ahrefs", metric, target:normalizedTarget, fetchedAt:new Date().toISOString(), data });
    await env.AGENCY_KV.put(cacheKey, result, { expirationTtl: 21600 });
    return new Response(result, { headers: { "content-type":"application/json; charset=utf-8", "cache-control":"private, max-age=300", "x-data-source":"live" } });
  } catch {
    return json({ ok:false, error:"No se pudo consultar Ahrefs. Comprueba AGENCY_KV y la conectividad del servicio." }, 502);
  }
}
