function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "El cuerpo de la petición debe ser JSON válido.", code: "INVALID_JSON" }, 400); }
  const siteUrl = String(body?.siteUrl || "").trim();
  if (!siteUrl || siteUrl.length > 2048) return json({ ok: false, error: "Falta una URL o propiedad válida de Search Console.", code: "SITE_URL_REQUIRED" }, 400);
  if (!env.AGENCY_KV) return json({ ok: false, error: "No está configurado el binding AGENCY_KV en Cloudflare.", code: "KV_NOT_CONFIGURED" }, 503);
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return json({ ok: false, error: "Faltan las credenciales OAuth de Google en Cloudflare.", code: "OAUTH_CONFIG_MISSING" }, 503);
  try {
    const refreshToken = await env.AGENCY_KV.get("gsc_refresh_token");
    if (!refreshToken) return json({ ok: false, error: "Search Console no está vinculado: falta el refresh token en AGENCY_KV.", code: "GSC_NOT_CONNECTED" }, 401);
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: refreshToken, grant_type: "refresh_token" }),
      signal: AbortSignal.timeout(12000)
    });
    const tokenData = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !tokenData.access_token) {
      const revoked = ["invalid_grant", "unauthorized_client"].includes(tokenData.error);
      return json({ ok: false, error: revoked ? "El acceso de Google ha caducado o se ha revocado. Vuelve a vincular Search Console." : "Google no ha permitido renovar el acceso de Search Console.", code: revoked ? "GSC_TOKEN_INVALID" : "OAUTH_REFRESH_FAILED" }, 401);
    }
    let normalizedSite;
    try {
      const u = new URL(siteUrl);
      if (!["http:", "https:"].includes(u.protocol) || u.username || u.password) throw new Error();
      normalizedSite = u.href;
    } catch {
      // Search Console domain properties use the sc-domain:example.com format.
      if (/^sc-domain:[a-z0-9.-]+$/i.test(siteUrl)) normalizedSite = siteUrl;
      else return json({ ok: false, error: "La propiedad debe ser una URL válida o una propiedad de dominio sc-domain:ejemplo.com.", code: "INVALID_SITE_URL" }, 400);
    }
    const end = new Date(Date.now() - 3 * 86400000);
    const start = new Date(end.getTime() - 27 * 86400000);
    const fmt = d => d.toISOString().slice(0, 10);
    const startDate = fmt(start), endDate = fmt(end);
    const endpoint = "https://searchconsole.googleapis.com/webmasters/v3/sites/" + encodeURIComponent(normalizedSite) + "/searchAnalytics/query";
    const gscRes = await fetch(endpoint, {
      method: "POST", headers: { "Authorization": "Bearer " + tokenData.access_token, "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate, dimensions: ["query", "page"], rowLimit: 50 }),
      signal: AbortSignal.timeout(15000)
    });
    const data = await gscRes.json().catch(() => ({}));
    if (!gscRes.ok || data.error) {
      const providerStatus = gscRes.status;
      if (providerStatus === 401) return json({ ok: false, error: "Google ha rechazado el acceso. Vuelve a vincular Search Console.", code: "GSC_UNAUTHORIZED" }, 401);
      if (providerStatus === 403) return json({ ok: false, error: "La cuenta conectada no tiene permisos para esta propiedad, o la API de Search Console no está habilitada.", code: "GSC_PERMISSION_DENIED" }, 403);
      if (providerStatus === 404) return json({ ok: false, error: "No se encuentra la propiedad de Search Console indicada. Comprueba su URL exacta y sus permisos.", code: "GSC_PROPERTY_NOT_FOUND" }, 404);
      if (providerStatus === 429) return json({ ok: false, error: "Google Search Console ha limitado las consultas. Espera unos minutos y vuelve a intentarlo.", code: "GSC_QUOTA_EXCEEDED" }, 429);
      return json({ ok: false, error: "Search Console no pudo completar la consulta (HTTP " + providerStatus + ").", code: "GSC_PROVIDER_ERROR" }, providerStatus >= 500 ? 502 : 400);
    }
    return json({ ok: true, period: { start: startDate, end: endDate }, siteUrl: normalizedSite, data: Array.isArray(data.rows) ? data.rows : [] });
  } catch (error) {
    const timeout = error?.name === "TimeoutError";
    console.error(JSON.stringify({ event: "gsc_data_failure", code: timeout ? "GSC_TIMEOUT" : "GSC_REQUEST_FAILED", errorName: error?.name || "Error" }));
    return json({ ok: false, error: timeout ? "La consulta a Google ha tardado demasiado. Inténtalo de nuevo." : "No se ha podido conectar con Google Search Console.", code: timeout ? "GSC_TIMEOUT" : "GSC_REQUEST_FAILED" }, 502);
  }
}
