export const TASK_CATALOG = {
  web: { label: "Web / aplicación", app: "Lovable o Bolt", url: "https://lovable.dev/", purpose: "Construir o prototipar una interfaz o aplicación cuando el constructor interno no pueda completar esa parte.", output: "Código o proyecto exportable, rutas, componentes y pasos de despliegue.", apply: "Revisar el resultado en el proyecto, integrar los componentes en el repositorio y ejecutar pruebas antes de publicar.", prompt: "Construye la solución web solicitada con componentes reutilizables, diseño responsive, estados de carga/error, accesibilidad y validación. No inventes integraciones ni almacenes secretos en el frontend. Entrega estructura de archivos, instrucciones de ejecución y pruebas." },
  social: { label: "Redes sociales", app: "Canva", url: "https://www.canva.com/", purpose: "Producir posts, carruseles, stories y piezas de campaña editables.", output: "Diseños editables y exportaciones PNG/JPG/MP4, más el copy separado.", apply: "Guardar los originales y exportaciones en los recursos del proyecto; preparar calendario, textos y revisión antes de publicar.", prompt: "Desarrolla una campaña social coherente con la marca. Propón publicaciones, carruseles y stories con objetivo, audiencia, gancho, copy, CTA, formato y dirección visual. Usa los recursos adjuntos; no inventes datos, testimonios ni claims. Mantén textos editables y entrega cada pieza identificada." },
  video: { label: "Vídeo / Reel", app: "Canva o Google Flow", url: "https://www.canva.com/", purpose: "Crear un vídeo o secuencia audiovisual cuando no haya generación integrada disponible.", output: "MP4 vertical u horizontal, guion, escenas, subtítulos y portada.", apply: "Incorporar el MP4 y sus assets al proyecto; validar duración, formato, derechos y subtítulos antes de programar.", prompt: "Produce un vídeo promocional a partir del briefing y los assets adjuntos. Entrega guion por escenas, duración, encuadres, movimiento de cámara, textos en pantalla, voz/subtítulos y CTA. Conserva la identidad de marca. No generes logotipos ni afirmaciones comerciales inventadas." },
  image: { label: "Imagen / diseño", app: "Canva o Adobe Firefly", url: "https://firefly.adobe.com/", purpose: "Crear o editar recursos visuales respetando la identidad de marca.", output: "PNG/JPG/SVG cuando la herramienta lo permita, variantes y prompt de origen.", apply: "Guardar el original, registrar licencia/origen y añadir el asset a la biblioteca del proyecto.", prompt: "Crea el recurso visual solicitado usando las referencias adjuntas. Respeta composición, colores, tipografía y producto. Reserva espacio para texto editable. No inventes marcas, logos, cifras ni elementos protegidos." },
  research: { label: "Investigación / análisis", app: "Perplexity", url: "https://www.perplexity.ai/", purpose: "Completar investigación externa con fuentes citables.", output: "Informe con hallazgos, enlaces, fechas, limitaciones y recomendaciones.", apply: "Guardar el informe en documentación del proyecto y convertir los hallazgos validados en tareas.", prompt: "Investiga la solicitud usando fuentes primarias y recientes. Cita cada afirmación importante con enlace y fecha. Separa hechos, inferencias y recomendaciones; declara lagunas y no inventes métricas ni resultados privados." },
  automation: { label: "Automatización", app: "Make o n8n", url: "https://www.make.com/", purpose: "Diseñar una automatización externa si no existe conector o endpoint disponible en Agency AI OS.", output: "Diagrama del flujo, módulos, mapeo de datos, manejo de errores y configuración.", apply: "Configurar primero en entorno de prueba, guardar blueprint/exportación y validar permisos, reintentos y logs antes de producción.", prompt: "Diseña una automatización segura para el objetivo descrito. Especifica disparador, pasos, campos, autenticación, errores, reintentos, límites, protección de datos y pruebas. Distingue funciones gratuitas de las sujetas a pago." }
};

export function classifyTask(text = "") {
  const value = String(text).toLowerCase();
  if (/instagram|tiktok|facebook|linkedin|post|carrusel|story|stories|publicaci[oó]n|redes sociales/.test(value)) return "social";
  if (/reel|short|v[ií]deo|video|clip|animaci[oó]n/.test(value)) return "video";
  if (/imagen|diseñ|creatividad|banner|portada|logo|visual/.test(value)) return "image";
  if (/seo|investiga|competencia|competidor|analiza|fuentes|estudio/.test(value)) return "research";
  if (/automatiz|webhook|workflow|integraci[oó]n|make|n8n/.test(value)) return "automation";
  return "web";
}

export function buildFallbackPlan({ task, projectName = "Proyecto", category } = {}) {
  const objective = String(task || "").trim();
  if (!objective) throw new Error("Describe la tarea antes de generar el plan alternativo.");
  const key = TASK_CATALOG[category] ? category : classifyTask(objective);
  const item = TASK_CATALOG[key];
  const prompt = [
    "AGENCY AI OS · PLAN ALTERNATIVO PARA EL PROYECTO",
    "Proyecto: " + projectName,
    "Tarea: " + objective,
    "",
    "OBJETIVO Y POR QUÉ",
    item.purpose,
    "",
    "APLICACIÓN SUGERIDA",
    item.app + " · " + item.url,
    "Disponibilidad: comprobar el plan gratuito, límites, región y condiciones actuales antes de usar. No se garantiza que todas las funciones sean gratuitas.",
    "",
    "RESULTADO QUE DEBEMOS OBTENER",
    item.output,
    "",
    "PROMPT PARA LA APLICACIÓN",
    item.prompt,
    "",
    "APLICACIÓN POSTERIOR EN AGENCY AI OS",
    item.apply,
    "",
    "VALIDACIÓN",
    "Revisar calidad, derechos/licencias, datos y consistencia con el briefing. No publicar ni desplegar sin aprobación."
  ].join("\n");
  return { category: key, categoryLabel: item.label, app: item.app, url: item.url, purpose: item.purpose, output: item.output, apply: item.apply, prompt, task: objective, projectName };
}
