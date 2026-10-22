# Agent Studio: coordinación multiagente

## Qué incluye esta fase

- `agent-studio.html`: panel con ocho roles, contexto compartido, cola de tareas, mensajes, resultados, solicitudes de aprobación y exportación JSON.
- `functions/api/agent-orchestrator.js`: endpoint de servidor para ejecutar un agente con contexto común y devolver mensajes, delegaciones, entregas y solicitudes de aprobación estructuradas.
- Navegación desde `index.html`.

## Configuración

En Cloudflare Pages → Settings → Environment variables, define `OPENAI_API_KEY` como secreto. `OPENAI_MODEL` es opcional; si no se define, la función usa `gpt-6-luna`. Las llamadas a la API pueden tener costes independientes de ChatGPT.

## Uso

1. Abre Agent Studio desde la navegación o en `/agent-studio.html`.
2. Carga un proyecto guardado en el navegador o completa el contexto manualmente.
3. Opcionalmente, ejecuta la auditoría de URL con `/api/site-audit`.
4. Pulsa **Ejecutar equipo**. Los ocho agentes trabajan secuencialmente; cada agente recibe el contexto, mensajes recientes, tareas abiertas y resultados previos.
5. Revisa mensajes, entregas, tareas delegadas y solicitudes de aprobación. También puedes ejecutar tareas individuales.
6. Exporta el registro JSON para archivar o compartir el estado de trabajo.

## Modelo de coordinación y límites

- Los proyectos y el registro se guardan en `localStorage` del navegador. No es una base de datos multiusuario ni una persistencia central entre dispositivos.
- Las rondas se ejecutan desde el navegador y llaman al endpoint por agente. Si se cierra la pestaña o falla la red, la ronda puede interrumpirse; se puede continuar ejecutando tareas individuales.
- Los mensajes y las delegaciones se validan contra una lista de agentes permitidos y se limitan por tamaño y cantidad. Los datos de webs externas se tratan como contenido no confiable.
- La decisión de aprobación se registra en el panel; no ejecuta por sí sola una acción externa. Este endpoint no publica, cambia DNS, paga, borra datos ni envía mensajes comerciales.
- Esta fase no implementa una cola durable en D1/Queues, captura real de navegador, despliegue por proyecto, edición directa de código de webs de clientes ni autenticación multiusuario. Estas integraciones requieren una fase posterior y configuración explícita.
- Las salidas de los agentes son propuestas hasta que una herramienta real las aplique y valide.

## Comprobaciones antes de producción

- Configurar `OPENAI_API_KEY` en Cloudflare Pages.
- Ejecutar una ronda de prueba y verificar respuestas, límites de tiempo y errores del proveedor.
- Probar `/api/agent-orchestrator`, `/api/site-audit` y `/api/pagespeed` en el preview de Cloudflare.
- Probar vista móvil, persistencia local, exportación JSON y aprobación/rechazo.
- Para coordinación multiusuario y ejecución duradera, incorporar autenticación, D1/Queues o Durable Objects, permisos validados en servidor y límites de gasto.

## Endpoint

`POST /api/agent-orchestrator`

Ejemplo:

```json
{
  "agent": "marketing",
  "task": "Propón una propuesta de valor y pide a UX/UI que revise la jerarquía.",
  "project": { "name": "Demo", "sector": "servicios", "goal": "generar leads" },
  "history": [],
  "results": [],
  "tasks": [],
  "approvals": []
}
```

`GET /api/agent-orchestrator` devuelve si la clave está configurada, sin exponerla.