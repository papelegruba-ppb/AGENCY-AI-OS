const STORE_KEY="agency-ai-os.projects.v1",ACTIVE_KEY="agency-ai-os.active-project-id.v1",HISTORY_KEY="agency-ai-os.social-studio.v1";
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}};
const activeProject=()=>{const id=localStorage.getItem(ACTIVE_KEY);return read(STORE_KEY,[]).find(p=>String(p.id)===String(id))||null};
let current=null;
function status(message){$("#ss-status").textContent=message}
function historyFor(project){return read(HISTORY_KEY,{})[project.id]||[]}
function render(){
 const project=activeProject();
 $("#ss-project").textContent=project?"Contenido para: "+project.name:"Selecciona un proyecto para crear contenido.";
 $("#ss-generate").disabled=!project;
 const items=project?historyFor(project):[];
 $("#ss-history").innerHTML=items.map(item=>'<li><strong>'+esc(item.task)+'</strong><small>'+esc(item.platform)+' · '+esc(new Date(item.createdAt).toLocaleString())+'</small></li>').join("")||'<li class="ss-empty">Todavía no hay campañas guardadas.</li>';
}
async function generate(){
 const project=activeProject(),task=$("#ss-task").value.trim();
 if(!project){status("Selecciona primero un proyecto.");return}
 if(!task){status("Describe el contenido que necesitas.");return}
 const button=$("#ss-generate");button.disabled=true;button.textContent="Creando contenido…";current=null;
 try{
  const response=await fetch("/api/social-studio",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({task,platform:$("#ss-platform").value,goal:$("#ss-goal").value,provider:$("#chat-provider")?.value,project})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data.ok)throw new Error(data.error||"No se pudo generar el paquete de contenido.");
  current={...data,task,createdAt:new Date().toISOString()};
  $("#ss-output").textContent=data.content;
  $("#ss-copy").disabled=false;$("#ss-save").disabled=false;
  status("Contenido preparado por "+data.provider+" · "+data.model+". No se ha publicado nada; revisa y aprueba cada pieza.");
 }catch(error){status(error.message+" Si la IA no está habilitada, utiliza AI TOOLBOX para preparar un prompt y continuar en una aplicación externa.");}
 finally{button.disabled=!activeProject();button.textContent="Generar contenido ↗"}
}
$("#ss-generate")?.addEventListener("click",generate);
$("#ss-copy")?.addEventListener("click",async()=>{if(!current)return;try{await navigator.clipboard.writeText(current.content);status("Paquete de contenido copiado.")}catch{status("No se pudo copiar automáticamente; selecciona el texto.")}});
$("#ss-save")?.addEventListener("click",()=>{if(!current)return;const project=activeProject();if(!project)return;const store=read(HISTORY_KEY,{});store[project.id]=[current,...(store[project.id]||[])].slice(0,20);localStorage.setItem(HISTORY_KEY,JSON.stringify(store));render();status("Campaña guardada en el historial de este proyecto.")});
window.addEventListener("agency:active-project-change",render);
window.addEventListener("storage",e=>{if([STORE_KEY,ACTIVE_KEY,HISTORY_KEY].includes(e.key))render()});
render();
