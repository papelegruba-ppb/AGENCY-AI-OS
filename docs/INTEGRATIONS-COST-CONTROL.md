# Integraciones: coste cero por defecto

## Política

Todas las integraciones externas con consumo variable, cuotas o cargos permanecen desactivadas salvo habilitación explícita por variable de entorno en Cloudflare. Añadir una API key no habilita el servicio.

| Integración | Flag de servidor | Estado por defecto |
|---|---|---|
| IA (OpenAI, DeepSeek, Gemini, Anthropic, Perplexity) | `AI_BILLABLE_ENABLED=true` y `AI_ENABLED=true` | Desactivada |
| PageSpeed Insights | `PAGESPEED_ENABLED=true` | Desactivada |
| Google Drive | `GOOGLE_DRIVE_ENABLED=true` | Desactivada |
| WhatsApp Business | `WHATSAPP_ENABLED=true` | Desactivada; integración real pendiente |
| Google Calendar | `GOOGLE_CALENDAR_ENABLED=true` | Desactivada; integración real pendiente |
| Google Sheets | `GOOGLE_SHEETS_ENABLED=true` | Desactivada; integración real pendiente |
| Browser Rendering | `BROWSER_RENDERING_ENABLED=true` | Desactivada; runtime real pendiente |
| Canva Connect | `CANVA_ENABLED=true` | Desactivada en este control; verificar antes la conexión OAuth ya configurada |

No habilitar flags desde el navegador. La activación se realiza únicamente en el entorno de servidor, después de autorización expresa y revisión de precios, cuotas, privacidad y permisos. Las cuotas gratuitas no garantizan coste cero si se exceden.

## Estado

Consultar `GET /api/integrations/status`. La respuesta enumera estado, función, aviso de coste y pasos de activación. Los endpoints protegidos responden `503 INTEGRATION_DISABLED` antes de contactar con el proveedor.

## Límites funcionales honestos

- WhatsApp, Calendar y Sheets se muestran como integraciones preparadas, no conectadas: aún necesitan webhooks/OAuth, persistencia, control de duplicados y pruebas.
- El crawler actual lee HTML público servido; no ejecuta JavaScript ni captura screenshots.
- PageSpeed solo devuelve métricas reales cuando la integración se habilite y Google responda con Lighthouse.
- Los proyectos siguen guardándose principalmente en el navegador. Esta política no convierte localStorage en almacenamiento compartido ni sincronización multi-dispositivo.
- Las llamadas a IA están separadas de los agentes locales; los agentes no ejecutan acciones externas ni código arbitrario.
- Canva OAuth/MCP preexistente debe verificarse de extremo a extremo antes de declarar generación automática disponible.

## Desarrollo local sin proveedores

Usar datos sintéticos y adaptadores simulados para probar el árbol de conversación, CRM/inventario, disponibilidad y propuestas. No enviar mensajes reales ni crear eventos externos en modo simulación.
