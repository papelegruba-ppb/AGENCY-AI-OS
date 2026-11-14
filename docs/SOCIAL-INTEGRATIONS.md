# Social Media & Growth Integrations

## Objetivo

Convertir Social Media Studio en un centro de operaciones multicanal para Agency AI OS. El módulo es una capacidad global del producto: cada conexión pertenece a una cuenta/espacio de trabajo autorizado y puede asignarse a proyectos, pero nunca se comparte información entre proyectos sin autorización.

## Estado real de partida

Ya existe:
- Interfaz Social Media Studio y hoja de estilos.
- Generación asistida por IA mediante `POST /api/social-studio`.
- Plataformas declaradas: Instagram, TikTok, Facebook, LinkedIn y YouTube Shorts.
- Generación de calendario sugerido, posts/carruseles, stories, guiones cortos, CTA y prompts visuales.
- Historial local por proyecto, copia y guardado de paquetes.
- Autenticación de propietario y comprobación same-origin en el endpoint.

Todavía no existe:
- OAuth de redes sociales ni almacenamiento de tokens por cuenta.
- Publicación o programación real.
- Sincronización de comentarios, mensajes o bandejas de entrada.
- Métricas sociales conectadas a APIs.
- Cola de trabajos, reintentos, webhooks o auditoría de publicaciones.
- Gestión de permisos de equipo y consentimiento por canal.

Por tanto, la generación de contenido está implementada; la conexión y operación real de redes sigue pendiente.

## Alcance funcional objetivo

1. **Cuentas y permisos:** conexión OAuth oficial, selección de páginas/canales, scopes mínimos, renovación/revocación de tokens y estado visible.
2. **Calendario editorial:** calendario multicuenta, borradores, campañas, etiquetas, responsables y estados.
3. **Producción:** copy adaptado por red, carruseles, stories, guiones de vídeo, subtítulos, briefs visuales y biblioteca de assets.
4. **Aprobaciones:** vista previa por formato, checklist de marca/compliance y aprobación humana antes de publicar.
5. **Publicación:** publicación inmediata o programada solo en formatos y cuentas admitidos por la API oficial; cola idempotente, límites, reintentos y registro del resultado.
6. **Comunidad:** comentarios y mensajes solo cuando la API y los permisos concedidos lo permitan; nunca automatizar respuestas sensibles sin aprobación.
7. **Analítica:** alcance, impresiones, reproducciones, retención, interacción, clics y conversiones cuando cada plataforma los exponga. Mostrar fuente, periodo y limitaciones.
8. **Informes:** comparativas por canal/campaña y exportación de resultados con fecha de consulta.
9. **Automatización:** webhooks y flujos con n8n/Make u otros conectores autorizados, manteniendo la aprobación humana en acciones públicas.
10. **Asistencia comercial:** reutilizar CRM y WhatsApp como destinos de leads, sin mezclar conversaciones ni datos entre clientes.

## Plataformas y estrategia de conectores

| Plataforma | Ruta técnica a evaluar | Restricciones que deben validarse antes de programar |
|---|---|---|
| Instagram | Meta Graph API para cuentas profesionales | Tipo de cuenta, vinculación a página, permisos, revisión de aplicación y formatos/endpoints permitidos |
| Facebook Pages | Meta Graph API | Permisos de página, revisión de aplicación, roles y límites de publicación/lectura |
| Threads | Threads API oficial | Acceso, scopes, publicación y métricas disponibles |
| LinkedIn | APIs oficiales de LinkedIn | Productos/API aprobados, permisos de organización y autorización de publicación |
| TikTok | Content Posting API | Auditoría/revisión, scopes, límites y requisitos de experiencia de publicación |
| YouTube | YouTube Data API | OAuth, cuota de proyecto, subida de vídeo y reglas de visibilidad |
| Pinterest | Pinterest API | Acceso aprobado, scopes y operaciones disponibles |
| X | API oficial de X | Plan vigente, costes, cuotas y permisos; no asumir acceso gratuito |

No usar scraping, automatización de navegador, contraseñas de usuario ni endpoints privados para simular integraciones. Las APIs, cuotas y requisitos cambian: validar documentación oficial y condiciones actuales en el momento de implementar cada adaptador.

## Arquitectura propuesta compatible con Cloudflare

