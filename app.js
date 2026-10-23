(() => {
  "use strict";
  const STORE_KEY = "agency-ai-os.projects.v1";
  const HISTORY_KEY = "agency-ai-os.history.v1";
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  let projects = loadProjects();
  let activeProjectId = null;
  let toastTimer;

  function loadProjects() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
  }

  function saveProjects() {
    try { 
      localStorage.setItem(STORE_KEY, JSON.stringify(projects)); 
      saveHistory();
      autoSyncToDrive();
      return true; 
    }
    catch (_) { notify("No se pudo guardar. Exporta los datos y libera espacio."); return false; }
  }

  function saveHistory() {
    try {
      let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      history.unshift({ date: Date.now(), data: JSON.stringify(projects) });
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      history = history.filter(h => h.date > sevenDaysAgo);
      if (history.length > 50) history = history.slice(0, 50);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (_) {}
  }

  function autoSyncToDrive() {
    if (!localStorage.getItem("drive_linked")) return;
    fetch("/api/drive-save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projects, exportDate: new Date().toISOString() })
    }).catch(() => {});
  }

  function uid() { return "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function esc(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  
  function notify(message) {
    const toast = $("#toast"); toast.textContent = message; toast.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
  }
  
  function download(filename, content, type = "application/json;charset=utf-8") {
    const blob = new Blob([content], {type});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  
  function slugify(s) { return (s || "proyecto").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60) || "proyecto"; }
  
  function currentView(view) {
    $$(".view").forEach(el => el.classList.toggle("active", el.id === "view-" + view));
    $$(".nav-item[data-view]").forEach(el => el.classList.toggle("active", el.dataset.view === view));
    const labels = {dashboard:"Centro de mando",builder:"Nuevo proyecto",projects:"Proyectos",deliverables:"Entregables",settings:"Configuración"};
    $("#breadcrumb-current").textContent = labels[view] || "Workspace";
    $("#sidebar").classList.remove("open");
    if (view === "projects") renderProjects();
    if (view === "deliverables") renderDeliverables();
    window.scrollTo({top:0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"});
  }

  function getFormData(form) {
    const fd = new FormData(form);
    return {
      id: uid(), name: String(fd.get("projectName") || "").trim(), sector: String(fd.get("sector") || "").trim(),
      type: fd.get("projectType") || "landing", offer: String(fd.get("offer") || "").trim(),
      audience: String(fd.get("audience") || "").trim(), goal: String(fd.get("goal") || "").trim(),
      location: String(fd.get("location") || "").trim(), style: fd.get("style") || "editorial premium",
      color: /^#[0-9a-f]{6}$/i.test(fd.get("color") || "") ? fd.get("color") : "#8B5CF6",
      phone: String(fd.get("phone") || "").replace(/\D/g,""), requirements: String(fd.get("requirements") || "").trim(),
      domain: String(fd.get("domain") || "").trim(), deliverables: fd.getAll("deliverables"),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), status: "briefing"
    };
  }

  // --- LÓGICA DE IMPORTACIÓN DESDE LA WEB (RECUPERADA) ---
  async function importWebsiteData() {
    const domainInput = $("#domain").value.trim();
    const btn = $("#import-website");
    const statusText = $("#website-import-status");

    if (!domainInput || !domainInput.startsWith("http")) {
      notify("Introduce una URL válida (ej. https://tudominio.com)");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Analizando web...";
    statusText.textContent = "Extrayendo información de la web...";

    try {
      const response = await fetch('/api/site-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: domainInput })
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || "Error al analizar");

      // Autocompletar campos
      if (data.title) {
        $("#projectName").value = data.businessName || data.title.split("|")[0].trim();
      }
      if (data.description) {
        $("#offer").value = data.description;
      }
      if (data.headings && data.headings.length > 0) {
        $("#requirements").value = data.headings.slice(0, 5).join("\n");
      }
      
      statusText.textContent = "✅ Datos importados. Revisa el briefing antes de generar.";
      notify("Datos de la web importados con éxito.");
    } catch (error) {
      statusText.textContent = "❌ Error: " + error.message;
      notify("No se pudo importar la web. Revisa que sea una URL pública.");
    } finally {
      btn.disabled = false;
      btn.textContent = "↻ Autocompletar briefing desde la web";
    }
  }

  function makePlan(p) {
    const title = p.name;
    const audience = p.audience;
    const offer = p.offer;
    const goal = p.goal;
    const titleLine = `Una forma más clara de ${goal.toLowerCase().replace(/[.!?]+$/,"")}`;
    
    const copy = {
      brand: title,
      valueProposition: `${offer} Diseñado para ${audience.toLowerCase().replace(/[.!?]+$/,"")}.`,
      headline: titleLine,
      subheadline: `${offer} Una experiencia pensada para ${audience.toLowerCase().replace(/[.!?]+$/,"")}.`,
      primaryCTA: "Hablemos de tu proyecto",
      sections: [
        {name:"Hero",headline:titleLine,body:`${offer} Conoce una propuesta adaptada a tus objetivos.`,cta:"Hablemos de tu proyecto"},
        {name:"Servicios",headline:"Soluciones pensadas para avanzar",body:p.requirements || offer,cta:"Ver soluciones"},
        {name:"Proceso",headline:"Claridad en cada etapa",body:"Entendemos el contexto, definimos prioridades, ejecutamos y revisamos contigo.",cta:"Conocer el proceso"},
        {name:"Contacto",headline:"Cuéntanos qué necesitas",body:`El siguiente paso es entender el proyecto y valorar cómo ayudarte a conseguir: ${goal}`,cta:"Enviar solicitud"}
      ]
    };

    const ux = {
      concept:`Dirección visual ${p.style}, con contraste editorial y un color de acento ${p.color}.`,
      palette:[{name:"Fondo",hex:"#F5F5F9"},{name:"Superficie",hex:"#FFFFFF"},{name:"Texto",hex:"#17151D"},{name:"Acento",hex:p.color}],
      typography:["Inter o Manrope para titulares y textos funcionales.","Jerarquía breve: H1 único, H2 por sección, párrafos cortos.","Botones con alto contraste y áreas táctiles de 44px."],
      layout:["Hero con propuesta concreta y CTA primario.","Servicios en bloques diferenciados.","Prueba de confianza solo con evidencias reales.","Formulario breve."]
    };

    const superPromptCode = `Actúa como un desarrollador Frontend Senior y Diseñador UX/UI experto.
Tu tarea es crear el código completo de una Landing Page en HTML, CSS y JavaScript nativo (sin frameworks externos) basándote en esta información:

NEGOCIO: ${title}
SECTOR: ${p.sector}
PROPUESTA DE VALOR: ${offer}
PÚBLICO OBJETIVO: ${audience}
OBJETIVO PRINCIPAL: ${goal}
ESTILO VISUAL: ${p.style}
COLOR PRINCIPAL: ${p.color}
SECCIONES REQUERIDAS: ${p.requirements || "Hero, Servicios, Contacto"}

REQUISITOS TÉCNICOS:
1. Crea un único archivo HTML con CSS y JS embebidos.
2. El diseño debe ser responsive (mobile-first).
3. Usa la tipografía 'Inter' desde Google Fonts.
4. Aplica el color principal ${p.color} a los botones y acentos.
5. Incluye un botón de WhatsApp flotante que enlace a: https://wa.me/${p.phone}
6. Todo el código debe estar listo para copiar y pegar en un archivo .html y abrirlo en el navegador.
7. Respeta la accesibilidad (etiquetas semánticas, alt en imágenes, contraste).

ENTREGA: Solo devuelve el código HTML completo, sin explicaciones.`;

    const seo = {
      title:`${title} | ${p.sector}`,
      description:`${offer} Descubre cómo ${title} puede ayudarte a ${goal.toLowerCase().replace(/[.!?]+$/,"")}.`,
      h1:titleLine,
      checklist:["Confirmar dominio y URL canónica","Añadir textos alternativos a imágenes","Comprobar velocidad en PageSpeed Insights","Añadir datos estructurados Schema.org"]
    };

    const bot = {
      name:`Asistente de ${title}`,
      status:p.phone ? "Enlace wa.me preparado." : "Número pendiente.",
      entry:{welcome:`¡Hola! Gracias por contactar con ${title}. ¿En qué podemos ayudarte?`,options:[{id:"services",label:"Información sobre servicios"},{id:"quote",label:"Pedir presupuesto"}]},
      implementationNotes:["Para automatización se necesita WhatsApp Business Platform.","Respetar opt-in y políticas de Meta."]
    };

    const aiAgent = {
      name: `Consultor Virtual de ${title}`,
      systemPrompt: `Eres el asistente virtual de ${title}, un negocio de ${p.sector}. 
Tu objetivo es atender a ${audience} y ayudarles a conseguir: ${goal}.
Tono: Profesional, cercano y resolutivo.
Reglas:
1. Si te preguntan por precios, di que dependen del proyecto y ofrece enviar un presupuesto.
2. Si el usuario quiere hablar con una persona, proporciónale este WhatsApp: ${p.phone || "Pendiente"}.
3. No inventes servicios que no estén en esta lista: ${offer}.
Responde siempre en español.`
    };

    const socialMedia = {
      strategy: `Estrategia de contenido para ${title} enfocada en ${p.sector}.`,
      pillars: ["Educación (Consejos para el cliente ideal)", "Autoridad (Casos de éxito o proceso)", "Venta (Servicios y promociones)"],
      postIdeas: [
        `Carrusel: "3 errores que cometes al buscar ${p.sector}"`,
        `Reel: "Así trabajamos en ${title} detrás de cámaras"`,
        `Post: "Por qué ${audience} confía en nosotros"`
      ],
      hashtags: `#${p.sector.replace(/\s+/g, '')} #${title.replace(/\s+/g, '')} #Negocios #Emprendimiento`
    };

    const qa = [
      {check:"Responsive",status:"Pendiente de probar"},
      {check:"Formulario",status:"No conectado (requiere backend)"},
      {check:"SEO",status:"Metadatos propuestos"}
    ];

    return {copy, ux, superPromptCode, seo, bot, aiAgent, socialMedia, qa};
  }

  function renderProjects() {
    $("#project-count").textContent = projects.length;
    $("#stat-projects").textContent = projects.length;
    const recent = $("#recent-projects");
    if (!projects.length) {
      recent.className = "empty-state";
      recent.innerHTML = '<div class="empty-icon">▤</div><strong>Aún no hay proyectos</strong><p>Tu próximo proyecto empieza con un buen briefing.</p><button class="button button-secondary" data-go="builder">Crear proyecto</button>';
    } else {
      recent.className = "projects-list";
      recent.innerHTML = projects.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,3).map(p=>projectRow(p,true)).join("");
    }
    const list = $("#projects-list");
    if (!projects.length) {
      list.innerHTML = '<div class="panel empty-state"><div class="empty-icon">▤</div><strong>Tu espacio está listo</strong><p>Crea un proyecto para generar el primer plan multiagente.</p><button class="button button-primary" data-go="builder">Crear proyecto</button></div>';
    } else {
      list.innerHTML = projects.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(p=>projectRow(p,false)).join("");
    }
    bindProjectRowActions();
  }

  function projectRow(p, compact) {
    const date = new Date(p.createdAt).toLocaleDateString("es-ES",{day:"2-digit",month:"short",year:"numeric"});
    return `<article class="project-row"><div class="project-row-icon">✳</div><div class="project-row-main"><strong>${esc(p.name)}</strong><small>${esc(p.sector)} · ${esc(p.type)} · ${date}</small></div><div class="project-row-actions"><button class="button-quiet" data-open="${esc(p.id)}">Abrir</button>${compact ? "" : `<button class="button-quiet" data-export="${esc(p.id)}">Exportar JSON</button><button class="button-quiet" data-delete="${esc(p.id)}">Eliminar</button>`}</div></article>`;
  }

  function bindProjectRowActions() {
    $$("[data-open]").forEach(b=>b.addEventListener("click",()=>{activeProjectId=b.dataset.open;currentView("deliverables");}));
    $$("[data-export]").forEach(b=>b.addEventListener("click",()=>exportProject(b.dataset.export)));
    $$("[data-delete]").forEach(b=>b.addEventListener("click",()=>deleteProject(b.dataset.delete)));
  }

  function findProject(id) { return projects.find(p=>p.id===id); }

  function deliverableCard(title, tag, desc, content, filename, mime="text/plain;charset=utf-8") {
    return `<article class="deliverable-card"><div class="deliverable-card-top"><span class="pill pill-muted">${esc(tag)}</span><span class="stat-symbol">⌘</span></div><h3>${esc(title)}</h3><p>${esc(desc)}</p><pre class="deliverable-code">${esc(String(content).slice(0,550))}${String(content).length>550?"…":""}</pre><button class="button button-secondary" data-download="${encodeURIComponent(filename)}" data-mime="${encodeURIComponent(mime)}" data-content="${encodeURIComponent(content)}">Descargar archivo ↧</button></article>`;
  }

  function renderDeliverables() {
    const host = $("#deliverables-content");
    if (!projects.length) {
      host.innerHTML = '<div class="panel empty-state"><div class="empty-icon">⌘</div><strong>Selecciona o crea un proyecto</strong><p>Aquí podrás revisar el copy, la guía visual, el plan técnico y el flujo del bot.</p><button class="button button-primary" data-go="builder">Crear proyecto</button></div>';
      return;
    }
    if (!activeProjectId || !findProject(activeProjectId)) activeProjectId = projects[0].id;
    const p = findProject(activeProjectId);
    const plan = p.plan || makePlan(p);
    
    const selector = `<div class="panel deliverable-project-select"><label for="deliverable-select">Proyecto</label><select id="deliverable-select">${projects.map(x=>`<option value="${esc(x.id)}" ${x.id===p.id?"selected":""}>${esc(x.name)}</option>`).join("")}</select><button class="button button-primary" id="export-package">Exportar paquete completo ↧</button></div>`;
    
    const cardsArray = [
      deliverableCard("Copywriting","01 · COPY","Textos listos para la web.",JSON.stringify(plan.copy,null,2),`${slugify(p.name)}-copy.json`),
      deliverableCard("Guía UX/UI","02 · DESIGN","Colores, tipografía y estructura.",JSON.stringify(plan.ux,null,2),`${slugify(p.name)}-design.json`),
      deliverableCard("⚡ Super Prompt (Web IA)","03 · PROMPT","Pega esto en ChatGPT/Claude para que te programe la web entera.",plan.superPromptCode,`${slugify(p.name)}-prompt-web.txt`,"text/plain;charset=utf-8"),
      deliverableCard("SEO Técnico","04 · SEO","Metadatos y listas de comprobación.",JSON.stringify(plan.seo,null,2),`${slugify(p.name)}-seo.json`),
      deliverableCard("Bot WhatsApp","05 · BOT","Flujo de conversación comercial.",JSON.stringify(plan.bot,null,2),`${slugify(p.name)}-bot.json`),
      deliverableCard("🤖 Agente IA (ChatGPT)","06 · AGENTE","System Prompt para configurar un asistente experto.",JSON.stringify(plan.aiAgent,null,2),`${slugify(p.name)}-agente-ia.json`),
      deliverableCard("📱 Estrategia Redes","07 · SOCIAL","Pilares de contenido e ideas de posts.",JSON.stringify(plan.socialMedia,null,2),`${slugify(p.name)}-redes.json`),
      deliverableCard("QA y estado","08 · QA","Comprobaciones pendientes.",JSON.stringify(plan.qa,null,2),`${slugify(p.name)}-qa.json`)
    ];

    host.innerHTML = selector + `<div class="panel export-site-row"><div><strong>Propuesta Comercial</strong><p class="body-copy">Genera el comparador visual Antes/Después para enseñárselo al cliente.</p></div><button class="button button-primary" id="open-propuesta">Preparar comparativa ↗</button><button class="button button-secondary" id="export-landing">Exportar landing rápida ↧</button></div><div class="deliverable-grid">${cardsArray.join("")}</div>`;
    
    $("#deliverable-select").addEventListener("change",e=>{activeProjectId=e.target.value;renderDeliverables();});
    $("#export-package").addEventListener("click",()=>exportProject(p.id));
    $("#export-landing").addEventListener("click",()=>exportSite(p));
    $("#open-propuesta").addEventListener("click",()=>{window.location.href=`./propuesta-comercial.html?project=${encodeURIComponent(p.id)}`;});
    
    $$("[data-download]",host).forEach(btn=>btn.addEventListener("click",()=>{
      download(decodeURIComponent(btn.dataset.download),decodeURIComponent(btn.dataset.content),decodeURIComponent(btn.dataset.mime));
      notify("Descarga preparada.");
    }));
  }

  function exportProject(id) {
    const p = findProject(id); if (!p) return;
    const payload = {...p, plan:p.plan || makePlan(p), exportedAt:new Date().toISOString(), prototypeNotice:"Los entregables son borradores generados localmente."};
    download(`${slugify(p.name)}-agency-ai-package.json`,JSON.stringify(payload,null,2));
    notify("Paquete JSON exportado.");
  }

  function deleteProject(id) {
    const p = findProject(id); if (!p) return;
    if (!confirm(`¿Eliminar el proyecto "${p.name}" de este navegador?`)) return;
    projects = projects.filter(x=>x.id!==id); saveProjects();
    if (activeProjectId===id) activeProjectId=projects[0]?.id || null;
    renderProjects(); renderDeliverables(); notify("Proyecto eliminado.");
  }

  function exportAll() {
    download("agency-ai-workspace-backup.json",JSON.stringify({schemaVersion:1,exportedAt:new Date().toISOString(),projects},null,2));
    notify("Copia del workspace exportada.");
  }

  function buildLandingHtml(p) { return ""; /* ... (tu código anterior) ... */ }
  function exportSite(p) { /* ... (tu código anterior) ... */ }

  // --- LISTENERS ---
  $$(".nav-item[data-view]").forEach(btn=>btn.addEventListener("click",()=>currentView(btn.dataset.view)));
  document.addEventListener("click", e => { const go = e.target.closest("[data-go]"); if (go) currentView(go.dataset.go); });
  $("#top-new").addEventListener("click",()=>currentView("builder"));
  $("#mobile-menu").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
  $("#color-picker").addEventListener("input",e=>$("#color").value=e.target.value);
  $("#color").addEventListener("input",e=>{if(/^#[0-9a-f]{6}$/i.test(e.target.value))$("#color-picker").value=e.target.value;});
  
  const importBtn = $("#import-website");
  if(importBtn) importBtn.addEventListener("click", importWebsiteData);

  $("#project-form").addEventListener("submit",e=>{
    e.preventDefault();
    const form=e.currentTarget;
    if(!form.reportValidity())return;
    const p=getFormData(form);
    if(!p.deliverables.length){notify("Selecciona al menos un entregable.");return;}
    p.plan=makePlan(p);
    projects.unshift(p);
    if(!saveProjects()){projects=projects.filter(x=>x.id!==p.id);return;}
    activeProjectId=p.id;
    renderProjects();
    $("#dialog-title").textContent=p.name;
    $("#dialog-description").textContent=`Briefing guardado. Se ha generado una primera propuesta de trabajo para ${p.sector}.`;
    const dialog=$("#project-dialog");
    if(typeof dialog.showModal==="function")dialog.showModal();
    else {currentView("deliverables");}
    form.reset();$("#color").value="#8B5CF6";$("#color-picker").value="#8B5CF6";
  });

  $("#dialog-close").addEventListener("click",()=>$("#project-dialog").close());
  $("#dialog-open").addEventListener("click",()=>{$("#project-dialog").close();currentView("deliverables");});
  $("#dialog-export").addEventListener("click",()=>exportProject(activeProjectId));
  $("#export-all").addEventListener("click",exportAll);
  
  $("#clear-data").addEventListener("click",()=>{
    if(!projects.length){notify("No hay proyectos que borrar.");return;}
    if(!confirm("Esto eliminará todos los proyectos guardados en este navegador. ¿Continuar?"))return;
    projects=[];activeProjectId=null;saveProjects();renderProjects();renderDeliverables();notify("Datos locales eliminados.");
  });

  const driveStatus = document.getElementById("drive-status");
  const btnLink = document.getElementById("btn-link-drive");
  const btnSync = document.getElementById("btn-sync-drive");

  if (window.location.search.includes("drive=success")) {
    if(driveStatus) driveStatus.textContent = "✅ Drive vinculado correctamente.";
    if(btnSync) btnSync.disabled = false;
    if(btnLink) btnLink.textContent = "Volver a vincular";
    localStorage.setItem("drive_linked", "true");
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (localStorage.getItem("drive_linked")) {
    if(driveStatus) driveStatus.textContent = "✅ Drive vinculado (Autoguardado activo)";
    if(btnSync) btnSync.disabled = false;
  }

  if (btnLink) {
    btnLink.addEventListener("click", () => { window.location.href = "/api/drive-auth"; });
  }

  if (btnSync) {
    btnSync.addEventListener("click", async () => {
      btnSync.disabled = true; btnSync.textContent = "Sincronizando...";
      try {
        const res = await fetch("/api/drive-save", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projects, exportDate: new Date().toISOString() })
        });
        if (!res.ok) throw new Error();
        if(driveStatus) driveStatus.textContent = "✅ Copia guardada en Drive a las " + new Date().toLocaleTimeString();
      } catch (e) {
        if(driveStatus) driveStatus.textContent = "❌ Error al sincronizar.";
      } finally {
        btnSync.disabled = false; btnSync.textContent = "Sincronizar ahora";
      }
    });
  }

  const btnHistory = document.getElementById("btn-restore-history");
  if(btnHistory) {
    if(localStorage.getItem(HISTORY_KEY)) btnHistory.style.display = "inline-flex";
    btnHistory.addEventListener("click", () => {
      const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      if(history.length < 2) { notify("No hay suficientes versiones guardadas."); return; }
      if(confirm("¿Quieres recuperar la versión anterior?")) {
        projects = JSON.parse(history[1].data); 
        localStorage.setItem(STORE_KEY, JSON.stringify(projects));
        notify("Versión recuperada."); location.reload();
      }
    });
  }

  renderProjects();
})();
