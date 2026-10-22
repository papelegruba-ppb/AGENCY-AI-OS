export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const targetUrl = body.url;

    if (!targetUrl || !targetUrl.startsWith('http')) {
      return new Response(JSON.stringify({ error: 'URL inválida.' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. Descargar el HTML real
    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgencyAIOS/1.0)' }
    });
    const html = await response.text();

    // 2. Extraer datos SEO reales (Análisis Completo)
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const description = descMatch ? descMatch[1].trim() : '';

    const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
    const h2Matches = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi) || [];

    const imgTags = html.match(/<img[^>]+>/gi) || [];
    const imagesWithoutAlt = imgTags.filter(img => !/alt=["'][^"']+["']/i.test(img)).length;

    const hasOgTitle = /<meta[^>]*property=["']og:title["'][^>]*>/i.test(html);
    const hasOgDesc = /<meta[^>]*property=["']og:description["'][^>]*>/i.test(html);
    const hasCanonical = /<link[^>]*rel=["']canonical["'][^>]*>/i.test(html);

    // 3. Calcular Puntuación SEO Real (Sin IA)
    let score = 100;
    if (!title) score -= 20;
    else if (title.length < 30 || title.length > 60) score -= 5;
    if (!description) score -= 15;
    else if (description.length < 70 || description.length > 160) score -= 5;
    if (h1Matches.length === 0) score -= 15;
    if (h1Matches.length > 1) score -= 10;
    if (imagesWithoutAlt > 0) score -= Math.min(15, imagesWithoutAlt * 2);
    if (!hasCanonical) score -= 5;
    if (score < 0) score = 0;

    // 4. Simulamos la respuesta de la IA (Modo Pruebas)
    const isSimulation = true;
    let analysisText = "";

    if (isSimulation) {
      analysisText = `[MODO PRUEBA - SIN COSTE DE API]\n\nAnálisis para ${targetUrl}:\n- Título: "${title}" (${title.length} caracteres).\n- Meta descripción: "${description}" (${description.length} caracteres).\n- H1: ${h1Matches.length} etiquetas.\n- H2: ${h2Matches.length} etiquetas.\n- Imágenes sin ALT: ${imagesWithoutAlt} de ${imgTags.length}.\n- Open Graph (Redes): ${hasOgTitle && hasOgDesc ? 'Sí' : 'No'}.\n- Canonical: ${hasCanonical ? 'Sí' : 'No'}.\n\nPara ver el análisis real generado por IA, recarga saldo en tu proveedor (DeepSeek u OpenAI) y quita el modo simulación.`;
    }

    // 5. Devolver los datos
    return new Response(JSON.stringify({
      ok: true,
      score: score,
      seoData: { 
        title, titleLength: title.length,
        description, descLength: description.length,
        h1Count: h1Matches.length, 
        h2Count: h2Matches.length,
        imagesWithoutAlt, totalImages: imgTags.length,
        hasOg: hasOgTitle && hasOgDesc,
        hasCanonical
      },
      analysis: analysisText
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
