# Auditoría técnica y plan de consolidación — 31-10-2026

## Alcance y método

Revisión estática de `main` en el commit `2fcfc9db74839de5092e7c380275ae18dc79d09d`, incluyendo interfaz, persistencia, endpoints, runtime de IA, integraciones, Creative Engine, documentación y workflows. El despliegue de Cloudflare Pages para ese commit fue confirmado como `Success` por la propietaria del proyecto.

Esta revisión no equivale a una prueba E2E con cuenta real, no inspecciona los secretos ni bindings del dashboard de Cloudflare y no demuestra que los proveedores externos estén conectados.

## Hallazgos

### P0 — Persistencia y continuidad del Workspace

- La aplicación principal guarda los proyectos en `localStorage` (`agency-ai-os.projects.v1`), con historial local limitado.
- La interfaz indica expresamente que los proyectos permanecen en el navegador; no existe persistencia central de proyectos en D1 ni autenticación global del Workspace demostrada en el código revisado.
- El módulo Agent Orchestrator vuelve a leer los proyectos desde `localStorage`; otros módulos se abren como vistas/iframes separados.
- La sincronización Drive se dispara desde el guardado local solo cuando hay flags y vinculación; los errores se silencian en el frontend.
- Impacto: no hay garantía de continuidad entre dispositivos, sesiones o navegadores; la fuente de verdad no es central.

**Decisión:** definir un modelo de proyecto compartido y migración versionada antes de añadir más agentes o automatizaciones. Mantener exportación JSON como respaldo. No migrar ni borrar datos locales automáticamente.

### P0 — Workspace y coordinación de agentes

- El dashboard muestra un pipeline visual, pero sus etapas llevan a distintas vistas.
- Agent Studio incorpora un orquestador que recibe un agente/tarea, contexto y resultados previos y devuelve mensajes, tareas, solicitudes de aprobación y handoff.
- La UI principal de Agent Studio usa un iframe de `ai-agent-orchestrator.html`; Creative Engine, SEO y propuesta comercial también se presentan como módulos independientes.
- El endpoint `/api/agent-orchestrator` ejecuta una llamada estructurada para un agente por petición. No se encontró evidencia en la revisión de un scheduler/cola persistente que ejecute automáticamente todas las tareas delegadas hasta completar un workflow, ni de persistencia de mensajes/tareas/aprobaciones en base de datos.
- `/api/web-build` genera una web HTML independiente en una sola llamada al proveedor habilitado; no modifica CMS, hosting ni el sitio original.

**Decisión:** unificar la experiencia en una vista Workspace y construir una orquestación persistente por fases. Las pestañas especializadas deben quedar como herramientas avanzadas, no como pasos manuales.

### P0 — Seguridad de operaciones privadas

- `functions/_lib/owner-auth.js` implementa sesión de propietaria con cookie HttpOnly/Secure/SameSite y KV.
- La protección observada en el historial del proyecto se aplicó a rutas Canva; no se debe inferir que todos los endpoints de proyecto, IA, Drive, Search Console o web-build estén protegidos por la sesión de propietaria.
- Los endpoints revisados de `agent-orchestrator`, `project-assistant` y `web-build` validan entrada y usan el runtime con guardas de coste, pero no invocan directamente `requireOwner` en sus archivos.
- Impacto: antes de habilitar un proveedor de IA o permitir guardar/ejecutar acciones de proyectos, hay que revisar la política de acceso global y aplicar autorización en servidor a endpoints privados. No confiar en ocultar botones en el navegador.

**Decisión:** mapear cada endpoint a público/privado y exigir sesión de propietaria para lectura/escritura de proyectos y acciones internas. Los webhooks públicos futuros deberán tener autenticación propia y verificación de firma.

### P1 — CI y calidad del build

- El despliegue de producción confirmó que Wrangler pudo compilar Pages Functions tras corregir las importaciones relativas en el commit `2fcfc9d`.
- El workflow previo comprobaba sintaxis, imports relativos, tests de Canva y preview, pero no reproducía la compilación real de Pages Functions.
- Se añade a este cambio una compilación de Pages Functions con Wrangler `3.114.17` al workflow de validación. Debe quedar verde en GitHub antes de integrar.
- Se recomienda añadir un workflow de pruebas integrales del frontend y cobertura para cada endpoint crítico.

### P1 — Runtime y coste de IA

- Hay adaptadores para DeepSeek, OpenAI, Gemini, Anthropic y Perplexity.
- Las llamadas requieren `AI_ENABLED=true`, `AI_BILLABLE_ENABLED=true`, proveedor/modelo/clave y `AGENCY_KV`.
- Los límites diarios actuales usan KV y son de mejor esfuerzo; no constituyen un techo monetario atómico bajo concurrencia.
- No se debe activar IA de pago para desarrollar el Workspace. Usar fixtures/simuladores y mantener ambos flags de IA cerrados hasta autorización explícita y límites en el proveedor.

### P1 — Auditoría web y PageSpeed

- `/api/site-audit` rastrea HTML público y genera hallazgos deterministas; no equivale a una auditoría LLM ni a un navegador con renderizado JavaScript.
- El briefing intenta ejecutar PageSpeed móvil y escritorio automáticamente después del rastreo.
- `/api/pagespeed` exige `PAGESPEED_ENABLED=true` y una clave de Google; en el endpoint revisado no se observó un contador diario propio. Hay que comprobar cuotas del proveedor y evitar consultas duplicadas.
- La auditoría de URLs debe someterse a revisión adicional de SSRF/redirecciones y límites de rastreo antes de tratarla como servicio público.

