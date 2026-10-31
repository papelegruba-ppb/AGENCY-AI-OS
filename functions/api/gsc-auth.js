function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } }); }
export async function onRequestGet({ env }) {
 if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_GSC_REDIRECT_URI || !env.AGENCY_KV) return json({ok:false,error:"Faltan GOOGLE_CLIENT_ID, GOOGLE_GSC_REDIRECT_URI o AGENCY_KV.",code:"GSC_OAUTH_CONFIG_MISSING"},503);
 const state=crypto.randomUUID()+crypto.randomUUID();
 await env.AGENCY_KV.put("gsc_oauth_state:"+state,"1",{expirationTtl:600});
 const url=new URL("https://accounts.google.com/o/oauth2/v2/auth");
 url.searchParams.set("client_id",env.GOOGLE_CLIENT_ID);url.searchParams.set("redirect_uri",env.GOOGLE_GSC_REDIRECT_URI);
 url.searchParams.set("response_type","code");url.searchParams.set("scope","https://www.googleapis.com/auth/webmasters.readonly");
 url.searchParams.set("access_type","offline");url.searchParams.set("prompt","consent");url.searchParams.set("include_granted_scopes","true");url.searchParams.set("state",state);
 return Response.redirect(url.toString(),302);
}