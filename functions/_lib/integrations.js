const CATALOG = {
  ai: { label: "Modelos de IA externos", env: "AI_BILLABLE_ENABLED", cost: "Puede generar cargos por tokens o solicitudes.", function: "Generación de copy, propuestas y coordinación de agentes.", activation: "Revisar proveedor, modelo, tarifa y límites antes de habilitar." },
  pagespeed: { label: "Google PageSpeed Insights", env: "PAGESPEED_ENABLED", cost: "API sujeta a cuotas y límites del proveedor; revisar condiciones vigentes.", function: "Lighthouse móvil y escritorio.", activation: "Habilitar solo tras revisar cuota y condiciones de Google." },
  googleDrive: { label: "Google Drive", env: "GOOGLE_DRIVE_ENABLED", cost: "La API puede ser gratuita dentro de cuotas; almacenamiento y uso dependen de la cuenta.", function: "Copias de seguridad externas.", activation: "Autorizar explícitamente la sincronización externa." },
  whatsapp: { label: "WhatsApp Business Platform", env: "WHATSAPP_ENABLED", cost: "Puede generar cargos por conversaciones y proveedor.", function: "Mensajería real con clientes.", activation: "Configurar Meta Cloud API, webhook, plantillas y presupuesto." },
  googleCalendar: { label: "Google Calendar API", env: "GOOGLE_CALENDAR_ENABLED", cost: "La API puede no tener coste directo, pero depende de la cuenta y del uso asociado.", function: "Consultar disponibilidad y crear citas.", activation: "Configurar OAuth y autorizar acceso al calendario." },
  googleSheets: { label: "Google Sheets API", env: "GOOGLE_SHEETS_ENABLED", cost: "Sujeta a cuotas y límites de Google.", function: "Importar o sincronizar datos externos.", activation: "Autorizar el acceso y definir límites de uso." },
  browserRendering: { label: "Navegador remoto / Browser Rendering", env: "BROWSER_RENDERING_ENABLED", cost: "Puede consumir cuota o generar cargos según proveedor y plan.", function: "Renderizar JavaScript, capturar screenshots y analizar estilos calculados.", activation: "Revisar plan, cuota y proveedor antes de habilitar." },
  canva: { label: "Canva Connect", env: "CANVA_ENABLED", cost: "Depende del plan y de los límites de Canva.", function: "Diseños y gestión de assets.", activation: "La conexión OAuth existente no habilita por sí sola generación automática; revisar scopes y permisos." }
};

export function integrationEnabled(env, id) {
  const item = CATALOG[id];
  return Boolean(item && env[item.env] === "true");
}

export function integrationStatus(env) {
  return Object.entries(CATALOG).map(([id, item]) => ({
    id, label: item.label, enabled: integrationEnabled(env, id),
    status: integrationEnabled(env, id) ? "enabled" : "disabled",
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
