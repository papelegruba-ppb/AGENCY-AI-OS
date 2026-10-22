# Propuesta Comercial — Agency AI OS

## Qué incluye
- `propuesta-comercial.html`: Generador de propuestas visuales con comparador Antes/Después.
- Carga automática de la web real del cliente (iframe) en el lado "Antes" si se introduce una URL.
- Si el iframe falla (por CORS), permite subir capturas manuales.
- Generación automática de un mockup de la propuesta en el lado "Después" basado en el briefing.
- Análisis SEO real integrado (conectado a `/api/seo-audit`).
- Exportación de un HTML autónomo (`propuesta_cliente.html`) con las capturas incrustadas en Base64.

## Cómo se conecta con el resto
- Lee los proyectos guardados en `localStorage` (`agency-ai-os.projects.v1`).
- Se puede lanzar desde la sección "Entregables" o directamente desde el menú lateral.
- Guarda borradores locales en `agency-ai-os.propuesta-comercial.v1`.

## Límites y honestidad
- El lado "Después" es una simulación visual generada con los textos del briefing, no una web publicada.
- Las métricas solo se muestran como "Sin medir" hasta que se introducen manualmente o vía API.
- No se ha probado en todos los navegadores; se recomienda verificar en Chrome, Edge y Safari.