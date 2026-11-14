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
| Kittl | Acceso externo adoptado en el catálogo | Enlace desde Creative Engine para identidad visual y diseño gráfico. | No se ha verificado API pública ni edición embebida; uso externo/manual. |

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


## AI Agent Orchestrator y generación web autónoma

- La navegación principal abre ahora `ai-agent-orchestrator.html`, el chat de ejecución con un único prompt y una vista previa consolidada.
- `functions/api/web-build.js` genera una web HTML5 autocontenida mediante el proveedor de IA habilitado en el runtime común. El prompt coordina las disciplinas de dirección, marketing/CRO, UX/UI, frontend, SEO y QA en una única ejecución para evitar multiplicar llamadas y consumo.
- Si no hay un conector autorizado para escribir en el CMS/hosting del sitio original, el flujo genera una web nueva e independiente, con vista previa y descarga HTML. No modifica la web original, DNS ni producción.
- La auditoría de una URL pública se intenta antes de generar, cuando existe dominio en el proyecto. Los datos auditados se tratan como contenido externo no confiable.
- El endpoint exige `AI_ENABLED=true`, proveedor, clave, modelo y binding `AGENCY_KV`. Si la IA está desactivada o no configurada, no se inventa un resultado: se muestra el error de configuración.
- La ejecución actual usa el proveedor API configurado en `AI_PROVIDER`; no existe todavía failover automático entre proveedores ni automatización de acciones dentro de Canva, Kittl, Flow, ContentCore, Runway o Firefly. El catálogo los presenta como herramientas externas hasta verificar conectores/API.
- El HTML se devuelve para previsualización/descarga; no se despliega ni se guarda en el hosting del cliente.



## Panel de diagnóstico IA en Configuración

La vista Configuración consulta `GET /api/ai-status` sin caché y presenta el estado de los tres interruptores de seguridad, el binding AGENCY_KV y la preparación individual de cada proveedor. Es un panel estrictamente informativo: no muestra claves, no permite activar variables ni realiza llamadas a modelos. El botón de actualización solo repite la consulta de estado.


## Conectores de datos globales (Ahrefs + Microsoft Clarity)

- Los conectores Ahrefs y Microsoft Clarity son servicios generales de Agency AI OS; no se vinculan a un proyecto del constructor ni rellenan briefings.
- Consola privada: `integrations.html`, accesible desde la navegación principal y protegida por sesión de propietario.
- Ahrefs: `GET /api/integrations/ahrefs?metric=domain-rating&target=example.com`; secreto global `AHREFS_API_KEY`; lista permitida de endpoints y caché KV de 6 horas.
- Clarity: `GET /api/integrations/clarity?numOfDays=1&dimension1=URL`; secreto global `CLARITY_API_TOKEN`; requiere `AGENCY_KV`; caché KV de 4 horas y guardia preventiva local de 8 llamadas/día.
- Microsoft Clarity emite tokens por proyecto Clarity. El conector es global para Agency AI OS, pero el token determina el proyecto Clarity consultado. No existe un parámetro projectId en este endpoint.
- Ambos proxies requieren sesión de propietario y validación same-origin. No devuelven secretos al navegador.
- La guardia basada en KV es de mejor esfuerzo, no atómica. La cuota oficial de Clarity sigue siendo 10 llamadas por proyecto y día; la API devuelve datos de 1–3 días, máximo 3 dimensiones, 1.000 filas y zona horaria UTC.
- Estado de implementación: código en rama `feat/global-ahrefs-clarity-connectors`; falta configurar secretos/binding en Cloudflare y realizar pruebas de extremo a extremo.


## Social Media Studio y conectores sociales (alcance global)

### Estado comprobado en código
- UI en `social-studio.js` y `social-studio.css`.
- Endpoint `POST /api/social-studio`, protegido por sesión privada y validación same-origin.
- Generación de contenido para Instagram, TikTok, Facebook, LinkedIn y YouTube Shorts usando el runtime IA.
- Historial local por proyecto, copia y guardado de paquetes.
- El endpoint devuelve `publication: manual-approval-required`: no publica ni programa contenido.
- No se encontró implementación OAuth de redes, almacenamiento de tokens sociales, sincronización de métricas ni cola de publicaciones.

### Decisión
Social Media Studio pasa a ser una capacidad global de Agency AI OS. El módulo debe permitir campañas y cuentas conectadas, calendario multicanal, producción adaptada por plataforma, aprobación humana, publicación programada cuando la API oficial lo permita, analítica y reporting. Las cuentas se asignarán explícitamente a proyectos autorizados; nunca se mezclan datos de proyectos.

### Plataformas previstas
- Meta Graph API: Instagram profesional y Facebook Pages.
- Threads API.
- LinkedIn API.
- TikTok Content Posting API.
- YouTube Data API.
- Pinterest API.
- X API solo tras comprobar plan, coste, cuotas y acceso.

No se utilizarán scraping, endpoints privados ni automatización de navegador para eludir permisos. Cada proveedor requiere validar documentación, scopes, revisión de aplicación, cuotas y formatos actuales antes de activar el adaptador.

### Arquitectura objetivo
- Adaptadores independientes por plataforma en `functions/_lib/social/`.
- Endpoints OAuth, callbacks, cuentas, publicaciones y métricas en `functions/api/social/`.
- D1 para cuentas, campañas, aprobaciones, publicaciones, métricas y auditoría; R2 para assets privados.
- KV solo para estado temporal/caché; colas o Durable Objects para idempotencia, límites y ejecución programada.
- Secretos y tokens solo en servidor, cifrados en reposo y revocables.
- Aprobación humana obligatoria antes de acciones públicas; registro verificable del resultado.

Plan detallado, fases, criterios de aceptación y límites: `docs/SOCIAL-INTEGRATIONS.md`.

Estado: **plan de arquitectura añadido; conectores OAuth/publicación/analítica todavía no implementados**. No activar gasto ni servicios de pago sin autorización.
