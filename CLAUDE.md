# CLAUDE.md — Agency AI OS

## Misión
Construir una plataforma privada para coordinar proyectos digitales y agentes especializados. Priorizar utilidad real, trazabilidad, seguridad, accesibilidad y entregables verificables.

## Estado actual
MVP estática, sin backend ni llamadas a modelos. Los agentes son plantillas locales; no afirmar que se han ejecutado agentes autónomos. La persistencia usa `localStorage`.

## Flujo de especialistas
1. Marketing & Copywriting
2. UX/UI
3. Creative Coding & Motion UX
4. Frontend
5. Backend
6. SEO
7. WhatsApp Bot
8. QA y consolidación por el orquestador

## Reglas
- Inspeccionar archivos antes de cambiar arquitectura.
- No reemplazar componentes ni borrar datos sin motivo.
- Mantener español como idioma predeterminado de la interfaz.
- No inventar métricas, testimonios, clientes ni capacidades conectadas.
- Separar implementado, probado, simulado y pendiente.
- No exponer secretos en el navegador o repositorio.
- Las operaciones externas sensibles requieren autorización.
- Respetar `prefers-reduced-motion`, teclado y dispositivos táctiles.
- Evitar dependencias nuevas salvo justificación.
- Cada integración debe tener un modo de fallo explícito.

## Stack actual
HTML, CSS y JavaScript sin build. Cloudflare Pages/GitHub Pages compatibles para hosting estático.

## Criterios de aceptación
- La app abre sin proceso de compilación.
- Navegación accesible y responsive.
- Los proyectos se guardan localmente y se pueden exportar.
- Exportaciones JSON válidas.
- El HTML exportado declara que el formulario no tiene backend.
- Ningún test o despliegue se declara exitoso sin ejecutarlo.
