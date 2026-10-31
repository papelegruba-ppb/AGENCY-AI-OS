# Acceso privado de propietaria

Esta capa protege las rutas de Canva con una sesión de propietaria. No reemplaza una protección de acceso global de todo el sitio: los archivos estáticos y las demás APIs no quedan privados por este cambio.

## Configuración necesaria en Cloudflare Pages

En Settings > Variables and Secrets, configura:

- `OWNER_PASSWORD`: una contraseña larga, única y aleatoria. Añádela como **Secret**, no como variable de texto.
- Binding KV `AGENCY_KV`: el namespace KV existente usado por el proyecto.

No reutilices la contraseña de Canva ni publiques secretos en GitHub. Si no están configurados ambos valores, el inicio de sesión falla cerrado.

## Uso

1. Despliega este cambio en Pages.
2. Abre `https://<tu-dominio>/owner.html`.
3. Introduce la contraseña configurada en `OWNER_PASSWORD`.
4. El backend establece una cookie `__Host-`, Secure, HttpOnly y SameSite=Strict, con sesión de 12 horas.
5. Las rutas bajo `/api/canva/*` requieren una sesión activa.
6. Cierra la sesión llamando a `POST /api/owner-logout`.

La sesión se almacena en KV mediante el hash SHA-256 de un token aleatorio; el token original solo se entrega en la cookie HttpOnly. Se aplican ocho intentos de login por IP cada 15 minutos. Los contadores KV son un límite operativo de mejor esfuerzo, no un rate limiter atómico.

## Endpoints

- `POST /api/owner-login`: recibe JSON `{"password":"…"}`.
- `GET /api/owner-status`: informa si el acceso está configurado y la sesión autenticada.
- `POST /api/owner-logout`: invalida la sesión.
- `GET /api/canva/status`: estado protegido de credenciales y conexión Canva.

## Límites importantes

- Este cambio no implementa todavía el OAuth de Canva ni el transporte MCP. No registres una Redirect URL en Canva basándote en esta entrega.
- El endpoint de estado no marca la cuenta como conectada solo por tener Client ID y Client Secret.
- La protección se aplica a `/api/canva/*`, no al resto de la web ni a todas las APIs heredadas. No guardar ni mostrar información privada en las demás rutas hasta ampliar la protección.
- Para hacer privado el sitio completo habría que añadir un gate global, teniendo en cuenta el enrutamiento de Pages y las rutas de assets; esta entrega evita romper la navegación pública existente.
