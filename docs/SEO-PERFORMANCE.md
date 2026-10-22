# SEO & Performance — Agency AI OS

## Qué incluye
- seo.html: interfaz de auditoría SEO y rendimiento.
- functions/api/pagespeed.js: Cloudflare Pages Function que consulta la API oficial Google PageSpeed Insights v5.
- index.html: enlace al módulo SEO & Performance en la navegación principal.

## Datos reales y límites
- Las puntuaciones Lighthouse, auditorías y métricas proceden de la respuesta real de Google. Si Google no devuelve una categoría o dato de campo, la interfaz indica que no está disponible; no inventa una puntuación.
- La auditoría cubre rendimiento, accesibilidad, buenas prácticas y SEO on-page detectables por Lighthouse.
- No replica Semrush: no ofrece bases de datos de backlinks, volumen de búsquedas, dificultad de palabras clave ni visibilidad competitiva.
- Para clics, impresiones, consultas y posición media, conecta Search Console con autorización del propietario de la web.
- El módulo debe servirse en Cloudflare Pages. Abrirlo con file:// no activa la ruta /api/pagespeed.

## Despliegue en Cloudflare Pages
1. Despliega esta rama en Cloudflare Pages.
2. Abre /seo.html en el mismo dominio de la aplicación.
3. Prueba con un dominio público y estrategia móvil; después cambia a escritorio.
4. Opcional: configura PAGESPEED_API_KEY en Settings → Variables and Secrets de Cloudflare Pages. Guárdala como secreto de entorno, nunca en HTML o app.js.
5. Restringe la clave en Google Cloud a PageSpeed Insights y configura cuotas/alertas. Aplica límites de tasa de Cloudflare si la app se comparte públicamente, porque el endpoint puede consumir cuota.

## Comprobación funcional
- Valida URL y estrategia en cliente y servidor.
- Solo permite HTTP/HTTPS y hostnames públicos; rechaza credenciales embebidas, hosts locales y direcciones IP literales.
- Errores de Google, cuotas y tiempos de espera se muestran sin sustituirlos por datos ficticios.
- Los informes se exportan a JSON y las auditorías a CSV.
- No se ha verificado un despliegue real en Cloudflare desde este cambio; tras desplegar, realizar una prueba de humo con una URL pública.

## Referencias oficiales
- https://pagespeed.web.dev/
- https://developers.google.com/speed/docs/insights/v5/get-started
- https://search.google.com/search-console/about
- https://www.semrush.com/lp/seo-ideas/en/