const API_BASE = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" }
  });
}

function isPublicWebUrl(value) {
  let u;
  try { u = new URL(value); } catch { return false; }
  if (!["http:", "https:"].includes(u.protocol) || u.username || u.password) return false;
  const host = u.hostname.toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return false;
  // Block literal IPv4/IPv6 targets and local hostnames; use a public DNS hostname.
  if (host.startsWith("[") || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return false;
  if (!host.includes(".") || host.includes("..")) return false;
  return true;
}

export async function onRequestGet({ request, env }) {
  const incoming = new URL(request.url);
  const target = incoming.searchParams.get("url");
  const strategy = incoming.searchParams.get("strategy") || "mobile";
  if (!target || target.length > 2048 || !isPublicWebUrl(target)) {
    return json({ error: "Introduce una URL HTTP/HTTPS pública válida. No se admiten direcciones locales ni IP literales." }, 400);
  }
  if (!["mobile", "desktop"].includes(strategy)) return json({ error: "Estrategia no válida. Usa mobile o desktop." }, 400);

  const googleUrl = new URL(API_BASE);
  googleUrl.searchParams.set("url", target);
  googleUrl.searchParams.set("strategy", strategy);
  for (const category of ["performance", "accessibility", "best-practices", "seo"]) googleUrl.searchParams.append("category", category);
  if (env.PAGESPEED_API_KEY) googleUrl.searchParams.set("key", env.PAGESPEED_API_KEY);

  try {
    const response = await fetch(googleUrl.toString(), { headers: { accept: "application/json" }, signal: AbortSignal.timeout(50000) });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const message = body && body.error && body.error.message;
      return json({ error: message || "Google PageSpeed Insights no pudo completar el análisis.", provider: "Google PageSpeed Insights", providerStatus: response.status }, response.status === 429 ? 429 : response.status >= 500 ? 502 : 400);
    }
    if (!body || !body.lighthouseResult) return json({ error: "Google respondió sin un informe Lighthouse válido." }, 502);
    return json(body);
  } catch (error) {
    return json({ error: error && error.name === "TimeoutError" ? "Google PageSpeed tardó demasiado. Inténtalo de nuevo." : "No se pudo conectar con Google PageSpeed Insights. Inténtalo de nuevo." }, 502);
  }
}