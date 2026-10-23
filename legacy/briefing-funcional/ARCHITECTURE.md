# ARCHITECTURE.md

## MVP actual
- `index.html`: estructura de vistas.
- `styles.css`: tema, layout y responsive.
- `app.js`: estado, plantillas y exportaciones.
- `localStorage`: persistencia local no sincronizada.
- No hay servidor, autenticación, base de datos ni llamadas LLM.

## Flujo actual
Briefing -> `makePlan()` -> plan JSON local -> visualización de entregables -> exportación JSON/HTML.

## Arquitectura objetivo (fase futura)
- Frontend estático o SPA con rutas.
- API backend (Cloudflare Workers/Pages Functions u otra opción).
- Autenticación y control de acceso si se almacenan datos privados en nube.
- D1/PostgreSQL para proyectos, revisiones y resultados.
- Orquestador que ejecuta agentes como tareas estructuradas.
- Adaptadores de proveedores LLM, secretos solo en servidor.
- Logs de ejecución, control de costes, límites, reintentos y aprobación humana.
- Almacenamiento de archivos cuando el usuario lo solicite.

## Seguridad
No almacenar tokens de proveedores en localStorage. Validar en servidor. Aislar proyectos por usuario cuando se añada auth. Aplicar rate limiting, protección anti-spam y minimización de datos.