- `functions/api/social/*`: endpoints de conexión, callback OAuth, cuentas, publicaciones, calendario y métricas.
- `functions/_lib/social/*`: adaptadores independientes por proveedor y normalización de capacidades.
- D1: cuentas conectadas, scopes, publicaciones, campañas, aprobaciones, métricas agregadas y auditoría.
- KV: estado OAuth/CSRF temporal, caché y bloqueos ligeros; no usar KV como contador atómico ni como única garantía de exclusión.
- R2: assets de campaña privados y metadatos.
- Queues o Durable Objects: cola de publicaciones, idempotencia, límites y reintentos; seleccionar según disponibilidad/coste del plan Cloudflare.
- Cron Triggers: sincronización periódica de métricas y estados cuando esté configurada.
- Webhooks: validar firma, timestamp, origen y deduplicación.
- Secretos OAuth: variables de entorno cifradas de Cloudflare; tokens de usuario cifrados en reposo con clave de cifrado del servidor, rotación y borrado al desconectar.
- UI: Social Studio conectado al calendario global, con filtros por proyecto/cuenta y un centro de aprobaciones.

La arquitectura debe ser modular: que falle un proveedor no debe bloquear el resto. No se debe activar ningún proveedor por tener sus variables configuradas; conexión, permisos y publicación requieren autorización explícita.

## Secuencia de implementación

### Etapa A — Auditoría y base común
- [ ] Confirmar estado real de D1/R2/Queues/Durable Objects y bindings del despliegue.
- [ ] Diseñar esquema D1 y migraciones con aislamiento por propietario/proyecto.
- [ ] Implementar registro de capacidades por plataforma (formatos, publicación, métricas, comentarios).
- [ ] Añadir pruebas de OAuth state/CSRF, scopes, cifrado, revocación y aislamiento.

### Etapa B — Primer conector
- [ ] Elegir Meta como primer adaptador si los tipos de cuenta y permisos disponibles lo permiten.
- [ ] Implementar OAuth y conexión de Instagram profesional/Facebook Pages.
- [ ] Mostrar cuenta, permisos y expiración/estado del token sin exponerlo.
- [ ] Implementar borrador, aprobación, publicación manual y programación con cola.
- [ ] Verificar resultado real y registrar identificador/URL de publicación.

### Etapa C — Analítica y expansión
- [ ] Métricas de Meta con fecha, fuente y cobertura.
- [ ] LinkedIn, TikTok y YouTube como adaptadores separados tras validar acceso.
- [ ] Threads, Pinterest y X según utilidad, coste y acceso.
- [ ] Bandeja de comentarios/mensajes solo con permisos aprobados.
- [ ] Informes unificados y automatizaciones externas.

### Etapa D — Producto completo
- [ ] Calendario multicuenta con estados y aprobaciones.
- [ ] Reglas de marca, control de claims y revisión de contenido.
- [ ] Cola observable, reintentos acotados, dead-letter y alertas.
- [ ] Auditoría de acciones y desconexión/borrado de datos.
- [ ] Pruebas de extremo a extremo en cuentas de prueba antes de producción.

## Criterios de aceptación

- Cada red muestra claramente: no disponible, pendiente de conexión, conectada, permiso insuficiente, token expirado o error.
- Ninguna publicación sale sin una aprobación explícita.
- No se duplica una publicación al reintentar una petición.
- Los tokens no aparecen en HTML, logs, respuestas API ni repositorio.
- Las métricas muestran plataforma, periodo, fecha de extracción y límites de cobertura.
- Una cuenta solo puede operar sobre los proyectos autorizados.
- Las pruebas cubren desconexión, revocación, errores de cuota, reintentos y fallos parciales.

## Coste y enfoque gratuito

Priorizar herramientas y cuotas gratuitas cuando sean suficientes, pero no prometer publicación gratuita: cada red determina sus propios permisos, revisiones, cuotas y condiciones. El conector debe poder permanecer desactivado sin afectar a Social Media Studio. No activar APIs de pago ni autorizar gasto sin decisión expresa.

## Repositorios externos evaluados como referencias

- `whatsapp-agentkit`: estudiar patrones de webhooks y flujos conversacionales; verificar licencia y dependencias antes de reutilizar.
- `claude-ads`: referencia para una futura capa de auditoría/optimización de campañas, no equivale a publicar orgánicamente.
- `auto-crm`: referencia de pipeline, scoring y webhooks; adaptar solo lo compatible con Cloudflare.
- `skill-vault`: referencia para catálogo de capacidades y controles de seguridad.
- `claude-seo-ai`, `cyber-neo`, `all-deploy` y `the-architect`: candidatos separados para auditoría SEO/GEO, seguridad, despliegues y planificación. No se copia código hasta completar auditoría de compatibilidad/licencias.

La revisión de README/licencias no sustituye una auditoría de dependencias, seguridad y compatibilidad. Ninguno de estos proyectos se considera integrado por estar listado aquí.
