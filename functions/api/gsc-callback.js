function redirect(request,status){return Response.redirect(new URL("/seo.html?gsc="+encodeURIComponent(status),request.url).toString(),302);}
export async function onRequestGet({request,env}){
 const u=new URL(request.url);if(u.searchParams.has("error"))return redirect(request,"error");
 const code=u.searchParams.get("code"),state=u.searchParams.get("state");
 if(!code||!state||!env.AGENCY_KV||!env.GOOGLE_CLIENT_ID||!env.GOOGLE_CLIENT_SECRET||!env.GOOGLE_GSC_REDIRECT_URI)return redirect(request,"config-error");
 const key="gsc_oauth_state:"+state;if(!await env.AGENCY_KV.get(key))return redirect(request,"state-error");await env.AGENCY_KV.delete(key);
 try{
  const res=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({code,client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,redirect_uri:env.GOOGLE_GSC_REDIRECT_URI,grant_type:"authorization_code"}),signal:AbortSignal.timeout(12000)});
  const token=await res.json().catch(()=>({}));
  if(!res.ok||!token.refresh_token){console.error(JSON.stringify({event:"gsc_oauth_callback_failed",status:res.status,providerError:token.error||"refresh_token_missing"}));return redirect(request,"token-error");}
  await env.AGENCY_KV.put("gsc_refresh_token",token.refresh_token);await env.AGENCY_KV.put("gsc_connected_at",new Date().toISOString());return redirect(request,"success");
 }catch(e){console.error(JSON.stringify({event:"gsc_oauth_callback_failed",errorName:e?.name||"Error"}));return redirect(request,"callback-error");}
}