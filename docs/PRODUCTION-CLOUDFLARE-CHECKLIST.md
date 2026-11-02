# Checklist de producción — Cloudflare Pages

Esta guía prepara el entorno real sin activar proveedores facturables por accidente. Los nombres de bindings y variables deben coincidir exactamente con el código.

## 1. Confirmar el proyecto Pages

- Proyecto: \`agency-ai-os\`.
- Framework: None / sitio estático con Cloudflare Pages Functions.
- Build command: vacío.
- Build output directory: \`/\` (raíz del repositorio).
- Mantener previews por PR y producción desde \`main\`.
- No copiar secretos al repositorio ni al frontend.

## 2. Bindings obligatorios

En Workers & Pages → agency-ai-os → Settings → Functions:

| Tipo | Variable/binding | Uso |
|---|---|---|
| KV | \`AGENCY_KV\` | Sesiones de propietaria, OAuth y límites de IA |
| D1 | \`AGENCY_DB\` | Workspace compartido, metadatos y eventos |
| R2 | \`AGENCY_FILES\` | Archivos privados del proyecto |
| Workers AI | \`AI\` | Agency Mini AI, runtime de Cloudflare |

El binding R2 debe apuntar a un bucket privado. No habilites URL pública \`r2.dev\` ni dominio público.

## 3. D1: aplicar migraciones en orden

En la base D1 enlazada como \`AGENCY_DB\`, ejecutar:

1. \`migrations/0001_shared_workspace.sql\`
2. \`migrations/0002_project_files.sql\`
3. \`migrations/0003_project_file_chunks.sql\`

No ejecutar las migraciones sobre una base distinta de la enlazada a Pages. Confirmar que se han creado las tablas antes de conectar el Workspace. La aplicación no debe borrar ni sobrescribir proyectos locales automáticamente.

## 4. Secrets y variables

Crear como **Secrets**, no como variables públicas:

- \`OWNER_PASSWORD\`: contraseña larga y única de la propietaria.
- \`DEEPSEEK_API_KEY\`: conservarla almacenada, pero no habilitarla mientras se valida Agency Mini AI.

Para el primer arranque de Agency Mini AI, añadir como variables de entorno:

- \`AI_ENABLED=true\`
- \`AI_WORKERS_ENABLED=true\`
- \`AI_WORKERS_DAILY_LIMIT=5\` (opcional; 5 es también el valor predeterminado).

No establecer \`AI_BILLABLE_ENABLED=true\` ni \`AI_SPEND_AUTHORIZED=true\`. No configurar \`AI_PROVIDER=deepseek\` para esta primera prueba. La prioridad es probar Cloudflare Workers AI sin llamadas a proveedores externos. La cuota y las condiciones del plan Cloudflare siguen aplicándose; no se debe prometer coste cero absoluto.

Si en el futuro se autoriza DeepSeek u otro proveedor externo, revisar precio/cuota primero y habilitarlo por separado. No mantener dos proveedores habilitados esperando failover automático: el runtime no hace fallback entre proveedores.

## 5. Integraciones opcionales

Activar solo después de que el Workspace y Agency Mini AI pasen las pruebas:

- Canva: Client ID, Client Secret, \`CANVA_TOKEN_ENCRYPTION_KEY\`, \`AGENCY_KV\` y Redirect URI exacta de producción.
- Google Drive: \`GOOGLE_DRIVE_ENABLED\`, credenciales OAuth y redirect URI exacta.
- Search Console: credenciales OAuth y \`GOOGLE_GSC_REDIRECT_URI\`.
- PageSpeed: \`PAGESPEED_API_KEY\` y cuotas de Google revisadas.
- WhatsApp Business: todavía requiere implementación de webhook, verificación de firma, plantillas aprobadas y pruebas con número de prueba; no marcarlo como conectado solo por crear una variable.
- Composio y TinyFish: validar conector, permisos, cuota y operaciones reales antes de declararlos integrados en el producto.

## 6. Prueba de arranque

1. Desplegar el commit validado en Pages.
2. Abrir el dominio de producción y entrar en el Workspace con \`OWNER_PASSWORD\`.
3. Confirmar \`GET /api/owner-status\` → \`configured: true\`, \`authenticated: true\`.
4. Confirmar \`GET /api/ai-status\` → \`workersAi.configured: true\`, \`executionAuthorized: true\`, proveedor \`cloudflare\`.
5. Confirmar que el estado de integraciones responde tras iniciar sesión.
6. Crear un proyecto de prueba y confirmar persistencia en D1.
7. Cerrar sesión y comprobar que las APIs privadas responden 401.
8. Volver a iniciar sesión y probar una petición de Agency Mini AI con datos no sensibles.
9. Revisar logs de Pages Functions y uso de Workers AI.
10. Probar exportación HTML, formularios, SEO, responsive y descarga en móvil y escritorio.

## 7. Criterios de aceptación

- Sin sesión, ninguna API privada puede ejecutar IA, consultar PageSpeed, rastrear webs ni modificar Drive/Search Console.
- Sin D1, el Workspace compartido muestra un error claro y conserva el respaldo local.
- Sin R2, la biblioteca de archivos no debe fingir que el archivo se ha guardado.
- Sin binding AI o con flags cerrados, Agency Mini AI informa que está desactivada y no llama a un modelo.
- El proveedor externo no se invoca sin autorización explícita de gasto.
- No se declara WhatsApp, Canva, Google ni otra integración conectada sin una prueba real de extremo a extremo.
