# Workspace compartido con Cloudflare D1

## Binding requerido

En Cloudflare Dashboard → Workers & Pages → agency-ai-os → Settings → Functions → D1 database bindings:

- Variable name: `AGENCY_DB`
- D1 database: crea una base llamada `agency-ai-os` (o selecciona una existente vacía).

Aplica `migrations/0001_shared_workspace.sql` desde la consola D1 antes de habilitar el Workspace compartido.

## Seguridad

- Los endpoints `/api/projects` requieren la sesión de propietaria creada por `/api/owner-login`.
- También requieren petición same-origin y binding D1.
- La contraseña `OWNER_PASSWORD` y el KV `AGENCY_KV` existentes siguen siendo necesarios.
- No se usa localStorage como fuente central. La migración de proyectos locales debe ser explícita y confirmada por la propietaria.
- La API limita el tamaño del registro a 900 KB y a 100 proyectos por cuenta.

## Endpoints

- GET `/api/projects`: lista proyectos del Workspace.
- POST `/api/projects`: crea/actualiza un proyecto.
- DELETE `/api/projects?id=<id>`: elimina un proyecto.
- Todas las rutas requieren sesión de propietaria y D1.

## Importante

El binding D1 no está disponible hasta configurarlo en Cloudflare. Sin él, la API responde `D1_NOT_CONFIGURED` y no escribe datos. No se activa ningún proveedor de pago.
