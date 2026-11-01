const STORE_KEY="agency-ai-os.projects.v1", ACTIVE_KEY="agency-ai-os.active-project-id.v1";
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const activeProject=()=>{const id=localStorage.getItem(ACTIVE_KEY);try{return JSON.parse(localStorage.getItem(STORE_KEY)||"[]").find(p=>String(p.id)===String(id))||null}catch{return null}};
const formatSize=n=>n<1024?n+" B":n<1048576?(n/1024).toFixed(1)+" KB":(n/1048576).toFixed(2)+" MB";
let files=[];
function status(message){const el=$("#pf-status");if(el)el.textContent=message}
function render(){
 const project=activeProject(),label=$("#pf-project");if(!label)return;
 label.textContent=project?"Biblioteca privada de "+project.name:"Selecciona un proyecto para gestionar sus archivos.";
 $("#pf-upload").disabled=!project;$("#pf-file-input").disabled=!project;
 const list=$("#pf-list");
 list.innerHTML=files.map(f=>'<li class="pf-file"><span><strong>'+esc(f.file_name)+'</strong><small>'+esc(f.mime_type)+' · '+formatSize(f.size_bytes)+' · '+esc(f.processing_status)+'</small></span><button type="button" data-delete="'+esc(f.id)+'">Eliminar</button></li>').join("")||'<li class="pf-empty">No hay archivos almacenados para este proyecto.</li>';
 list.querySelectorAll("[data-delete]").forEach(btn=>btn.addEventListener("click",()=>removeFile(btn.dataset.delete)));
}
async function refresh(){
 const project=activeProject();files=[];if(!project){render();return}
 try{const response=await fetch("/api/project-files?projectId="+encodeURIComponent(project.id),{credentials:"same-origin",cache:"no-store"});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"No se pudo consultar la biblioteca.");files=Array.isArray(data.files)?data.files:[];status("Archivos privados del proyecto. La extracción y búsqueda dentro de su contenido aún no están activadas.");}
 catch(error){status(error.message+" Comprueba la sesión privada, D1 y el binding R2 AGENCY_FILES.");}render();
}
async function upload(){
 const project=activeProject(),input=$("#pf-file-input"),selected=[...(input.files||[])];if(!project||!selected.length)return;
 $("#pf-upload").disabled=true;
 try{for(const file of selected){status("Subiendo "+file.name+"…");const response=await fetch("/api/project-files",{method:"POST",credentials:"same-origin",headers:{"Content-Type":file.type||"application/octet-stream","x-project-id":String(project.id),"x-file-name":file.name},body:file});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"No se pudo subir "+file.name);}
 input.value="";status("Carga terminada. Los archivos están almacenados de forma privada; todavía no se han procesado para el chat.");await refresh();}
 catch(error){status(error.message);}finally{$("#pf-upload").disabled=!activeProject();}
}
async function removeFile(id){
 const project=activeProject();if(!project||!confirm("¿Eliminar este archivo del proyecto?"))return;
 try{const response=await fetch("/api/project-files?projectId="+encodeURIComponent(project.id)+"&fileId="+encodeURIComponent(id),{method:"DELETE",credentials:"same-origin"});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"No se pudo eliminar el archivo.");await refresh();status("Archivo eliminado del proyecto.");}catch(error){status(error.message);}
}
$("#pf-upload")?.addEventListener("click",upload);
window.addEventListener("agency:active-project-change",refresh);
window.addEventListener("storage",e=>{if([STORE_KEY,ACTIVE_KEY].includes(e.key))refresh()});
refresh();
