# Agency AI OS — constructor y backend en evolución

Constructor visual para organizar proyectos digitales, preparar una primera propuesta de siete agentes y exportar entregables.

## Qué incluye

- Dashboard y flujo de agentes: Marketing, UX/UI, Creative Coding & Motion UX, Frontend, Backend, SEO y WhatsApp.
- Formulario de briefing para proyectos.
- Guardado local con `localStorage`.
- Vista de proyectos y entregables.
- Exportación de planes en JSON y de una landing HTML demostrativa.
- Generación de propuesta de copy, guía visual, plan de motion, requisitos frontend/backend, SEO, flujo conversacional y estado QA.
- AI Agent Orchestrator: chat de prompt único, auditoría opcional de la web de referencia, generación coordinada de una nueva web HTML, vista previa y descarga.
- Creative Engine: catálogo de IA, diseño, vídeo, web y 3D; Canva Websites/Apps, Kittl, Shaders y proveedores externos con su estado de integración visible.
- Sin dependencias de build ni claves API.

## Importante: límites de esta primera versión

La interfaz conserva generación local, exportación y persistencia en el navegador. El repositorio también contiene Cloudflare Pages Functions para auditoría, PageSpeed, Google Drive/Search Console y generación/asistencia mediante IA. La disponibilidad real depende de las variables y bindings configurados en Cloudflare. El HTML exportado valida el formulario en el navegador, pero no guarda ni envía leads sin un endpoint específico.

No pegues información sensible en este prototipo.

## Ejecutar localmente

1. Descomprime la carpeta.
2. Abre `index.html` en un navegador moderno. La app no requiere build.
3. Para probar el despliegue local por HTTP, puedes ejecutar `python -m http.server 8000` dentro de la carpeta y abrir `http://localhost:8000`.

## Preview compartida desde Visual Studio Code

Abre el repositorio en VS Code y ejecuta **Terminal → Run Task… → Agency AI OS: iniciar preview seguro**. Después, en la vista **Ports**, reenvía el puerto 8000. La visibilidad predeterminada es **Private**; solo cambia a **Public** para compartir una demo temporal con quien tenga la URL. El servidor integrado sirve únicamente assets web permitidos y bloquea rutas privadas del repositorio. Consulta [docs/VSCODE-PORT-FORWARDING.md](docs/VSCODE-PORT-FORWARDING.md).

Comandos equivalentes: `npm run preview` y `npm run test:preview`. Requiere Node.js 22+. Esta preview es estática: no ejecuta Pages Functions ni sustituye a Wrangler/Cloudflare Pages. Nunca publiques un puerto que contenga datos reales, secretos o servicios administrativos.

## Publicar gratis en Cloudflare Pages

Para esta versión estática:

1. Sube el contenido de la carpeta a un repositorio GitHub.
2. En Cloudflare, abre Workers & Pages y crea una aplicación Pages conectada al repositorio.
3. Selecciona el framework `None`.
4. Deja el comando de build vacío.
5. Define el directorio de salida como `/` (raíz del repositorio).
6. Despliega y comprueba el dominio `pages.dev` asignado.

Los proveedores cambian condiciones y cuotas; comprueba los límites actuales antes de depender de un servicio. No necesitas pagar para probar una versión estática dentro de las cuotas gratuitas aplicables.

## Archivos principales

- `index.html`: interfaz de la aplicación.
- `styles.css`: diseño responsive.
- `app.js`: navegación, estado local, plantillas, exportaciones.
- `bot-flow-template.json`: ejemplo de flujo conversacional.
- `wrangler.toml`: configuración inicial opcional de Pages/Workers.
- `creative-engine.html`: laboratorio visual y exportador CSS.
- `DESIGN.md`, `ARCHITECTURE.md`, `INTEGRATIONS.md`, `ROADMAP.md`, `CLAUDE.md`: documentación viva del proyecto.

## Núcleo multi-IA y protección de consumo

El núcleo multi-IA integrado en `main` incorpora un runtime común para DeepSeek, OpenAI API, Gemini API, Anthropic API y Perplexity API. Las llamadas quedan desactivadas por defecto y requieren `AI_ENABLED=true`, un proveedor y modelo explícitos, su clave de servidor y el binding `AGENCY_KV`. Los límites predeterminados son 20 solicitudes globales al día, 5 por IP/día y 1.200 tokens de salida. Los contadores KV son una protección operativa de mejor esfuerzo, no un tope monetario exacto; también deben configurarse límites en el proveedor. Consulta `INTEGRATIONS.md` antes de activar cualquier API.

## Siguiente fase para convertirlo en un producto con IA real

1. Elegir proveedor de modelo y añadir un backend que mantenga las claves secretas.
2. Convertir cada agente en una tarea estructurada con entrada/salida JSON y validación.
3. Guardar proyectos en una base de datos y añadir autenticación si se requiere acceso remoto.
4. Implementar colas/reintentos, logs y control de costes.
5. Conectar el formulario a una API real.
6. Integrar WhatsApp Business Platform mediante un proveedor autorizado y configurar webhooks.
7. Ejecutar pruebas automatizadas y comprobaciones de seguridad.


## Creative Engine

El módulo Creative Engine añade previsualización CSS, controles de color/intensidad/movimiento y exportación de fondos CSS. Incluye una guía para adoptar Shaders en un futuro build cliente. No carga WebGPU ni dependencias externas en el constructor estático. ContentCore queda como flujo manual de assets; is.graphics sigue pendiente de verificar. Consulta INTEGRATIONS.md para licencias y límites.


## AI Agent Orchestrator

Abre **AI Agent Orchestrator** desde la navegación. Describe en un único prompt el cambio deseado; el sistema comparte el briefing, intenta auditar la web pública y genera una versión web integrada para previsualizar y descargar. Si no existe integración autorizada para modificar el CMS o hosting original, genera una web nueva independiente. No publica ni modifica DNS/producción.

Endpoint: `POST /api/web-build`. Requiere el runtime multi-IA activo y configurado en Cloudflare. La ejecución actual utiliza el proveedor seleccionado en `AI_PROVIDER`; no realiza failover automático ni opera automáticamente editores externos sin API/conector autorizado.