### P1 — Creative Engine

- El módulo existente contiene un laboratorio de preview CSS, controles de color/intensidad y exportación CSS.
- El catálogo distingue APIs disponibles en runtime, herramientas externas y tecnologías manuales.
- Shaders no se carga como runtime WebGPU en el constructor estático; ContentCore está documentado como importación manual; Kittl es acceso externo. No se debe presentar ninguna de esas herramientas como automatización conectada.
- Canva Connect tiene base OAuth/MCP y pruebas de cifrado/KV, pero falta validación E2E con una cuenta real, scopes y exportaciones.
- Decisión: Creative Engine pasa a ser un servicio del Workspace que produce recursos asociados al proyecto, no una pestaña aislada.

### P1 — Entrega

- Hay exportación local de JSON y HTML demostrativo.
- El HTML exportado puede incluir formularios demostrativos sin backend; el README advierte que no se guardan ni envían leads sin endpoint.
- La propuesta comercial y los entregables existen como módulos separados.
- Falta un registro de aprobación/versiones y una canalización que valide assets, formularios, SEO, accesibilidad y seguridad antes de emitir una entrega final.

## Matriz de capacidades

| Capacidad | Estado auditado |
|---|---|
| Despliegue Cloudflare Pages del commit 2fcfc9d | Implementado y confirmado como Success |
| Briefing URL-first y crawler HTML | Implementado; E2E pendiente |
| PageSpeed móvil/escritorio | Implementado; cuota/uso real pendiente |
| Runtime multi-proveedor | Implementado; desactivado por defecto |
| Agente estructurado | Implementado como endpoint por tarea |
| Orquestación automática persistente | No demostrada / pendiente |
| Generación HTML independiente | Implementada; depende de IA habilitada |
| Creative Engine CSS | Implementado |
| Canva OAuth/MCP | Implementado parcialmente; E2E pendiente |
| Shaders / ContentCore / Kittl | Manual o futuro, no automatización completa |
| Persistencia de proyectos centralizada | No implementada |
| Workspace unificado sin navegación manual | Pendiente |
| WhatsApp Business API/webhook | No implementado |
| Calendar / Sheets operativos | No demostrados |
| QA automatizado de previews cliente | Parcial; ampliar |
| Aprobación y publicación controlada | Flujo documentado; completar registro técnico |

## Plan técnico priorizado

### Fase A — Estabilizar el build
1. Ejecutar Wrangler Pages Functions build en CI.
2. Mantener test de resolución de imports.
3. Añadir pruebas de seguridad de rutas y endpoints.
4. No integrar si el build de Functions falla.

### Fase B — Cerrar el perímetro privado
1. Inventariar endpoints y clasificarlos.
2. Aplicar autenticación de propietaria en APIs privadas.
3. Añadir tests 401/403 y pruebas de same-origin/CSRF donde corresponda.
4. Mantener webhooks externos separados y firmados.

### Fase C — Workspace y persistencia
1. Definir esquema D1: projects, project_versions, agent_runs, tasks, messages, approvals, artifacts, audit_events.
2. Añadir migraciones y API de proyectos con validación y autorización.
3. Crear capa de repositorio en frontend: API autenticada como fuente primaria y exportación/importación local como fallback explícito.
4. No eliminar el almacenamiento local hasta verificar migración, recuperación y compatibilidad.
5. Crear Workspace con briefing URL-first, actividad, resultados de agentes, propuesta, QA y entrega en una sola vista.

### Fase D — Orquestación
1. Contratos JSON versionados por agente.
2. Cola/estado persistente de ejecuciones y tareas.
3. Límites de concurrencia, reintentos idempotentes y cancelación.
4. Registro de handoffs y aprobaciones humanas.
5. Tool registry con permisos por acción; ningún agente publica, paga o contacta clientes sin autorización.

### Fase E — Producción creativa y web
1. Vincular assets y versiones creativas al proyecto.
2. Conectar Canva E2E con scopes mínimos y control de licencias.
3. Generar HTML/CSS/JS y backend de formularios según alcance.
4. Validar enlaces, formularios, SEO, accesibilidad, responsive y seguridad.
5. Generar preview privada y paquete exportable.

### Fase F — Integraciones y publicación
1. Simuladores gratuitos primero.
2. WhatsApp, Calendar, Sheets y CRM mediante APIs y webhooks con permisos mínimos.
3. Cuotas y costes documentados antes de activar cada integración.
4. Publicación solo tras aprobación expresa y verificación final.

## Criterios de aceptación global

- Un proyecto se crea una sola vez y conserva su contexto entre módulos y sesiones.
- Workspace muestra qué está haciendo cada agente, resultados, errores y tareas pendientes.
- La delegación de agentes queda guardada y se puede reanudar.
- Los endpoints privados rechazan peticiones sin sesión válida.
- Ningún proveedor de pago se llama con flags desactivados.
- La propuesta y la preview se generan con hechos comprobables y supuestos marcados.
- No se publica ni se contacta a clientes sin aprobación humana.
- CI compila Pages Functions con Wrangler y ejecuta tests automatizados.
