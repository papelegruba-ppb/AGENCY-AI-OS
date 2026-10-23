export async function onRequestGet({ env }) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", env.GOOGLE_GSC_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  // Este scope es el que pide permiso de LECTURA de Search Console
  url.searchParams.set("scope", "https://www.googleapis.com/auth/webmasters.readonly");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  return Response.redirect(url.toString(), 302);
}