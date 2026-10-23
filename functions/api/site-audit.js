export async function onRequestPost({ request }) {
  let body;
  try { body = await request.json(); } catch { return json({error:"El cuerpo de la petición debe ser JSON."},400); }
  const target = String(body?.url || "").trim();
  
  if(!target || !target.startsWith("http")) {
    return json({error:"Introduce una URL HTTP/HTTPS pública válida."},400);
  }

  try {
    const res = await fetch(target, { headers: { "User-Agent": "Mozilla/5.0 (compatible; AgencyAIOS/1.0)" }});
    if (!res.ok) throw new Error("La web no responde.");
    const html = await res.text();

    // 1. DATOS BÁSICOS
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) || 
                      html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    const description = descMatch ? descMatch[1].trim() : '';
    const projectName = title.split(/[|–—]/)[0].trim() || "Proyecto Web";

    // 2. LIMPIAR TEXTO
    const cleanText = html.replace(/<(script|style|noscript|svg|iframe)[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
                          .replace(/<[^>]+>/g, " ")
                          .replace(/\s+/g, " ")
                          .toLowerCase();

    // 3. LÓGICA DE SECTORES (Múltiples)
    const sectors = [];
    if (cleanText.includes("fiscal") || cleanText.includes("impuesto") || cleanText.includes("hacienda") || cleanText.includes("tributario")) sectors.push("Asesoría Fiscal");
    if (cleanText.includes("laboral") || cleanText.includes("trabajo") || cleanText.includes("nómina") || cleanText.includes("contrato")) sectors.push("Asesoría Laboral");
    if (cleanText.includes("gestoría") || cleanText.includes("gestión") || cleanText.includes("contable") || cleanText.includes("contabilidad")) sectors.push("Gestoría y Contabilidad");
    if (cleanText.includes("abogado") || cleanText.includes("jurídico") || cleanText.includes("legal") || cleanText.includes("ley")) sectors.push("Servicios Legales");
    if (cleanText.includes("diseño") || cleanText.includes("web") || cleanText.includes("marketing") || cleanText.includes("publicidad")) sectors.push("Marketing y Diseño");
    if (cleanText.includes("clínica") || cleanText.includes("salud") || cleanText.includes("médico") || cleanText.includes("paciente")) sectors.push("Salud y Bienestar");
    if (cleanText.includes("inmobiliaria") || cleanText.includes("pisos") || cleanText.includes("alquiler") || cleanText.includes("vivienda")) sectors.push("Inmobiliaria");
    if (cleanText.includes("restaurante") || cleanText.includes("comida") || cleanText.includes("café") || cleanText.includes("menú")) sectors.push("Hostelería");
    if (cleanText.includes("construcción") || cleanText.includes("reforma") || cleanText.includes("arquitecto") || cleanText.includes("obra")) sectors.push("Construcción y Reformas");
    
    // Si no encuentra nada, ponemos uno genérico
    const sectorString = sectors.length > 0 ? [...new Set(sectors)].join(", ") : "Servicios profesionales";

    // 4. LÓGICA DE PÚBLICO (Múltiples)
    const audiences = [];
    if (cleanText.includes("autónomo") || cleanText.includes("autonomos")) audiences.push("Autónomos");
    if (cleanText.includes("pyme") || cleanText.includes("pymes") || cleanText.includes("pequeña empresa")) audiences.push("PYMES");
    if (cleanText.includes("gran empresa") || cleanText.includes("grandes empresas") || cleanText.includes("corporativo")) audiences.push("Grandes Empresas");
    if (cleanText.includes("particular") || cleanText.includes("familias") || cleanText.includes("personas")) audiences.push("Particulares");
    if (cleanText.includes("emprendedor") || cleanText.includes("startup")) audiences.push("Emprendedores");
    if (cleanText.includes("inversor") || cleanText.includes("inversores") || cleanText.includes("no residente")) audiences.push("Inversores / No residentes");

    const audienceString = audiences.length > 0 ? [...new Set(audiences)].join(", ") : "Público general";

    // 5. LÓGICA DE OBJETIVO
    let goal = "Generar contactos comerciales";
    if (cleanText.includes("presupuesto") || cleanText.includes("llámanos") || cleanText.includes("contacto")) goal = "Captar solicitudes de presupuesto";
    else if (cleanText.includes("reserva") || cleanText.includes("cita")) goal = "Conseguir reservas y citas";
    else if (cleanText.includes("carrito") || cleanText.includes("comprar") || cleanText.includes("tienda online")) goal = "Vender productos online";
    else if (cleanText.includes("suscripción") || cleanText.includes("newsletter")) goal = "Captar suscriptores";

    // 6. EXTRACCIÓN DE SERVICIOS (Ignorando Blogs)
    let services = [];
    
    // A. Buscar en el menú de navegación (<nav> ... </nav>)
    const navMatch = html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/i);
    if (navMatch) {
      const links = [...navMatch[1].matchAll(/<a[^>]*>([^<]+)<\/a>/gi)];
      links.forEach(l => {
        const text = l[1].replace(/<[^>]+>/g, '').trim();
        if (text.length > 2 && text.length < 40 && !/inicio|home|contacto|blog|aviso|privacidad/i.test(text)) {
          services.push(text);
        }
      });
    }

    // B. Buscar en los H2 y H3, pero filtrando los de blog
    const headings = [];
    const hMatches = html.matchAll(/<h[23][^>]*>(.*?)<\/h[23]>/gi);
    for (const match of hMatches) {
      const cleanText = match[1].replace(/<[^>]+>/g, '').trim();
      // Ignoramos si contiene fechas, si es muy largo (típico de títulos de blog) o si menciona blog
      if (cleanText.length > 3 && cleanText.length < 45 && 
          !/\d{4}/.test(cleanText) && 
          !/blog|noticia|artículo|post|categoría|comentario|leer más|sigue leyendo/i.test(cleanText) && 
          !headings.includes(cleanText) && !services.includes(cleanText)) {
        headings.push(cleanText);
      }
    }
    
    // Juntamos los servicios del menú y los encabezados
    const finalServices = [...new Set([...services, ...headings])].slice(0, 8);

    // Devolvemos el paquete formateado
    return json({
      ok: true,
      projectName: projectName,
      sector: sectorString,
      offer: description || "Completa con la propuesta de valor de la empresa.",
      audience: audienceString,
      goal: goal,
      requirements: finalServices.join("\n")
    });

  } catch (e) {
    return json({ error: "Error al leer la web: " + e.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}
