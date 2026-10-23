export async function onRequestPost({ request, env }) {
  // 1. Recuperamos el token guardado
  const refreshToken = await env.AGENCY_KV.get("google_refresh_token");
  if (!refreshToken) return new Response(JSON.stringify({ error: "Drive no vinculado" }), { status: 401 });

  // 2. Pedimos un token de acceso a Google
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
  if (!access_token) return new Response(JSON.stringify({ error: "Token caducado" }), { status: 401 });

  // 3. Preparamos los datos a guardar
  const data = await request.json(); 
  const content = JSON.stringify(data, null, 2);
  const fileName = "agency-ai-os-backup.json";

  // 4. Buscamos si el archivo ya existe en Drive
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and trashed=false`, {
    headers: { Authorization: `Bearer ${access_token}` }
  });
  const searchData = await searchRes.json();
  
  let fileId;
  if (searchData.files && searchData.files.length > 0) {
    // Si existe, lo sobreescribimos
    fileId = searchData.files[0].id;
    await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
      body: content
    });
  } else {
    // Si no existe, lo creamos
    const metaRes = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: fileName, mimeType: "application/json" })
    });
    const metaData = await metaRes.json();
    fileId = metaData.id;

    await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
      body: content
    });
  }

  return new Response(JSON.stringify({ ok: true, message: "Sincronizado con Drive" }), {
    headers: { "Content-Type": "application/json" }
  });
}
