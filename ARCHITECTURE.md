# ARCHITECTURE.md

## Estado observado del repositorio

- `index.html`, `styles.css`, `app.js`: interfaz, estado local, briefing y exportaciones.
- `localStorage`: persistencia local del workspace en el navegador.
- `functions/api/`: endpoints para generación de propuestas, orquestación, asistente de proyecto, auditoría SEO, PageSpeed, Search Console y Drive.
- `functions/_lib/ai-runtime.js`: runtime común para proveedores de IA, activación explícita, validación de configuración, límites de uso y extracción de texto.
- `/api/ai-status`: consulta de estado de configuración sin revelar claves y sin llamar a un modelo.
- `AGENCY_KV`: binding que el código existente utiliza para tokens de Google; el runtime de IA lo requiere también para el contador de solicitudes.

## Núcleo multi-IA

Proveedores soportados por el adaptador: DeepSeek, OpenAI API, Gemini API, Anthropic API y Perplexity API. La configuración selecciona un proveedor por despliegue mediante `AI_PROVIDER`; no se hace fallback automático entre proveedores porque podría convertir un fallo de cuota gratuita en consumo facturable de otro proveedor.

Variables requeridas:
- `AI_ENABLED=true`
- `AI_PROVIDER` con uno de los proveedores admitidos
- Clave y modelo específicos del proveedor
- Binding KV `AGENCY_KV`

Variables opcionales:
- `AI_DAILY_LIMIT` (20 por defecto, máximo admitido 100)
- `AI_IP_DAILY_LIMIT` (5 por defecto, máximo admitido 30)
- `AI_MAX_OUTPUT_TOKENS` (1.200 por defecto, máximo admitido 2.000)

Si falta una configuración, KV no responde o se alcanza el límite, la llamada se bloquea. Las llamadas no se reintentan automáticamente. El runtime no expone claves al navegador y no registra prompts ni secretos.

## Límites reales de la protección de coste

Los contadores usan Cloudflare KV, cuyas escrituras pueden ser eventualmente consistentes y no son un incremento atómico. Por tanto, los límites diarios reducen el riesgo, pero no garantizan un máximo monetario exacto bajo solicitudes concurrentes. Antes de habilitar API se deben configurar las cuotas/límites del propio proveedor. Para una barrera atómica, implementar Durable Objects u otro almacén con operaciones atómicas.

## Integraciones no LLM

- PageSpeed Insights usa una clave Google y tiene límites del proveedor; no se observó un contador diario propio en su endpoint.
- Search Console y Drive utilizan OAuth de Google y el binding `AGENCY_KV`.
- La auditoría SEO descarga HTML público y genera comprobaciones deterministas, no una evaluación LLM.
- En la revisión no se halló evidencia suficiente para afirmar que Firebase o servicios adicionales de Google Cloud estén conectados al runtime actual. Verificar sus consolas y bindings.
- Claude y Flow no se consideran conectados por el hecho de estar disponibles en sus aplicaciones web.

## Seguridad y despliegue

- Mantener secretos solo en variables de entorno del servidor.
- No activar IA hasta confirmar modelo, cuota gratuita y facturación.
- No cambiar a un proveedor alternativo automáticamente.
- Las operaciones externas sensibles requieren controles y aprobación humana.
- El estado de GitHub no demuestra que Cloudflare haya desplegado ese commit. Verificar el último deployment y ejecutar pruebas de extremo a extremo.
