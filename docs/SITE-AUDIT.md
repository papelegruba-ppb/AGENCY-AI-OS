# Análisis automático de una web

## Uso
1. Abre **Nuevo proyecto**.
2. Introduce una URL pública completa, incluyendo `https://`.
3. Pulsa **Analizar web**.
4. Revisa los datos detectados y completa audiencia y objetivo comercial antes de generar el proyecto.
5. Guarda el proyecto. El análisis se conserva dentro del proyecto y aparece como entregable exportable.

## Qué intenta extraer
- Nombre de marca y metadatos de la página.
- Descripción, encabezados y fragmentos de texto de hasta siete páginas públicas del mismo sitio.
- Logotipo/favicon, imagen Open Graph e imágenes enlazadas mediante etiquetas HTML.
- Correos, enlaces telefónicos, dirección en etiquetas `address` o datos estructurados JSON-LD.
- Enlaces sociales, enlaces internos y posibles colores HEX presentes en el HTML.

## Limitaciones
- No ejecuta JavaScript de la página ni puede leer contenido que solo aparece tras iniciar sesión, pagar o completar formularios.
- Los sitios que dependen mucho de JavaScript, bloquean bots, usan captchas o no permiten solicitudes del servidor pueden devolver pocos datos o fallar.
- El rastreo está limitado a siete páginas para reducir tiempo y carga. No es un rastreo exhaustivo de todo el dominio.
- Los colores HEX detectados son candidatos encontrados en el HTML, no una extracción fiable del sistema visual completo.
- La audiencia y el objetivo comercial no se pueden deducir con fiabilidad de una web; se marcan como pendientes de confirmar.
- Las imágenes se muestran y exportan como URL originales; no se descargan ni se copian a los assets del proyecto.
- Los datos deben revisarse manualmente antes de reutilizarlos. Respeta derechos de autor, privacidad, condiciones del sitio y normativa aplicable.

## Endpoint
`POST /api/site-audit`

Body JSON:
```json
{ "url": "https://example.com" }
```

La función valida el esquema HTTP/HTTPS, bloquea hosts locales/IP literales y puertos no estándar, limita redirecciones, el tiempo de espera y el número de páginas. Esta validación reduce riesgos, pero debe revisarse antes de usar el rastreador a gran escala.


## SEO y rendimiento
Tras la extracción inicial, el panel permite lanzar una auditoría móvil y otra de escritorio mediante la función existente `GET /api/pagespeed?url=...&strategy=mobile|desktop`. Se guardan las puntuaciones Lighthouse de rendimiento, SEO, accesibilidad y buenas prácticas, métricas de laboratorio e incidencias priorizadas. Los resultados pueden variar entre ejecuciones; los datos de laboratorio no son una garantía de la experiencia de todos los usuarios.

## Copiloto IA
El panel de chat usa `POST /api/project-assistant`, que llama a OpenAI Responses API desde el servidor. Para habilitarlo, configura en Cloudflare Pages → Settings → Environment variables:
- `OPENAI_API_KEY`: clave secreta de la API de OpenAI.
- `OPENAI_MODEL` (opcional): modelo habilitado para el proyecto; si se omite, usa `gpt-6-luna`.

No pongas la clave en HTML, JavaScript del navegador ni en Git. Las solicitudes a la API pueden generar costes según el modelo y el uso; la API no debe asumirse incluida en una suscripción de ChatGPT. El panel muestra un error de configuración si falta la clave.

El copiloto recibe el briefing y un resumen limitado de la auditoría, recomienda prioridades y puede proponer cambios en campos editables. Los cambios requieren que el usuario pulse **Aplicar al briefing**; después debe revisar y guardar el proyecto. En esta fase no modifica directamente el sitio original del cliente, no despliega cambios públicos ni ejecuta código arbitrario.

## Alcance de esta versión
La auditoría y el copiloto son herramientas de apoyo, no sustituyen la revisión profesional. Para editar el sitio original, desplegarlo o aplicar cambios estructurales al código generado se requiere una fase posterior con versiones, previsualización, comparación y aprobación explícita.
