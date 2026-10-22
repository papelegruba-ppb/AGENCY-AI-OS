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

    // 1. Descargar el HTML real (sin IA)
    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgencyAIOS/1.0)' }
    });
    const html = await response.text();

    // 2. Extraer datos reales
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'No encontrado';
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const description = descMatch ? descMatch[1].trim() : 'No encontrada';
    const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];

    // 3. Simulamos la respuesta de la IA (Modo Pruebas)
    const isSimulation = true;
    let analysisText = "";

    if (isSimulation) {
      analysisText = `[MODO PRUEBA - SIN COSTE DE API]\n\nAnálisis simulado para ${targetUrl}:\n- El título actual es "${title}".\n- La meta descripción es "${description}".\n- Tiene ${h1Matches.length} etiquetas H1.\n\nRecomendaciones UX simuladas:\n1. Mejorar la jerarquía visual.\n2. Añadir llamadas a la acción claras.\n3. Optimizar la velocidad de carga.\n\nPara ver el análisis real generado por IA, recarga saldo en tu proveedor (DeepSeek u OpenAI) y quita el modo simulación.`;
    }

    // 4. Devolver los datos
    return new Response(JSON.stringify({
      ok: true,
      seoData: { title, description, h1Count: h1Matches.length },
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
