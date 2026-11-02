(()=>{"use strict";
const $=(s,r=document)=>r.querySelector(s), esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const PROJECTS_KEY="agency-ai-os.projects.v1",ACTIVE_KEY="agency-ai-os.active-project-id.v1",HISTORY_KEY="agency-ai-os.delegation.history.v1";
const PROVIDERS=[
{name:"Claude",url:"https://claude.ai/",role:"Arquitectura, programación, análisis y revisión"},
{name:"ChatGPT",url:"https://chatgpt.com/",role:"Planificación, desarrollo, análisis y validación"},
{name:"Gemini",url:"https://gemini.google.com/",role:"Investigación multimodal y análisis documental"},
{name:"DeepSeek",url:"https://chat.deepseek.com/",role:"Ingeniería de software y razonamiento técnico"}
];
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}};
const projects=read(PROJECTS_KEY,[]),activeId=localStorage.getItem(ACTIVE_KEY)||"",active=projects.find(p=>String(p.id)===String(activeId))||null;
const root=$("#view-ai-toolbox"); if(!root||$("#delegation-engine"))return;
const section=document.createElement("section");section.id="delegation-engine";section.className="delegation-engine toolbox-panel";
section.innerHTML=`
<div class="de-heading"><div><p class="toolbox-kicker">AI DELEGATION ENGINE · HUMAN APPROVAL</p><h2>Delegar trabajo a otra IA</h2><p class="toolbox-muted">Prepara una instrucción técnica con contexto del proyecto, revisa la respuesta externa y valida los criterios antes de aceptar cambios.</p></div><span class="de-state">MANUAL · CONTROLADO</span></div>
<div class="de-grid">
<div>
<div class="toolbox-field"><label for="de-provider">IA de destino</label><select id="de-provider">${PROVIDERS.map((p,i)=>`<option value="${i}">${p.name} — ${p.role}</option>`).join("")}</select></div>
<div class="toolbox-field"><label for="de-task">Tarea que debe resolver *</label><textarea id="de-task" maxlength="5000" placeholder="Describe el objetivo, el problema o el cambio que necesitas…"></textarea></div>
<div class="toolbox-field"><label for="de-context">Contexto adicional / archivos relevantes</label><textarea id="de-context" maxlength="5000" placeholder="Rutas de archivos, errores, decisiones, documentación o resultados previos…"></textarea></div>
<div class="toolbox-field"><label for="de-constraints">Restricciones y límites</label><textarea id="de-constraints" maxlength="2500">No modificar producción. No fusionar ni desplegar sin autorización. No exponer secretos. Priorizar soluciones gratuitas. No inventar pruebas ni resultados.</textarea></div>
<div class="de-actions"><button type="button" class="button button-primary" id="de-generate">Generar encargo</button><button type="button" class="button button-secondary" id="de-copy" disabled>Copiar prompt</button><button type="button" class="button button-secondary" id="de-download" disabled>Descargar .md</button><a class="button button-secondary" id="de-open" href="https://claude.ai/" target="_blank" rel="noopener noreferrer">Abrir IA ↗</a></div>
<p id="de-status" class="toolbox-muted" role="status" aria-live="polite">El prompt se genera localmente. No se envían datos a ningún proveedor desde este módulo.</p>
</div>
<div>
<div class="de-context-card"><strong>Contexto detectado</strong><p id="de-project">${active?esc(active.name)+" · "+esc(active.sector||"Sector no indicado"):"No hay proyecto activo. Se utilizará contexto general."}</p><small>Repositorio: papelegruba-ppb/AGENCY-AI-OS · Rama base: main</small></div>
<pre id="de-output" class="toolbox-result">Define la tarea y genera el encargo para la IA externa.</pre>
</div></div>
<div class="de-review"><h3>Revisión de la respuesta externa</h3><p class="toolbox-muted">Pega aquí la respuesta de Claude, ChatGPT, Gemini o DeepSeek. La revisión es asistida por checklist; no sustituye pruebas reales ni revisión de código.</p>
<textarea id="de-response" maxlength="20000" placeholder="Pega la respuesta o el informe recibido…"></textarea>
<div class="de-checks">
<label><input type="checkbox" data-check="scope"> Respeta el alcance y no introduce cambios no solicitados</label>
<label><input type="checkbox" data-check="security"> No expone secretos ni debilita autenticación o aislamiento</label>
<label><input type="checkbox" data-check="tests"> Incluye pruebas reproducibles y resultados verificables</label>
<label><input type="checkbox" data-check="cost"> No activa servicios de pago ni genera costes sin permiso</label>
<label><input type="checkbox" data-check="delivery"> Identifica archivos, commit/PR y configuración pendiente</label>
</div>
<div class="de-actions"><button type="button" class="button button-secondary" id="de-save-review" disabled>Guardar revisión local</button><span id="de-review-status" class="toolbox-muted" role="status">0/5 criterios marcados.</span></div>
<div id="de-history" class="de-history"></div>
</div>`;
root.append(section);
let prompt="";
const getProjectContext=()=>active?JSON.stringify({name:active.name,sector:active.sector,type:active.type,offer:active.offer,audience:active.audience,goal:active.goal,domain:active.domain,requirements:active.requirements,delivery:active.delivery},null,2):"Sin proyecto activo. No inventes contexto.";
function build(){
const provider=PROVIDERS[Number($("#de-provider").value)||0],task=$("#de-task").value.trim();if(!task)return"";
return [
"# ENCARGO PARA "+provider.name.toUpperCase(),"",
"Actúa como especialista senior. "+provider.role+".",
"## Objetivo",task,
"## Contexto del proyecto",getProjectContext(),
"## Repositorio y entorno","Repositorio: https://github.com/papelegruba-ppb/AGENCY-AI-OS","Rama base: main. Crea una rama nueva y descriptiva. No trabajes sobre ramas antiguas sin verificar su estado.",
"## Contexto adicional",$("#de-context").value.trim()||"No facilitado.",
"## Restricciones",$("#de-constraints").value.trim(),
"## Método de trabajo","1. Inspecciona el código actual antes de editar. Identifica dependencias y comportamiento existente.\n2. Propón el plan mínimo y seguro.\n3. Implementa cambios acotados y mantenibles.\n4. Añade o actualiza pruebas.\n5. Ejecuta las pruebas disponibles y copia los resultados reales.\n6. Revisa seguridad, accesibilidad, responsive y compatibilidad.\n7. Prepara un Pull Request; no lo fusiones ni despliegues.",
"## Entregables obligatorios","- Diagnóstico y decisiones técnicas.\n- Lista exacta de archivos modificados.\n- Diff resumido.\n- Pruebas ejecutadas con resultado y comandos.\n- Riesgos y configuración pendiente en Cloudflare.\n- Commit y URL del PR, si se han creado.",
"## Criterios de aceptación","No romper funciones existentes. No incluir secretos. No inventar integraciones ni pruebas. No generar costes. Mantener compatibilidad con Cloudflare Workers cuando aplique. Dejar cualquier acción irreversible pendiente de autorización.",
"## Respuesta final","Separa claramente HECHOS VERIFICADOS, CAMBIOS REALIZADOS, PRUEBAS EJECUTADAS y PENDIENTES. Si no puedes acceder al repositorio o ejecutar una prueba, dilo explícitamente."
].join("\n\n");
}
function render(){const i=Number($("#de-provider").value)||0;$("#de-open").href=PROVIDERS[i].url;prompt=build();$("#de-output").textContent=prompt||"Escribe la tarea para generar el encargo.";$("#de-copy").disabled=!prompt;$("#de-download").disabled=!prompt;$("#de-save-review").disabled=!$("#de-response").value.trim();}
$("#de-generate").addEventListener("click",()=>{render();$("#de-status").textContent=prompt?"Encargo generado con el contexto disponible. Revísalo antes de compartirlo.":"Describe primero la tarea.";});
$("#de-provider").addEventListener("change",render);$("#de-task").addEventListener("input",render);$("#de-context").addEventListener("input",render);$("#de-copy").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(prompt);$("#de-status").textContent="Prompt copiado."}catch{$("#de-status").textContent="No se pudo acceder al portapapeles; copia el texto manualmente."}});
$("#de-download").addEventListener("click",()=>{const blob=new Blob([prompt],{type:"text/markdown;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="agency-ai-delegation.md";a.click();URL.revokeObjectURL(url);});
const checks=[...section.querySelectorAll("[data-check]")];function updateChecks(){const n=checks.filter(c=>c.checked).length;$("#de-review-status").textContent=n+"/5 criterios marcados. "+(n===5?"Checklist completo; aún requiere validación técnica.":"Revisión pendiente.");}
checks.forEach(c=>c.addEventListener("change",updateChecks));$("#de-response").addEventListener("input",render);
$("#de-save-review").addEventListener("click",()=>{const item={id:Date.now(),projectId:activeId||null,provider:PROVIDERS[Number($("#de-provider").value)||0].name,task:$("#de-task").value.trim(),response:$("#de-response").value.trim(),checks:Object.fromEntries(checks.map(c=>[c.dataset.check,c.checked])),savedAt:new Date().toISOString()};const history=read(HISTORY_KEY,[]);history.unshift(item);localStorage.setItem(HISTORY_KEY,JSON.stringify(history.slice(0,15)));$("#de-review-status").textContent="Revisión guardada localmente en este dispositivo.";renderHistory();});
function renderHistory(){const h=read(HISTORY_KEY,[]).filter(x=>!activeId||!x.projectId||x.projectId===activeId).slice(0,5);$("#de-history").innerHTML=h.map(x=>`<div class="de-history-item"><strong>${esc(x.provider)} · ${esc(x.task.slice(0,90))}</strong><small>${new Date(x.savedAt).toLocaleString("es-ES")} · ${Object.values(x.checks||{}).filter(Boolean).length}/5 criterios</small></div>`).join("")||'<p class="toolbox-muted">Todavía no hay revisiones guardadas.</p>';}
renderHistory();render();
})();