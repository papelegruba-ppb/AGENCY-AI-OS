export async function onRequestPost({ request, env }) {
  const refreshToken = await env.AGENCY_KV.get("gsc_refresh_token");
  if (!refreshToken) {
    return new Response(JSON.stringify({ error: "Search Console no vinculado." }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const body = await request.json();
  const siteUrl = body.siteUrl;
  if (!siteUrl) return new Response(JSON.stringify({ error: "Falta la URL del sitio." }), { status: 400, headers: { "Content-Type": "application/json" } });

  // 1. Pedimos un token de acceso nuevo
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });
  
  const { access_token } = await tokenRes.json();
  if (!access_token) return new Response(JSON.stringify({ error: "Token caducado o inválido." }), { status: 401, headers: { "Content-Type": "application/json" } });

  try {
    // 2. Llamamos a la API de Search Console
    // Pedimos los datos de los últimos 28 días agrupados por query (palabra clave) y página
    const gscUrl = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
    
    // Calculamos fechas (últimos 28 días)
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const gscRes = await fetch(gscUrl, {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        startDate: startDate,
        endDate: endDate,
        dimensions: ["query", "page"],
        rowLimit: 50 // Traemos las top 50
      })
    });

    const gscData = await gscRes.json();

    if (gscData.error) {
      throw new Error(gscData.error.message || "Error al consultar Search Console.");
    }

    return new Response(JSON.stringify({
      ok: true,
      period: { start: startDate, end: endDate },
      data: gscData.rows || []
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}