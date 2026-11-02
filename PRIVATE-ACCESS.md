# Acceso privado de propietaria

La sesión de propietaria protege las operaciones internas del Workspace. Los archivos estáticos de la aplicación siguen siendo accesibles públicamente; no se deben colocar secretos ni datos privados en el frontend.

## Configuración necesaria en Cloudflare Pages

En Settings → Variables and Secrets:

- \`OWNER_PASSWORD\`: contraseña larga, única y aleatoria, guardada como **Secret**.
- Binding KV \`AGENCY_KV\`: namespace KV utilizado para sesiones, OAuth y límites de uso.

No reutilices contraseñas ni publiques secretos en GitHub. Si falta cualquiera de los dos valores, el inicio de sesión falla cerrado.

## Uso

1. Abre el dominio de Agency AI OS.
2. Pulsa **Conectar nube** o abre \`/owner.html\`.
3. Introduce la contraseña configurada en \`OWNER_PASSWORD\`.
4. El backend establece una cookie \`__Host-agency_owner\`, Secure, HttpOnly y SameSite=Lax, con sesión de 12 horas.
5. Cierra la sesión mediante \`POST /api/owner-logout\`.

La sesión se almacena en KV mediante el hash SHA-256 de un token aleatorio; el token original solo se entrega en la cookie HttpOnly. Se aplican ocho intentos de login por IP cada 15 minutos. Los contadores KV son límites operativos de mejor esfuerzo, no rate limiters atómicos.

## Rutas privadas protegidas

Las rutas siguientes requieren sesión de propietaria y validación same-origin:

- Workspace y ficheros: \`/api/projects\`, \`/api/project-files\`.
- IA y generación: \`/api/chat\`, \`/api/agent-orchestrator\` (POST), \`/api/project-assistant\`, \`/api/generate-proposal\`, \`/api/web-build\`.
- Auditoría y rendimiento: \`/api/site-audit\`, \`/api/seo-audit\`, \`/api/pagespeed\`.
- Integraciones: \`/api/integrations/status\`, \`/api/canva/*\`, \`/api/drive-save\`, \`/api/gsc-data\`.
- OAuth Google: \`/api/drive-auth\`, \`/api/drive-callback\`, \`/api/gsc-auth\`, \`/api/gsc-callback\`.
- Contenido social: \`/api/social-studio\`.

\`/api/owner-login\`, \`/api/owner-status\` y \`/api/owner-logout\` son rutas auxiliares de sesión. Los endpoints informativos \`/api/ai-status\` y GET \`/api/agent-orchestrator\` no ejecutan modelos ni acciones externas.

## OAuth de Google

- Drive usa un \`state\` aleatorio almacenado en KV durante 10 minutos y lo consume una sola vez en el callback.
- Search Console usa un \`state\` aleatorio almacenado en KV durante 10 minutos y lo consume una sola vez.
- La sesión de propietaria debe seguir activa al volver desde Google. Si caduca, inicia sesión y repite la vinculación.
- Los callbacks no deben registrar códigos, tokens ni secretos.

## Límites

- La sesión privada no convierte todos los archivos HTML/CSS/JS estáticos en contenido privado.
- No se debe confiar en ocultar botones en el navegador: la autorización se aplica en servidor.
- Los webhooks públicos futuros deberán usar firma/HMAC, validación de timestamp, protección contra replay y límites propios.
- Antes de exponer nuevas rutas API, clasifícalas como públicas o privadas y añade pruebas 401/403.
