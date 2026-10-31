# Integraciones — estado auditado

## Núcleo de IA

| Integración | Estado en este cambio | Activación / límite |
|---|---|---|
| Runtime multi-proveedor | Implementado en `functions/_lib/ai-runtime.js`; pendiente de pruebas de despliegue | Requiere activación explícita |
| DeepSeek | Adaptador implementado | `DEEPSEEK_API_KEY` + `DEEPSEEK_MODEL` |
| OpenAI API | Adaptador implementado | `OPENAI_API_KEY` + `OPENAI_MODEL`; la suscripción ChatGPT no incluye automáticamente crédito de API |
| Gemini API | Adaptador implementado | `GEMINI_API_KEY` + `GEMINI_MODEL` |
| Anthropic API | Adaptador implementado | `ANTHROPIC_API_KEY` + `ANTHROPIC_MODEL` |
| Perplexity API | Adaptador implementado | `PERPLEXITY_API_KEY` + `PERPLEXITY_MODEL` |
| Orquestador de agentes | Adaptado al runtime común | `/api/agent-orchestrator` |
| Asistente del proyecto | Adaptado al runtime común | `/api/project-assistant` |
| Generador de propuestas | Adaptado al runtime común; conserva el fallback local del frontend | `/api/generate-proposal` |
| Estado de IA | Endpoint informativo, no realiza llamadas al modelo | `GET /api/ai-status` |

### Activación segura de IA en Cloudflare

Por defecto las llamadas están desactivadas. Para activar un proveedor, configurar en el entorno de Cloudflare Pages:

1. `AI_ENABLED=true` (no establecerlo hasta confirmar las condiciones gratuitas y la facturación).
2. `AI_PROVIDER=deepseek|openai|gemini|anthropic|perplexity` (un único proveedor activo por despliegue).
3. La clave y el modelo correspondientes a ese proveedor, con nombres indicados en la tabla.
4. Binding KV `AGENCY_KV`, que ya utiliza el proyecto para integraciones de Google.

Límites predeterminados: 20 solicitudes globales/día, 5 solicitudes/día por IP y máximo 1.200 tokens de salida. Se pueden ajustar con `AI_DAILY_LIMIT`, `AI_IP_DAILY_LIMIT` y `AI_MAX_OUTPUT_TOKENS`, dentro de los rangos admitidos por el runtime. No hay reintentos ni cambio automático a un proveedor de pago.

**Importante:** Cloudflare KV no ofrece incremento atómico para este contador; los límites son una barrera operativa de mejor esfuerzo, no un tope monetario garantizado. Para garantizar un tope duro frente a concurrencia se necesita un contador atómico (por ejemplo, Durable Objects) y, además, límites de gasto/cuota en el proveedor. Para mantener coste cero confirmado, deja `AI_ENABLED` desactivado hasta verificar el plan gratuito del proveedor seleccionado.

## Otras integraciones existentes

| Integración | Estado observado en código | Riesgo / verificación pendiente |
|---|---|---|
| Google Drive OAuth | Endpoints `drive-auth`, `drive-callback` y `drive-save`; usa `AGENCY_KV` y credenciales Google | Verificar redirect URI, estado OAuth/CSRF, manejo de errores y sincronización real |
| Google Search Console | OAuth y consulta de datos en `gsc-auth`, `gsc-callback`, `gsc-data` | Requiere permisos y APIs habilitadas; comprobar cuota y vinculación real |
| PageSpeed Insights | `/api/pagespeed` usa `PAGESPEED_API_KEY` | No se observó en el endpoint un límite diario propio; configurar cuotas de Google y monitorizar consumo |
| Auditoría HTML | `/api/site-audit` descarga y analiza HTML público sin LLM | No es una integración LLM; revisar protección de SSRF/redirecciones y límites de peticiones |
| GitHub | Repositorio y despliegue vinculado según configuración del proyecto | El código del repositorio no demuestra por sí solo que un despliegue concreto esté actualizado |
| Firebase / Google Cloud | No se encontraron en esta revisión evidencias suficientes para afirmar que el runtime actual use Firebase o servicios adicionales de Google Cloud | Confirmar consola, bindings, proyecto y reglas antes de atribuirles funciones activas |
| Claude / Flow en aplicación web | No hay integración API demostrada por tener acceso a sus aplicaciones | Usar manualmente salvo que exista una API/conector autorizado y condiciones compatibles |

No se deben publicar secretos en el frontend ni en el repositorio. La existencia de una clave en Cloudflare no demuestra que el proveedor responda, que la cuota esté disponible o que el plan sea gratuito.


## Creative Engine — herramientas visuales evaluadas (31-10-2026)

| Herramienta | Decisión | Integración actual | Condiciones |
|---|---|---|---|
| Shaders (shaders.com) | Adoptar como motor visual opcional | Módulo Creative Engine con preview CSS, exportación CSS y guía de integración. No se carga el runtime WebGPU en el constructor estático. | Motor/componentes y bindings MIT. El catálogo de presets y secciones tiene licencia separada; verificar plan antes de usar contenido Pro en trabajos de cliente. WebGPU no tiene fallback WebGL oficial: conservar CSS. |
| ContentCore (contentcore.xyz) | Herramienta manual de producción | Enlace contextual desde Creative Engine; importación manual de imágenes/vídeos exportados. | El sitio describe exportación de imágenes/vídeos y licencia comercial mediante suscripción. No se verificó API pública ni automatización. |
| is.graphics | No incorporar todavía | Candidato pendiente de auditoría. | El sitio no fue accesible durante la verificación; no se pudieron confirmar funciones, API ni licencia. |

### Shaders en un futuro build frontend

El repositorio actual se ejecuta como HTML/CSS/JS estático sin bundler. No se añade el paquete como dependencia ni una importación CDN no soportada. Cuando se adopte un build cliente compatible:
- Instalar el paquete oficial shaders y usar el binding del framework correspondiente.
- Renderizar efectos solo en componentes cliente; comprobar WebGPU y conservar un fondo CSS alternativo.
- Respetar prefers-reduced-motion y limitar área/cantidad de canvas.
- Desactivar telemetría si el producto lo requiere mediante la opción documentada.
- No redistribuir presets/sections Pro como biblioteca propia; revisar la licencia de cada asset.

### Flujo de assets ContentCore

La primera versión es manual: crear/exportar el asset, descargarlo, revisar licencia y consentimiento, optimizarlo (AVIF/WebP para imágenes; MP4/WebM para vídeo) e incorporarlo a assets/ o al gestor de medios del proyecto. No guardar credenciales de ContentCore en Agency AI OS.

Fuentes oficiales:
- https://shaders.com/docs/guide
- https://shaders.com/license
- https://github.com/shader-effects-inc/shaders
- https://contentcore.xyz/
- https://is.graphics/
