export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // 1. Obtener la URL del cuerpo de la petición
    const body = await request.json();
    const targetUrl = body.url;

    if (!targetUrl || !targetUrl.startsWith('http')) {
      return new Response(JSON.stringify({ error: 'URL inválida. Debe empezar por http o https.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Descargar el HTML de la web del cliente (Evita el problema de CORS)
    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgencyAIOS/1.0)' }
    });
    
    if (!response.ok) {
      throw new Error(`No se pudo acceder a la web. Código: ${response.status}`);
    }

    const html = await response.text();

    // 3. Extraer etiquetas básicas usando expresiones regulares simples
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'No encontrado';

    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const description = descMatch ? descMatch[1].trim() : 'No encontrada';

    const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
    const h1Count = h1Matches.length;

    // 4. Comprobar si tenemos la API Key configurada (DeepSeek o OpenAI)
    const apiKey = env.DEEPSEEK_API_KEY || env.OPENAI_API_KEY;
    const apiUrl = env.DEEPSEEK_API_KEY 
      ? 'https://api.deepseek.com/chat/completions' 
      : 'https://api.openai.com/v1/chat/completions';
    const model = env.DEEPSEEK_API_KEY ? 'deepseek-chat' : 'gpt-4o-mini';

    if (!apiKey) {
      return new Response(JSON.stringify({ 
        error: 'Falta configurar la API Key (DEEPSEEK_API_KEY o OPENAI_API_KEY) en Cloudflare.',
        seoData: { title, description, h1Count }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 5. Llamar a la IA para el análisis UX y SEO
    const prompt = `Actúa como un experto en SEO y UX.
Analiza estos datos extraídos de la web ${targetUrl}:
- Título: ${title}
- Meta descripción: ${description}
- Cantidad de etiquetas H1: ${h1Count}

Dame un análisis estructurado con:
1. Un diagnóstico rápido del SEO actual (basado en el título y la descripción).
2. Tres mejoras de UX concretas (basándote en lo que suele fallar en webs de este tipo).
3. Una propuesta de nuevo Título y Meta descripción optimizados (máximo 60 y 155 caracteres).
Responde en español, de forma directa y profesional.`;

    const aiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: 'Eres un consultor SEO y UX senior.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    });

    const aiData = await aiResponse.json();

    if (!aiResponse.ok) {
      throw new Error(aiData.error?.message || 'Error al llamar a la API de IA.');
    }

    const aiAnalysis = aiData.choices[0].message.content;

    // 6. Devolver todo al frontend
    return new Response(JSON.stringify({
      ok: true,
      seoData: { title, description, h1Count },
      analysis: aiAnalysis
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
