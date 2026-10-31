# Canva MCP — despliegue y conexión

## Arquitectura

- Cliente remoto oficial: `https://api.canva.com/connect/v1/mcp` mediante Streamable HTTP.
- Cliente TypeScript: `@modelcontextprotocol/sdk`.
- OAuth authorization-code + PKCE y descubrimiento de metadatos OAuth gestionados por el SDK MCP.
- Estado OAuth, PKCE verifier, discovery state y tokens se guardan en Cloudflare KV (`AGENCY_KV`).
- Client ID y Client Secret solo se leen desde Cloudflare Secrets (`CANVA_CLIENT_ID`, `CANVA_CLIENT_SECRET`); no se escriben en KV, HTML ni Git.
- Todas las rutas `/api/canva/*`, incluido el callback, requieren sesión de propietaria.

## Configuración Cloudflare Pages

En Workers & Pages > agency-ai-os > Settings:

1. Variables and Secrets:
   - `OWNER_PASSWORD` como Secret (contraseña larga, aleatoria y única).
   - `CANVA_CLIENT_ID` como Secret o variable no sensible (recomendado Secret por uniformidad).
   - `CANVA_CLIENT_SECRET` como Secret.
2. Bindings:
   - KV namespace con binding exacto `AGENCY_KV`.
3. Configurar los valores para Production y Preview solo si se van a probar ambos entornos.
4. Redeploy después de modificar bindings/secrets.

## Redirect URL Canva

Después de desplegar el código en el dominio de producción, registrar exactamente:

`https://agency-ai-os-1cm.pages.dev/api/canva/callback`

Canva Developer Portal > app > Outside Canva > Redirect URLs.

Activar el método **Canva MCP**. No es necesario activar Canva REST APIs para este flujo. No registrar el callback antes de que la ruta esté desplegada.

## Flujo de autorización

1. Abrir `/owner.html` e iniciar sesión.
2. Abrir Creative Engine y pulsar Conectar / autorizar Canva.
3. `GET /api/canva/connect` crea el flujo OAuth MCP y redirige a Canva.
4. Autorizar la cuenta personal.
5. Canva vuelve a `/api/canva/callback`; se valida state y el SDK intercambia el código usando PKCE.
6. Se crea un cliente MCP nuevo, se listan herramientas y se guarda el estado conectado.
7. Creative Engine permite descubrir herramientas y ejecutar una herramienta mediante su esquema de argumentos JSON.

La cookie de propietaria usa SameSite=Lax para que el navegador la envíe en la navegación superior de retorno desde Canva. La defensa CSRF del flujo OAuth depende además del state de un solo uso, PKCE y la validación de issuer del SDK.

## Endpoints protegidos

- `GET /api/canva/status`
- `GET /api/canva/connect`
- `GET /api/canva/callback`
- `GET /api/canva/tools`
- `POST /api/canva/call` con `{"name":"tool-name","arguments":{}}`
- `POST /api/canva/disconnect`

## Pruebas de aceptación después del despliegue

1. Sin sesión: `/api/canva/status` devuelve 401.
2. Con sesión: status devuelve credenciales y almacenamiento configurados, pero `connected:false` antes de OAuth.
3. Conectar abre Canva y muestra consentimiento.
4. Callback con state incorrecto debe fallar sin guardar tokens.
5. Callback correcto debe terminar OAuth y completar `listTools`.
6. `GET /api/canva/tools` devuelve herramientas reales descubiertas del servidor.
7. Una llamada de lectura como `search-designs` funciona antes de probar operaciones de escritura.
8. Probar generación, edición por transacción, commit y exportación solo después de verificar cada esquema.
9. Desconectar elimina tokens y caché de herramientas.

## Límites y cautelas

- El callback debe registrarse exactamente y el dominio debe coincidir con el usado al iniciar OAuth.
- Los tokens de acceso pueden caducar; el SDK gestiona refresh cuando Canva devuelve refresh tokens.
- El panel expone un ejecutor genérico basado en el nombre y esquema real de cada herramienta. Todavía no es un agente de lenguaje natural que decida automáticamente qué tool llamar.
- Las herramientas de Canva pueden crear o modificar contenido dentro de la cuenta autorizada. Revisa cada llamada antes de ejecutarla.
- El gate de propietaria de la entrega previa protege `/api/canva/*`, no hace privada toda la web estática ni todas las APIs heredadas.
- La desconexión elimina la copia local de tokens; no garantiza revocación del grant desde el portal de Canva. Si se necesita revocación completa, retirar la autorización desde la configuración de conexiones de Canva.
