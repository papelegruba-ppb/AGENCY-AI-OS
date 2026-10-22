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
