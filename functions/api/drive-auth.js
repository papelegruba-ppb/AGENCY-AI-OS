export async function onRequestGet({ env }) {
  if (env.GOOGLE_DRIVE_ENABLED !== "true") return new Response("Google Drive está desactivado. No se iniciará OAuth ni se contactará con Google.", { status: 503, headers: { "cache-control": "no-store" } });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", env.GOOGLE_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/drive.file");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  return Response.redirect(url.toString(), 302);
}
