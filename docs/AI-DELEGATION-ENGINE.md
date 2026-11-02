# AI Delegation Engine

## Estado
Módulo de delegación manual-first para Agency AI OS. Separa la preparación del encargo, la ejecución en el proveedor externo y la revisión humana de la respuesta.

## Proveedores
Claude, ChatGPT, Gemini y DeepSeek. Los enlaces solo abren sus sitios oficiales; no autentican, transmiten prompts ni reutilizan conectores de otra cuenta.

## Flujo
1. Lee el proyecto activo desde el almacenamiento local existente (si lo hay).
2. Genera un prompt con objetivo, contexto, repositorio, rama, restricciones, método, pruebas y entregables.
3. El usuario revisa, copia o descarga el prompt y lo envía manualmente.
4. El usuario pega la respuesta externa en el panel de revisión.
5. Checklist de cinco controles y guardado local de la revisión.

## Seguridad y límites
- No hace llamadas a modelos ni APIs.
- No lee secretos, tokens ni archivos privados.
- El contexto se construye en el navegador y solo se comparte cuando el usuario copia/descarga y lo envía externamente.
- Las revisiones se guardan en localStorage del navegador; no se sincronizan entre dispositivos.
- El checklist es asistencial, no una validación automática del código ni una aprobación de despliegue.
- La rama sugerida es una instrucción para la IA externa, no una rama creada por este módulo.

## Integración pendiente
Cargar `ai-delegation.js` y `ai-delegation.css` en `index.html` después de los assets de AI Toolbox. Confirmar la vista AI TOOLBOX y ejecutar pruebas de navegador, persistencia y responsive antes de considerar la función integrada.
