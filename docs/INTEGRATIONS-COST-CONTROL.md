# Integraciones: coste cero por defecto

## Política

Todas las integraciones externas con consumo variable, cuotas o cargos permanecen desactivadas salvo habilitación explícita por variable de entorno en Cloudflare. Añadir una API key no habilita el servicio.

| Integración | Flag de servidor | Estado por defecto |
|---|---|---|
| IA (OpenAI, DeepSeek, Gemini, Anthropic, Perplexity) | `AI_BILLABLE_ENABLED=true` y `AI_ENABLED=true` | Desactivada |
| PageSpeed Insights | `PAGESPEED_API_KEY` presente | Disponible al configurar la clave; consulta sin coste directo dentro de cuota |
| Google Drive | `GOOGLE_DRIVE_ENABLED=true` | Desactivada |
| WhatsApp Business | `WHATSAPP_ENABLED=true` | Desactivada; integración real pendiente |
| Google Calendar | `GOOGLE_CALENDAR_ENABLED=true` | Desactivada; integración real pendiente |
| Google Sheets | `GOOGLE_SHEETS_ENABLED=true` | Desactivada; integración real pendiente |
| Browser Rendering | `BROWSER_RENDERING_ENABLED=true` | Desactivada; runtime real pendiente |
| Canva Connect | No requiere flag de pago | Disponible si OAuth, cifrado y KV están configurados; conexión OAuth se verifica por separado |

No habilitar flags desde el navegador. Las integraciones que puedan generar cargos se activan únicamente en el entorno de servidor, después de autorización expresa y revisión de precios, cuotas, privacidad y permisos. Las cuotas gratuitas no garantizan coste cero si se exceden. Canva Connect es una excepción: Canva indica que desarrollar y utilizar Connect API no tiene coste de API. No se debe bloquear por el flag genérico de servicios de pago; sí se deben respetar límites, scopes y requisitos de plan de cada endpoint.

## Estado

Consultar `GET /api/integrations/status`. La respuesta enumera estado, función, aviso de coste y pasos de activación. Los endpoints protegidos responden `503 INTEGRATION_DISABLED` antes de contactar con el proveedor.

## Límites funcionales honestos

- WhatsApp, Calendar y Sheets se muestran como integraciones preparadas, no conectadas: aún necesitan webhooks/OAuth, persistencia, control de duplicados y pruebas.
- El crawler actual lee HTML público servido; no ejecuta JavaScript ni captura screenshots.
- PageSpeed consulta la API oficial cuando existe `PAGESPEED_API_KEY`; no requiere `PAGESPEED_ENABLED`. Sujeto a cuotas y límites de Google.
- Los proyectos siguen guardándose principalmente en el navegador. Esta política no convierte localStorage en almacenamiento compartido ni sincronización multi-dispositivo.
- Las llamadas a IA están separadas de los agentes locales; los agentes no ejecutan acciones externas ni código arbitrario.
- Canva Connect API: la integración de API es gratuita según Canva, pero algunas capacidades están restringidas a planes de pago. El estado de credenciales no equivale a OAuth conectado ni a agentes creativos plenamente integrados. Consultar `/api/canva/status` y validar las herramientas disponibles, scopes, cuotas y licencias de elementos premium.

## Validación de Canva OAuth

El endpoint de estado comprueba que el registro de tokens pueda descifrarse con `CANVA_TOKEN_ENCRYPTION_KEY`; la mera presencia de una clave KV no se considera una conexión. `connected_tokens_stored` confirma tokens descifrables almacenados, pero no garantiza que el access token siga vigente: la llamada a una herramienta Canva es la comprobación operativa definitiva.

## Desarrollo local sin proveedores

Usar datos sintéticos y adaptadores simulados para probar el árbol de conversación, CRM/inventario, disponibilidad y propuestas. No enviar mensajes reales ni crear eventos externos en modo simulación.
