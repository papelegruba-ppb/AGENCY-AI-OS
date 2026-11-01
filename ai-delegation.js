(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const PROVIDERS = {
    claude: {name:"Claude", url:"https://claude.ai/"},
    chatgpt: {name:"ChatGPT", url:"https://chatgpt.com/"},
    gemini: {name:"Gemini", url:"https://gemini.google.com/"},
    deepseek: {name:"DeepSeek", url:"https://chat.deepseek.com/"},
    perplexity: {name:"Perplexity", url:"https://www.perplexity.ai/"}
  };
  const HISTORY_KEY = "agency-ai-os.delegations.v1";
  const PROJECTS_KEY = "agency-ai-os.projects.v1";
  const ACTIVE_KEY = "agency-ai-os.active-project-id.v1";
  let currentPrompt = "";
  let currentReview = null;
  let currentRecordId = null;
  const safeRead = (key, fallback) => { try { const value = JSON.parse(localStorage.getItem(key) || "null"); return value ?? fallback; } catch (_) { return fallback; } };
  const activeProject = () => {
    const projects = safeRead(PROJECTS_KEY, []);
    const id = localStorage.getItem(ACTIVE_KEY);
    return Array.isArray(projects) ? projects.find(p => String(p.id) === String(id)) || null : null;
  };
  const projectContext = () => {
    const p = activeProject();
    if (!p) return "No hay proyecto activo seleccionado.";
    const fields = [
      ["Nombre", p.name || p.projectName], ["Sector", p.sector], ["Tipo", p.type],
      ["Oferta", p.offer], ["Audiencia", p.audience], ["Objetivo", p.goal],
      ["Web", p.domain], ["Estilo", p.style], ["Requisitos", p.requirements]
    ].filter(([,v]) => typeof v === "string" && v.trim());
    return fields.length ? fields.map(([k,v]) => k + ": " + v.trim()).join("\n") : "Hay un proyecto activo, pero no contiene campos de briefing disponibles.";
  };
  const scopedHistory = () => {
    const id = activeProject()?.id || "workspace";
    return safeRead(HISTORY_KEY, []).filter(item => item.projectId === id).slice(0,30);
  };
  const persistHistory = item => {
    const all = safeRead(HISTORY_KEY, []);
    const next = [item, ...all.filter(x => x.id !== item.id)].slice(0,100);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    renderHistory();
  };
  const makePrompt = () => {
    const provider = PROVIDERS[$("#de-provider").value] || PROVIDERS.claude;
    const task = $("#de-task").value.trim();
    if (!task) return "";
    const project = $("#de-include-project").checked ? projectContext() : "Contexto de proyecto omitido por decisión del usuario.";
    const extra = $("#de-context").value.trim() || "Sin contexto adicional.";
    const files = $("#de-files").value.trim() || "Identifica los archivos necesarios antes de proponer cambios.";
    return [
      "AGENCY AI OS · ENCARGO DELEGADO A " + provider.name.toUpperCase(),
      "",
      "MISIÓN",
      task,
      "",
      "CONTEXTO DEL PROYECTO",
      "Repositorio: papelegruba-ppb/AGENCY-AI-OS",
      "Plataforma: Cloudflare Pages/Workers.",
      "Rama de trabajo: crea una rama nueva desde main; no trabajes directamente sobre main.",
      project,
      "",
      "CONTEXTO ADICIONAL",
      extra,
      "",
      "ARCHIVOS / RUTAS RELEVANTES",
      files,
      "",
      "INSTRUCCIONES DE EJECUCIÓN",
      "1. Inspecciona primero la implementación actual y sus convenciones; no asumas que el contexto está completo.",
      "2. Propón un plan breve y después implementa solo el alcance solicitado.",
      "3. Conserva compatibilidad, diseño visual y funcionalidades existentes. No reescribas módulos ajenos.",
      "4. No inventes APIs, credenciales, permisos, resultados de pruebas ni estados de despliegue.",
      "5. No incluyas secretos en frontend, repositorio, logs ni localStorage. Usa Cloudflare secrets para credenciales.",
      "6. Prioriza opciones gratuitas. No actives servicios de pago ni consumos facturables.",
      "7. Aísla los datos por usuario y proyecto cuando corresponda; valida entradas y errores.",
      "8. Añade o actualiza pruebas automatizadas y documentación.",
      "9. No fusiones ni despliegues en producción. Prepara una Pull Request para revisión humana.",
      "",
      "ENTREGABLES OBLIGATORIOS",
      "- Diagnóstico de la implementación existente y decisiones técnicas.",
      "- Lista de archivos modificados con resumen por archivo.",
      "- Código completo o diff aplicable; evita pseudocódigo presentado como implementación.",
      "- Pruebas ejecutadas, comandos exactos y resultados reales. Indica claramente lo que no pudiste ejecutar.",
      "- Riesgos, limitaciones, configuración externa pendiente y posible impacto económico.",
      "- Criterios de aceptación comprobados y pendientes.",
      "",
      "CRITERIO DE CALIDAD",
      "Si falta información crítica, formula la pregunta mínima necesaria o documenta el supuesto. Separa hechos, hipótesis y recomendaciones. No declares terminado aquello que no hayas verificado.",
      "",
      "RESPUESTA FINAL",
      "Entrega un informe conciso y reproducible. No afirmes que has accedido a cuentas externas, configurado Cloudflare, fusionado o publicado nada salvo evidencia verificable."
    ].join("\n");
  };
  const setStatus = (message, target = "#de-status") => { const node = $(target); if (node) node.textContent = message; };
  const download = (filename, content) => {
    const url = URL.createObjectURL(new Blob([content], {type:"text/markdown;charset=utf-8"}));
    const a = document.createElement("a"); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };
  const slug = value => String(value || "delegacion").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,50) || "delegacion";
  const renderHistory = () => {
    const root = $("#de-history"); if (!root) return;
    root.replaceChildren();
    const items = scopedHistory();
    if (!items.length) { const p=document.createElement("p"); p.className="delegation-muted"; p.textContent="Todavía no hay encargos guardados para este proyecto."; root.append(p); return; }
    items.forEach(item => {
      const row=document.createElement("article"); row.className="delegation-history-item";
      const info=document.createElement("div"); const title=document.createElement("strong"); title.textContent=item.provider+" · "+item.task.slice(0,110);
      const meta=document.createElement("small"); meta.textContent=new Date(item.updatedAt).toLocaleString("es-ES");
      info.append(title,meta);
      const restore=document.createElement("button"); restore.type="button"; restore.className="button button-secondary button-small"; restore.textContent="Recuperar";
      restore.addEventListener("click",()=>restoreRecord(item));
      row.append(info,restore); root.append(row);
    });
  };
  const restoreRecord = item => {
    $("#de-provider").value=item.providerId; $("#de-task").value=item.task; $("#de-context").value=item.context||"";
    $("#de-files").value=item.files||""; $("#de-include-project").checked=item.includeProject!==false;
    currentPrompt=item.prompt||""; currentRecordId=item.id; $("#de-output").textContent=currentPrompt||"Sin prompt guardado.";
    $("#de-open").href=PROVIDERS[item.providerId]?.url||PROVIDERS.claude.url;
    $("#de-copy").disabled=!currentPrompt; $("#de-download").disabled=!currentPrompt;
    $("#de-result").value=item.result||""; currentReview=item.review||null;\n    [...$("#de-review").querySelectorAll("input[type=checkbox]")].forEach((input,index)=>{input.checked=Boolean(item.review?.checks?.[index]);});
    $("#de-save-review").disabled=!$("#de-result").value.trim(); $("#de-export-review").disabled=!$("#de-result").value.trim();
    setStatus("Delegación recuperada. Revisa el prompt antes de volver a utilizarlo.");
    setStatus(item.result?"Respuesta recuperada. Revisa las casillas de validación.":"Aún no hay respuesta para revisar.","#de-review-status");
  };
  const buildReview = () => ({
    result:$("#de-result").value.trim(),
    checks:[...$("#de-review").querySelectorAll("input[type=checkbox]")].map(input=>input.checked),
    updatedAt:new Date().toISOString()
  });
  $("#de-provider").addEventListener("change", () => { $("#de-open").href=PROVIDERS[$("#de-provider").value].url; });
  $("#de-generate").addEventListener("click", () => {
    currentPrompt=makePrompt();
    if (!currentPrompt) { setStatus("Describe el objetivo antes de generar el encargo."); return; }
    const providerId=$("#de-provider").value, provider=PROVIDERS[providerId], task=$("#de-task").value.trim();
    currentRecordId=(globalThis.crypto?.randomUUID?.() || String(Date.now())+"-"+Math.random().toString(36).slice(2));
    $("#de-output").textContent=currentPrompt; $("#de-open").href=provider.url;
    $("#de-copy").disabled=false; $("#de-download").disabled=false;
    const project=activeProject();
    persistHistory({id:currentRecordId,projectId:project?.id||"workspace",providerId,provider:provider.name,task,context:$("#de-context").value.trim(),files:$("#de-files").value.trim(),includeProject:$("#de-include-project").checked,prompt:currentPrompt,updatedAt:new Date().toISOString()});
    setStatus("Prompt generado y guardado localmente. Copia el texto y envíalo manualmente a "+provider.name+".");
  });
  $("#de-copy").addEventListener("click", async () => {
    if (!currentPrompt) return;
    try { await navigator.clipboard.writeText(currentPrompt); setStatus("Prompt copiado al portapapeles."); }
    catch (_) { setStatus("No se pudo acceder al portapapeles. Selecciona y copia el texto del panel."); }
  });
  $("#de-download").addEventListener("click", () => { if(currentPrompt) download("agency-ai-os-encargo-"+slug($("#de-task").value)+".md",currentPrompt); });
  $("#de-result").addEventListener("input", () => {
    const enabled=Boolean($("#de-result").value.trim());
    $("#de-save-review").disabled=!enabled; $("#de-export-review").disabled=!enabled;
    setStatus(enabled?"Respuesta lista para revisión. Completa la lista de control antes de aceptar cambios.":"Aún no hay una respuesta para revisar.","#de-review-status");
  });
  $("#de-save-review").addEventListener("click", () => {
    if (!$("#de-result").value.trim()) return;
    const review=buildReview(), history=safeRead(HISTORY_KEY,[]), index=history.findIndex(x=>x.id===currentRecordId);
    if(index<0){setStatus("Genera primero un encargo para asociar esta revisión.");return;}
    history[index].result=review.result; history[index].review=review; history[index].updatedAt=review.updatedAt;
    localStorage.setItem(HISTORY_KEY,JSON.stringify(history)); currentReview=review; renderHistory();
    setStatus("Respuesta y checklist guardados localmente.","#de-review-status");
  });
  $("#de-export-review").addEventListener("click", () => {
    if (!$("#de-result").value.trim()) return;
    const review=buildReview(), labels=[...$("#de-review").querySelectorAll("label")].map((label,i)=>({label:label.textContent.trim(),ok:review.checks[i]}));
    const report=["# Informe de revisión · Agency AI OS","","## Respuesta recibida",review.result,"","## Checklist",...labels.map(x=>(x.ok?"- [x] ":"- [ ] ")+x.label),"","Fecha: "+review.updatedAt].join("\n");
    download("agency-ai-os-revision.md",report);
  });
  $("#de-clear-history").addEventListener("click", () => {
    const projectId=activeProject()?.id||"workspace";
    const rest=safeRead(HISTORY_KEY,[]).filter(x=>x.projectId!==projectId);
    localStorage.setItem(HISTORY_KEY,JSON.stringify(rest)); renderHistory();
    setStatus("Historial de este proyecto eliminado. No se han borrado otros proyectos.");
  });
  window.addEventListener("storage", event => { if(event.key===ACTIVE_KEY||event.key===PROJECTS_KEY) renderHistory(); });\n  $("#active-project-select")?.addEventListener("change", renderHistory);
  renderHistory();
})();
