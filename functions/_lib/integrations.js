const CATALOG = {
  ai: { label: "Modelos de IA externos", env: "AI_BILLABLE_ENABLED", cost: "Puede generar cargos por tokens o solicitudes.", function: "Generación de copy, propuestas y coordinación de agentes.", activation: "Revisar proveedor, modelo, tarifa y límites antes de habilitar." },
  openai: { label: "OpenAI", env: null, provider: "openai", key: "OPENAI_API_KEY", model: "OPENAI_MODEL", cost: "Facturación por API y tokens según modelo.", function: "Chat, razonamiento, generación y agentes.", activation: "Configurar clave y modelo; habilitar AI_ENABLED y AI_BILLABLE_ENABLED." },
  gemini: { label: "Google Gemini", env: null, provider: "gemini", key: "GEMINI_API_KEY", model: "GEMINI_MODEL", cost: "Cuotas gratuitas y facturación según proyecto, modelo y uso de Google AI.", function: "Chat multimodal, análisis y generación mediante Gemini API.", activation: "Configurar clave y modelo; habilitar AI_ENABLED y AI_BILLABLE_ENABLED." },
  claude: { label: "Anthropic Claude", env: null, provider: "anthropic", key: "ANTHROPIC_API_KEY", model: "ANTHROPIC_MODEL", cost: "Facturación por API y tokens según modelo.", function: "Chat, análisis y razonamiento mediante Claude API.", activation: "Configurar clave y modelo; habilitar AI_ENABLED y AI_BILLABLE_ENABLED." },
  deepseek: { label: "DeepSeek", env: null, provider: "deepseek", key: "DEEPSEEK_API_KEY", model: "DEEPSEEK_MODEL", cost: "Facturación por API y tokens según modelo.", function: "Chat y generación de contenido.", activation: "Configurar clave y modelo; habilitar AI_ENABLED y AI_BILLABLE_ENABLED." },
  perplexity: { label: "Perplexity", env: null, provider: "perplexity", key: "PERPLEXITY_API_KEY", model: "PERPLEXITY_MODEL", cost: "Facturación por API y uso según modelo.", function: "Respuestas asistidas por búsqueda y modelos Perplexity.", activation: "Configurar clave y modelo; habilitar AI_ENABLED y AI_BILLABLE_ENABLED." },
  pagespeed: { label: "Google PageSpeed Insights", env: null, cost: "API sin coste directo dentro de la cuota gratuita; sujeta a límites de Google.", function: "Lighthouse móvil y escritorio.", activation: "Configurar PAGESPEED_API_KEY; no requiere flag adicional." },
  searchConsole: { label: "Google Search Console", env: null, cost: "API sin coste directo de consulta dentro de cuotas de Google.", function: "Clics, impresiones, consultas y páginas.", activation: "Configurar OAuth, AGENCY_KV y autorizar la propiedad exacta." },
  googleDrive: { label: "Google Drive", env: "GOOGLE_DRIVE_ENABLED", cost: "La API puede ser gratuita dentro de cuotas; almacenamiento y uso dependen de la cuenta.", function: "Copias de seguridad externas.", activation: "Autorizar explícitamente la sincronización externa." },
  whatsapp: { label: "WhatsApp Business Platform", env: "WHATSAPP_ENABLED", cost: "Puede generar cargos por conversaciones y proveedor.", function: "Mensajería real con clientes.", activation: "Configurar Meta Cloud API, webhook, plantillas y presupuesto." },
  googleCalendar: { label: "Google Calendar API", env: "GOOGLE_CALENDAR_ENABLED", cost: "La API puede no tener coste directo, pero depende de la cuenta y del uso asociado.", function: "Consultar disponibilidad y crear citas.", activation: "Configurar OAuth y autorizar acceso al calendario." },
  googleSheets: { label: "Google Sheets API", env: "GOOGLE_SHEETS_ENABLED", cost: "Sujeta a cuotas y límites de Google.", function: "Importar o sincronizar datos externos.", activation: "Autorizar el acceso y definir límites de uso." },
  browserRendering: { label: "Navegador remoto / Browser Rendering", env: "BROWSER_RENDERING_ENABLED", cost: "Puede consumir cuota o generar cargos según proveedor y plan.", function: "Renderizar JavaScript, capturar screenshots y analizar estilos calculados.", activation: "Revisar plan, cuota y proveedor antes de habilitar." },
  flow: { label: "Google Flow", env: null, cost: "Servicio externo de Google; las generaciones consumen créditos según el plan.", function: "Estudio creativo de vídeo e imagen con Gemini Omni, Veo y herramientas visuales.", activation: "Google Flow no ofrece una API pública de integración directa para incrustar su editor en este constructor. La vía integrable es Gemini API y los modelos de generación disponibles." },
  canva: { label: "Canva Connect", env: null, cost: "La Connect API es gratuita para desarrollar e integrar. Algunas funciones requieren Canva Pro/Business/Enterprise o tienen límites de uso; los elementos premium pueden impedir exportaciones.", function: "Conectar diseños, assets, exportaciones y herramientas creativas con autorización OAuth.", activation: "No requiere activar un flag de pago. Requiere credenciales OAuth, cifrado, KV, autorización de Canva y scopes adecuados." }
};

export function integrationEnabled(env, id) {
  const item = CATALOG[id];
  if (!item) return false;
  if (id === "flow") return false;
  if (item.provider) return Boolean(env[item.key] && env[item.model] && env.AGENCY_KV);
  if (id === "canva") return Boolean(env.CANVA_CLIENT_ID && env.CANVA_CLIENT_SECRET && String(env.CANVA_TOKEN_ENCRYPTION_KEY || "").length >= 32 && env.AGENCY_KV);
  if (id === "pagespeed") return Boolean(env.PAGESPEED_API_KEY);
  if (id === "searchConsole") return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_GSC_REDIRECT_URI && env.AGENCY_KV);
  return Boolean(item.env && env[item.env] === "true");
}

export function integrationStatus(env) {
  return Object.entries(CATALOG).map(([id, item]) => ({
    id, label: item.label, enabled: integrationEnabled(env, id),
    status: id === "flow" ? "external_app" : item.provider ? (integrationEnabled(env, id) ? (env.AI_ENABLED === "true" && env.AI_BILLABLE_ENABLED === "true" ? "ready" : "credentials_ready") : "needs_configuration") : id === "canva" ? (integrationEnabled(env, id) ? "configured" : "needs_configuration") : (integrationEnabled(env, id) ? "enabled" : "disabled"),
    externalUrl: item.externalUrl || null,
    costNotice: item.cost, function: item.function, activation: item.activation
  }));
}

export function integrationBlocked(id, item) {
  return new Response(JSON.stringify({
    ok: false, code: "INTEGRATION_DISABLED",
    integration: id, label: item?.label || id,
    error: "Integración desactivada. Esta funcionalidad necesita una API o servicio externo que puede consumir cuota o generar costes. No se realizará ninguna llamada hasta que autorices su activación.",
    costNotice: item?.cost || "Coste y cuotas pendientes de verificar."
  }), { status: 503, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" } });
}

export function requireIntegration(env, id) {
  const item = CATALOG[id];
  return integrationEnabled(env, id) ? null : integrationBlocked(id, item);
}
