const API_BASE = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

function json(data, status = 200, incidentId = null) {
  const payload = incidentId && status >= 400 ? { ...data, incidentId } : data;
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...(incidentId ? { "x-request-id": incidentId } : {})
    }
  });
}

function failure(incidentId, data, status, details = {}) {
  // Safe diagnostic metadata only: never log API keys or the full target URL.
  console.error(JSON.stringify({
    event: "agency_ai_os_failure",
    incidentId,
    endpoint: "/api/pagespeed",
    code: data.code || "PAGESPEED_REQUEST_INVALID",
    status,
    ...details
  }));
  return json(data, status, incidentId);
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
  const incidentId = crypto.randomUUID();
  const incoming = new URL(request.url);
  const target = incoming.searchParams.get("url");
  const strategy = incoming.searchParams.get("strategy") || "mobile";
  if (!target || target.length > 2048 || !isPublicWebUrl(target)) {
    return failure(incidentId, { error: "Introduce una URL HTTP/HTTPS pública válida. No se admiten direcciones locales ni IP literales.", code: "PAGESPEED_INVALID_URL" }, 400);
  }
  if (!["mobile", "desktop"].includes(strategy)) {
    return failure(incidentId, { error: "Estrategia no válida. Usa mobile o desktop.", code: "PAGESPEED_INVALID_STRATEGY" }, 400);
  }
  if (!env.PAGESPEED_API_KEY) {
    return failure(incidentId, {
      error: "El servidor no tiene configurada la clave de PageSpeed para este entorno.",
      code: "PAGESPEED_API_KEY_MISSING"
    }, 503, { strategy });
  }

  const googleUrl = new URL(API_BASE);
  googleUrl.searchParams.set("url", target);
  googleUrl.searchParams.set("strategy", strategy);
  for (const category of ["performance", "accessibility", "best-practices", "seo"]) googleUrl.searchParams.append("category", category);
  googleUrl.searchParams.set("key", env.PAGESPEED_API_KEY);

  try {
    const response = await fetch(googleUrl.toString(), { headers: { accept: "application/json" }, signal: AbortSignal.timeout(50000) });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const message = body && body.error && body.error.message || "";
      const quota = /quota exceeded|queries per day|rate limit|daily limit/i.test(message);
      if (quota) {
        return failure(incidentId, {
          error: "Google PageSpeed Insights ha rechazado la consulta por cuota o límite de uso. No se han generado puntuaciones. Usa el identificador del fallo para localizar el registro en Cloudflare.",
          code: "PAGESPEED_QUOTA_EXCEEDED",
          provider: "Google PageSpeed Insights",
          providerStatus: response.status,
          providerMessage: message
        }, response.status === 429 ? 429 : 403, { strategy, providerStatus: response.status, providerCode: "quota_or_rate_limit" });
      }
      return failure(incidentId, {
        error: message || "Google PageSpeed Insights no pudo completar el análisis.",
        code: "PAGESPEED_PROVIDER_ERROR",
        provider: "Google PageSpeed Insights",
        providerStatus: response.status
      }, response.status === 429 ? 429 : response.status >= 500 ? 502 : 400, { strategy, providerStatus: response.status });
    }
    if (!body || !body.lighthouseResult) {
      return failure(incidentId, { error: "Google respondió sin un informe Lighthouse válido.", code: "PAGESPEED_INVALID_PROVIDER_RESPONSE" }, 502, { strategy, providerStatus: response.status });
    }
    return json(body, 200, incidentId);
  } catch (error) {
    const timeout = error && error.name === "TimeoutError";
    return failure(incidentId, {
      error: timeout ? "Google PageSpeed tardó demasiado. Inténtalo de nuevo." : "No se pudo conectar con Google PageSpeed Insights. Inténtalo de nuevo.",
      code: timeout ? "PAGESPEED_TIMEOUT" : "PAGESPEED_CONNECTION_ERROR"
    }, 502, { strategy, errorName: error?.name || "UnknownError" });
  }
}
