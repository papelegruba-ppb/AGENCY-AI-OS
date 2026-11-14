# ROADMAP.md

## Fase 0 — MVP local (incluida)
- [x] Dashboard y navegación
- [x] Briefing de proyecto
- [x] Flujo de siete agentes + QA
- [x] Planes de salida en JSON
- [x] Guardado local y exportación
- [x] Plantilla HTML demostrativa
- [x] Documentación de límites

## Fase 1 — Repositorio y despliegue
- [ ] Crear repositorio del usuario
- [ ] Publicar en Cloudflare Pages
- [ ] Verificar responsive y consola en navegadores reales
- [ ] Añadir pruebas básicas

## Fase 2 — Backend mínimo
- [ ] Endpoint para guardar leads
- [ ] Base de datos y migraciones
- [ ] Validación, rate limiting y anti-spam
- [ ] Variables de entorno y logs

## Fase 3 — Agentes LLM reales
- [ ] Elegir proveedor y modelo
- [ ] Contratos JSON por agente
- [ ] Orquestación y validación de salida
- [ ] Reintentos, costes y límites
- [ ] Aprobación humana antes de publicar

## Fase 4 — Automatización
- [ ] Integración n8n/webhooks
- [ ] WhatsApp Business Platform
- [ ] CRM y notificaciones
- [ ] Historial y analítica

## Fase 5 — Creative Engine y producción visual
- [x] Módulo Creative Engine con preview CSS y exportación de estilos
- [x] Evaluación técnica y de licencia de Shaders
- [x] Flujo manual de assets ContentCore documentado
- [ ] Integrar el paquete Shaders en un build cliente compatible y probar WebGPU/fallback
- [ ] Revalidar is.graphics (acceso, API y licencia) antes de adoptarlo

## Definición de terminado
Una tarea solo se marca completa cuando está implementada y se han ejecutado las pruebas pertinentes. La presencia de un diseño o documento no demuestra una integración funcional.


## Fase 6 — Social Media & Growth Operations (capacidad global)
- [x] Auditar la implementación existente de Social Media Studio y documentar su alcance real.
- [x] Definir arquitectura modular para conectores sociales, seguridad y aprobación humana.
- [ ] Verificar bindings y esquema de datos D1/R2/Queues/Durable Objects en Cloudflare.
- [ ] Crear migraciones D1 para cuentas, scopes, campañas, publicaciones, aprobaciones y métricas.
- [ ] Implementar OAuth seguro y gestión de tokens revocables.
- [ ] Primer adaptador Meta (Instagram profesional/Facebook Pages), condicionado a permisos y revisión.
- [ ] Calendario editorial y cola de publicaciones con idempotencia y reintentos.
- [ ] Analítica conectada y reporting con fuente/periodo.
- [ ] Adaptadores LinkedIn, TikTok y YouTube; evaluar Threads, Pinterest y X según acceso/coste.
- [ ] Pruebas de seguridad, aislamiento por proyecto y extremo a extremo en cuentas de prueba.

Ver `docs/SOCIAL-INTEGRATIONS.md`. Una casilla solo se marca como completa después de implementar y probar la funcionalidad real.
