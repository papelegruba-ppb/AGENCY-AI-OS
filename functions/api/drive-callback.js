export async function onRequestGet({ request, env }) {
  if (env.GOOGLE_DRIVE_ENABLED !== "true") return new Response("Google Drive está desactivado. No se intercambiarán tokens ni se contactará con Google.", { status: 503, headers: { "cache-control": "no-store" } });
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) return new Response("No se recibió código de Google.", { status: 400 });

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code"
    })
  });
  
  const tokenData = await tokenRes.json();
  
  if (tokenData.refresh_token) {
    // Guardamos el token en Cloudflare KV para siempre
    await env.AGENCY_KV.put("google_refresh_token", tokenData.refresh_token);
    return Response.redirect("https://agency-ai-os-1cm.pages.dev/?drive=success", 302);
  }
  
  return new Response("Error al obtener el token: " + JSON.stringify(tokenData), { status: 500 });
}
