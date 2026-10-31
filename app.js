(() => {
  "use strict";
  const STORE_KEY = "agency-ai-os.projects.v1";
  const HISTORY_KEY = "agency-ai-os.history.v1";
  const ACTIVE_PROJECT_KEY = "agency-ai-os.active-project-id.v1";
  let latestWebsiteAudit = null;
  let integrationFlags = {};
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  let projects = loadProjects();
  let activeProjectId = localStorage.getItem(ACTIVE_PROJECT_KEY) || null;
  let cloudWorkspaceConnected = false;
  let toastTimer;

  function loadProjects() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
  }

  function saveProjects() {
    try { 
      const savedAt = new Date().toISOString();
      projects.forEach(project => { if (project && typeof project === "object") project.updatedAt = savedAt; });
      localStorage.setItem(STORE_KEY, JSON.stringify(projects)); 
      saveHistory();
      autoSyncToDrive();
      if (cloudWorkspaceConnected) syncProjectsToCloud();
      return true; 
    }
    catch (_) { notify("No se pudo guardar. Exporta los datos y libera espacio."); return false; }
  }

  function setCloudStatus(message, connected = cloudWorkspaceConnected) {
    const el = $("#cloud-workspace-status");
    const button = $("#cloud-workspace-connect");
    if (el) el.textContent = connected ? "WORKSPACE SINCRONIZADO" : message;
    if (button) button.textContent = connected ? "Nube conectada" : "Conectar nube";
  }

  async function syncProjectsToCloud() {
    if (!cloudWorkspaceConnected) return;
    for (const project of projects) {
      try {
        const response = await fetch("/api/projects", {
          method: "POST", credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project })
        });
        if (response.status === 401 || response.status === 503) {
          cloudWorkspaceConnected = false;
          setCloudStatus("NUBE NO DISPONIBLE", false);
          return;
        }
        if (!response.ok) throw new Error("No se pudo guardar en la nube");
      } catch (_) {
        setCloudStatus("ERROR DE SINCRONIZACIÓN", false);
        return;
      }
    }
    setCloudStatus("WORKSPACE SINCRONIZADO", true);
  }

  async function connectCloudWorkspace() {
    const password = window.prompt("Introduce tu contraseña privada de Agency AI OS:");
    if (!password) return;
    const button = $("#cloud-workspace-connect");
    if (button) { button.disabled = true; button.textContent = "Conectando…"; }
    try {
      const login = await fetch("/api/owner-login", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const loginData = await login.json().catch(() => ({}));
      if (!login.ok) throw new Error(loginData.error || "No se pudo iniciar sesión.");
      const response = await fetch("/api/projects", { credentials: "same-origin", cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || (data.code === "D1_NOT_CONFIGURED" ? "Falta configurar la base D1 AGENCY_DB en Cloudflare." : "No se pudo abrir el Workspace compartido."));
      const remote = Array.isArray(data.projects) ? data.projects : [];
      const merged = new Map(remote.filter(p => p && p.id).map(p => [String(p.id), p]));
      for (const local of projects) {
        if (!local?.id) continue;
        const cloud = merged.get(String(local.id));
        const localTime = Date.parse(local.updatedAt || local.createdAt || 0) || 0;
        const cloudTime = Date.parse(cloud?.updatedAt || cloud?.createdAt || 0) || 0;
        if (!cloud || localTime > cloudTime) merged.set(String(local.id), local);
      }
      projects = [...merged.values()].sort((a, b) => (Date.parse(b.updatedAt || b.createdAt || 0) || 0) - (Date.parse(a.updatedAt || a.createdAt || 0) || 0));
      localStorage.setItem(STORE_KEY, JSON.stringify(projects));
      cloudWorkspaceConnected = true;
      renderProjects();
      await syncProjectsToCloud();
      notify("Workspace compartido conectado. Se han combinado los proyectos locales y los de la nube.");
    } catch (error) {
      cloudWorkspaceConnected = false;
      setCloudStatus(error.message || "No se pudo conectar", false);
      notify(error.message || "No se pudo conectar el Workspace.");
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function restoreCloudWorkspaceSession() {
    try {
      const response = await fetch("/api/projects", { credentials: "same-origin", cache: "no-store" });
      if (response.status === 401) { setCloudStatus("SOLO ESTE DISPOSITIVO", false); return; }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setCloudStatus(data.code === "D1_NOT_CONFIGURED" ? "CONFIGURA D1" : "NUBE NO DISPONIBLE", false); return; }
      const merged = new Map((data.projects || []).filter(p => p?.id).map(p => [String(p.id), p]));
      for (const local of projects) {
        const cloud = merged.get(String(local.id));
        const lt = Date.parse(local.updatedAt || local.createdAt || 0) || 0;
        const ct = Date.parse(cloud?.updatedAt || cloud?.createdAt || 0) || 0;
        if (!cloud || lt > ct) merged.set(String(local.id), local);
      }
      projects = [...merged.values()];
      localStorage.setItem(STORE_KEY, JSON.stringify(projects));
      cloudWorkspaceConnected = true;
      renderProjects();
      await syncProjectsToCloud();
    } catch (_) { setCloudStatus("SIN CONEXIÓN", false); }
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
    if (!integrationFlags.googleDrive || !localStorage.getItem("drive_linked")) return;
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
    const labels = {dashboard:"Centro de mando",builder:"Nuevo proyecto",projects:"Proyectos",deliverables:"Entregables",settings:"Configuración","creative-engine":"Creative Engine"};
    $("#breadcrumb-current").textContent = labels[view] || "Workspace";
    $("#sidebar").classList.remove("open");
    if (view === "projects") renderProjects();
    if (view === "deliverables") renderDeliverables();
    if (view === "propuesta-comercial") {
      const frame = $("#frame-propuesta-comercial");
      const selected = activeProjectId || projects[0]?.id || "";
      if (selected) { activeProjectId = selected; localStorage.setItem(ACTIVE_PROJECT_KEY, selected); }
      if (frame) frame.src = "./propuesta-comercial.html?embedded=1" + (selected ? "&project=" + encodeURIComponent(selected) : "");
    }
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
      domain: String(fd.get("domain") || "").trim(), websiteAudit: latestWebsiteAudit,
      delivery: {
        webSituation: String(fd.get("webSituation") || "new"),
        demoFormat: String(fd.get("demoFormat") || "both"),
        buildMethod: String(fd.get("buildMethod") || "hybrid"),
        hostingPlan: String(fd.get("hostingPlan") || "cloudflare"),
        ownership: String(fd.get("ownership") || "client"),
        paidApproval: String(fd.get("paidApproval") || "approval-required")
      },
      deliverables: fd.getAll("deliverables"),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), status: "briefing"
    };
  }

  // --- LÓGICA DE IMPORTACIÓN DESDE LA WEB (RECUPERADA) ---
  async function importWebsiteData() {
    const domainInput = $("#domain").value.trim();
    const btn = $("#import-website");
    const statusText = $("#website-import-status");
    const results = $("#website-audit-results");
    let parsedUrl;
    try { parsedUrl = new URL(domainInput); } catch (_) {
      notify("Introduce una URL completa, por ejemplo https://www.empresa.com");
      $("#domain").focus(); return;
    }
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      notify("La URL debe comenzar por https:// o http://"); return;
    }
    btn.disabled = true;
    btn.textContent = "Auditando el sitio…";
    if (results) { results.hidden = true; results.innerHTML = ""; }
    statusText.textContent = "Conectando con la web, consultando sus reglas de rastreo y descubriendo páginas públicas…";
    try {
      const response = await fetch("/api/site-audit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: parsedUrl.href, maxPages: 20 }),
        signal: AbortSignal.timeout(110000)
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo completar la auditoría.");

      statusText.textContent = "Rastreo completado. Midiendo rendimiento y calidad con PageSpeed Insights en móvil y escritorio…";
      const pageSpeedResults = await Promise.all(["mobile", "desktop"].map(async strategy => {
        try {
          const psiResponse = await fetch("/api/pagespeed?url=" + encodeURIComponent(parsedUrl.href) + "&strategy=" + strategy, { signal: AbortSignal.timeout(55000) });
          const psi = await psiResponse.json();
          if (!psiResponse.ok || !psi.lighthouseResult) return { available: false, error: psi.error || "PageSpeed no disponible" };
          const lighthouse = psi.lighthouseResult;
          const audits = lighthouse.audits || {};
          const metricIds = ["largest-contentful-paint", "interaction-to-next-paint", "cumulative-layout-shift", "first-contentful-paint", "speed-index", "total-blocking-time", "server-response-time"];
          return {
            available: true, strategy, fetchedAt: new Date().toISOString(),
            scores: Object.fromEntries(["performance", "accessibility", "best-practices", "seo"].map(key => [key, lighthouse.categories?.[key]?.score == null ? null : Math.round(lighthouse.categories[key].score * 100)])),
            metrics: Object.fromEntries(metricIds.filter(key => audits[key]).map(key => [key, { value: audits[key].numericValue ?? null, displayValue: audits[key].displayValue || "", score: audits[key].score ?? null }])),
            finalUrl: lighthouse.finalDisplayedUrl || lighthouse.finalUrl || parsedUrl.href
          };
        } catch (error) { return { available: false, error: error.message || "PageSpeed no disponible" }; }
      }));
      data.pageSpeed = { mobile: pageSpeedResults[0], desktop: pageSpeedResults[1] };
      latestWebsiteAudit = data;
      const setValue = (selector, value) => {
        const field = $(selector);
        if (field && value !== undefined && value !== null && String(value).trim()) field.value = String(value);
      };
      setValue("#projectName", data.projectName || data.title?.split(/[|–—-]/)[0]?.trim() || parsedUrl.hostname);
      setValue("#sector", data.sector);
      setValue("#offer", data.offer);
      setValue("#audience", data.audience);
      setValue("#goal", data.goal);
      setValue("#requirements", data.requirements || (data.pages || []).flatMap(page => page.h1 || []).slice(0, 12).join("\n"));
      if (data.themeColor && /^#[0-9a-f]{6}$/i.test(data.themeColor)) {
        $("#color").value = data.themeColor; $("#color-picker").value = data.themeColor;
      }
      if (results) {
        const metrics = [
          ["Páginas analizadas", data.crawl?.pagesAnalyzed ?? data.pages?.length ?? 0],
          ["URLs descubiertas", data.crawl?.urlsDiscovered ?? data.pages?.length ?? 0],
          ["Hallazgos", data.findings?.length ?? 0],
          ["Imágenes sin ALT", data.images?.missingAlt ?? 0]
        ];
        const mobileScore = data.pageSpeed?.mobile?.scores?.performance;
        const desktopScore = data.pageSpeed?.desktop?.scores?.performance;
        if (mobileScore != null) metrics.push(["Rendimiento móvil", mobileScore + "/100"]);
        if (desktopScore != null) metrics.push(["Rendimiento escritorio", desktopScore + "/100"]);
        results.innerHTML = '<div class="audit-result-head"><strong>Resultado de la auditoría inicial</strong><span class="pill pill-muted">' + (data.crawl?.complete ? "RASTREO FINALIZADO" : "RASTREO PARCIAL") + '</span></div><div class="audit-result-grid">' +
          metrics.map(([label, value]) => '<div class="audit-result-metric"><strong>' + esc(value) + '</strong><span>' + esc(label) + '</span></div>').join("") +
          '</div><p class="audit-result-note">' + esc(data.summary || "Auditoría técnica de páginas públicas.") + ' ' + esc(data.limitations?.join(" ") || "") + '</p>';
        results.hidden = false;
      }
      const count = data.crawl?.pagesAnalyzed ?? data.pages?.length ?? 1;
      statusText.textContent = "Auditoría recibida: " + count + " páginas examinadas. Revisa y completa los datos que solo el cliente puede confirmar.";
      notify("Auditoría web incorporada al briefing.");
    } catch (error) {
      statusText.textContent = "No se pudo completar la auditoría: " + error.message + ". No se guardará como auditoría completa.";
      notify("La auditoría no se ha completado.");
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Iniciar briefing completo <span>↗</span>';
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
    
    $("#deliverable-select").addEventListener("change",e=>{activeProjectId=e.target.value;localStorage.setItem(ACTIVE_PROJECT_KEY,activeProjectId);renderDeliverables();});
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
    if (cloudWorkspaceConnected) fetch("/api/projects?id=" + encodeURIComponent(id), { method: "DELETE", credentials: "same-origin" }).catch(() => setCloudStatus("ERROR DE SINCRONIZACIÓN", false));
    if (activeProjectId===id) activeProjectId=projects[0]?.id || null;
    renderProjects(); renderDeliverables(); notify("Proyecto eliminado.");
  }

  function exportAll() {
    download("agency-ai-workspace-backup.json",JSON.stringify({schemaVersion:1,exportedAt:new Date().toISOString(),projects},null,2));
    notify("Copia del workspace exportada.");
  }

  function buildLandingHtml(p) {
    const plan = p.plan || makePlan(p);
    const c = plan.copy;
    const s = plan.seo || {};
    const og = s.openGraph || { title: s.title || p.name, description: s.description || p.offer };
    const color = /^#[0-9a-f]{6}$/i.test(p.color || "") ? p.color : "#8B5CF6";
    const phoneLink = p.phone ? `https://wa.me/${p.phone}?text=${encodeURIComponent("Hola, me gustaría recibir información sobre " + p.name + ".")}` : "#contacto";
    const sectionHtml = c.sections.map((sec,i)=>{
      const sectionId = slugify(sec.name) || ("seccion-" + (i+1));
      const isFaq = /preguntas|faq/i.test(sec.name);
      const isContact = /contacto/i.test(sec.name);
      let html = '<section class="section ' + (i%2 ? 'section-alt' : '') + '" id="' + esc(sectionId) + '"><div class="container">';
      html += '<p class="kicker">0' + (i+1) + ' / ' + esc(sec.name) + '</p><h2>' + esc(sec.headline) + '</h2><p class="section-copy">' + esc(sec.body) + '</p>';
      if(isFaq) html += '<details><summary>¿Cómo empezamos?</summary><p>Cuéntanos tu objetivo y revisaremos el alcance del proyecto.</p></details><details><summary>¿Qué información necesitáis?</summary><p>Una descripción de tu negocio, tus necesidades y el resultado que buscas.</p></details>';
      if(isContact) html += '<form class="lead-form" id="lead-form"><label>Nombre<input required name="name" autocomplete="name"></label><label>Email<input required type="email" name="email" autocomplete="email"></label><label>¿Qué necesitas?<textarea required name="message" rows="4"></textarea></label><label class="consent"><input required type="checkbox" name="consent"> He leído la política de privacidad.</label><button class="cta" type="submit">Enviar solicitud ↗</button><p class="form-note" id="form-note" role="status">Formulario de demostración: configura un endpoint para recibir solicitudes.</p></form>';
      html += '<a class="text-link" href="' + (isContact ? phoneLink : '#contacto') + '">' + esc(sec.cta) + ' ↗</a></div></section>';
      return html;
    }).join("");
    return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(s.title)}</title><meta name="description" content="${esc(s.description)}"><meta property="og:type" content="website"><meta property="og:title" content="${esc(og.title)}"><meta property="og:description" content="${esc(og.description)}"><meta name="theme-color" content="${esc(color)}"><style>
:root{--accent:${color};--ink:#17151d;--muted:#696777;--paper:#f5f5f9;--line:#e7e6ef}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font-family:Inter,Arial,sans-serif}a{color:inherit}.nav{height:76px;padding:0 6vw;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line)}.brand{font-weight:800;letter-spacing:-.04em}.nav a{text-decoration:none;font-size:13px}.hero{min-height:74vh;display:flex;align-items:center;padding:90px 6vw;background:radial-gradient(ellipse at 80% 10%,${color}25,transparent 45%),var(--paper)}.container{max-width:1080px;margin:auto;width:100%}.hero .container{max-width:1080px}.kicker{text-transform:uppercase;letter-spacing:.16em;font-size:11px;color:var(--accent);font-weight:700}.hero h1{font-size:clamp(42px,7.5vw,88px);letter-spacing:-.075em;line-height:.98;max-width:900px;margin:25px 0}.hero p{max-width:620px;font-size:clamp(16px,2vw,20px);line-height:1.7;color:var(--muted)}.cta{display:inline-flex;background:var(--ink);color:white;border:0;border-radius:100px;padding:15px 22px;text-decoration:none;font-size:13px;font-weight:700;cursor:pointer;margin-top:15px}.section{padding:100px 6vw;border-top:1px solid var(--line)}.section-alt{background:#ffffff}.section h2{font-size:clamp(32px,5vw,56px);line-height:1.05;letter-spacing:-.06em;max-width:750px;margin:15px 0}.section-copy{max-width:680px;color:var(--muted);font-size:17px;line-height:1.8}.text-link{display:inline-block;margin-top:22px;text-decoration:none;border-bottom:1px solid var(--accent);padding-bottom:5px;font-size:13px;font-weight:700}.lead-form{max-width:580px;display:grid;gap:14px;margin:30px 0}.lead-form label{display:grid;gap:6px;font-size:12px;font-weight:700}.lead-form input,.lead-form textarea{border:1px solid #d3cfc8;border-radius:8px;padding:12px;background:white;font:inherit}.lead-form .consent{display:flex;align-items:center;gap:8px;font-weight:400}.lead-form .consent input{width:auto}.form-note{font-size:12px;color:var(--muted)}details{border-bottom:1px solid var(--line);padding:18px 0;max-width:700px}summary{cursor:pointer;font-weight:700}footer{padding:35px 6vw;background:#15151b;color:#d8d8df;font-size:12px}footer .container{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap}@media(max-width:600px){.nav{padding:0 5vw;height:64px}.hero{padding:70px 6vw;min-height:68vh}.section{padding:70px 6vw}.hero h1{font-size:clamp(40px,13vw,64px)}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
</style></head><body><header class="nav"><a class="brand" href="#inicio">${esc(p.name)}</a><a href="#contacto">Hablemos ↗</a></header><main><section class="hero" id="inicio"><div class="container"><p class="kicker">${esc(p.sector)}</p><h1>${esc(c.headline)}</h1><p>${esc(c.subheadline)}</p><a class="cta" href="${phoneLink}">${esc(c.primaryCTA)} ↗</a></div></section>${sectionHtml}</main><footer><div class="container"><strong>${esc(p.name)}</strong><span>© <span id="year"></span> · Todos los derechos reservados</span></div></footer><script>
document.getElementById("year").textContent=new Date().getFullYear();
const form=document.getElementById("lead-form");if(form){form.addEventListener("submit",async e=>{e.preventDefault();const note=document.getElementById("form-note");note.textContent="Formulario validado en este navegador. Para recibir solicitudes, conecta un endpoint en el servidor.";note.setAttribute("aria-live","polite");});}
</script></body></html>`;
  }
  function exportSite(p) {
    const html = buildLandingHtml(p);
    download(`${slugify(p.name)}-landing.html`,html,"text/html;charset=utf-8");
    notify("Landing HTML exportada. El formulario de demostración requiere conectar un endpoint para recibir leads.");
  }

  async function loadIntegrationStatus() {
    const grid = $("#view-settings .settings-grid");
    if (!grid) return;
    let data;
    try {
      const response = await fetch("/api/integrations/status", { cache: "no-store" });
      if (!response.ok) throw new Error("Estado no disponible");
      data = await response.json();
    } catch (_) {
      const fallback = document.createElement("article");
      fallback.className = "panel settings-card";
      fallback.textContent = "No se pudo consultar el estado de las integraciones. Por seguridad, las conexiones externas permanecen desactivadas.";
      grid.prepend(fallback);
      return;
    }
    integrationFlags = Object.fromEntries((data.integrations || []).map(item => [item.id, item.enabled]));
    const card = document.createElement("article");
    card.className = "panel settings-card integration-control-card";
    const rows = (data.integrations || []).map(item => {
      const status = item.id === "canva" ? (item.connected ? "Conectada · sin coste de API" : (item.enabled ? "Credenciales listas · OAuth pendiente" : "Configurar credenciales")) : (item.enabled ? "Habilitada en servidor" : "Desactivada");
      return '<div class="integration-status-row"><div><strong>' + esc(item.label) + '</strong><small>' + esc(item.function) + '</small><small class="integration-cost">' + esc(item.costNotice) + '</small></div><span class="pill ' + ((item.enabled && (item.id !== "canva" || item.connected)) ? "pill-green" : "pill-muted") + '">' + status + '</span></div>';
    }).join("");
    card.innerHTML = '<div class="settings-icon">⚙</div><h2>Integraciones y control de costes</h2><p>' + esc(data.message || "Coste cero por defecto.") + '</p><div class="integration-status-list">' + rows + '</div><p class="integration-footnote">La activación se realiza únicamente en Cloudflare, después de revisar tarifas, cuotas y permisos. Este panel no activa servicios ni realiza compras.</p>';
    grid.prepend(card);
    if (!integrationFlags.googleDrive) {
      const driveStatus = $("#drive-status"), btnLink = $("#btn-link-drive"), btnSync = $("#btn-sync-drive");
      if (driveStatus) driveStatus.textContent = "Desactivado: no se realizarán llamadas a Google Drive.";
      if (btnLink) { btnLink.disabled = true; btnLink.title = "Integración desactivada en el servidor."; }
      if (btnSync) { btnSync.disabled = true; btnSync.title = "Integración desactivada en el servidor."; }
      localStorage.removeItem("drive_linked");
    }
  }
  // --- LISTENERS ---
  $$(".nav-item[data-view]").forEach(btn=>btn.addEventListener("click",()=>currentView(btn.dataset.view)));
  document.addEventListener("click", e => { const go = e.target.closest("[data-go]"); if (go) currentView(go.dataset.go); });
  $("#top-new").addEventListener("click",()=>currentView("builder"));
  $("#cloud-workspace-connect")?.addEventListener("click", connectCloudWorkspace);
  $("#mobile-menu").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
  $("#color-picker").addEventListener("input",e=>$("#color").value=e.target.value);
  $("#color").addEventListener("input",e=>{if(/^#[0-9a-f]{6}$/i.test(e.target.value))$("#color-picker").value=e.target.value;});
  
  const importBtn = $("#import-website");
  if(importBtn) importBtn.addEventListener("click", importWebsiteData);

  $("#project-form").addEventListener("submit",async e=>{
    e.preventDefault();
    const form=e.currentTarget;
    if(!form.reportValidity())return;
    const p=getFormData(form);
    if(!p.deliverables.length){notify("Selecciona al menos un entregable.");return;}
    const submitButton=form.querySelector('[type="submit"]');
    const originalButtonText=submitButton?.textContent||"Crear proyecto";
    if(submitButton){submitButton.disabled=true;submitButton.textContent="Preparando propuesta…";}
    let usedLocalFallback=false;
    try {
      const basePlan=makePlan(p);
      try {
        const response=await fetch("/api/generate-proposal",{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({project:p}),signal:AbortSignal.timeout(38000)
        });
        const generated=await response.json();
        if(response.ok&&generated?.ok&&generated.plan){
          p.plan={...basePlan,...generated.plan,seo:basePlan.seo,bot:basePlan.bot,aiAgent:basePlan.aiAgent,socialMedia:basePlan.socialMedia,qa:basePlan.qa,superPromptCode:basePlan.superPromptCode};
        } else {
          usedLocalFallback=true;p.plan=basePlan;
        }
      } catch (_) {
        usedLocalFallback=true;p.plan=basePlan;
      }
      projects.unshift(p);
      if(!saveProjects()){projects=projects.filter(x=>x.id!==p.id);return;}
      activeProjectId=p.id;
      localStorage.setItem(ACTIVE_PROJECT_KEY,p.id);
      latestWebsiteAudit=null;
      renderProjects();
      $("#dialog-title").textContent=p.name;
      $("#dialog-description").textContent=usedLocalFallback
        ? "Proyecto guardado. Se ha preparado una propuesta local que puedes editar."
        : "Proyecto guardado y propuesta inicial generada con DeepSeek para "+p.sector+".";
      const dialog=$("#project-dialog");
      if(typeof dialog.showModal==="function")dialog.showModal();
      else currentView("deliverables");
      form.reset();$("#color").value="#8B5CF6";$("#color-picker").value="#8B5CF6";
      if(usedLocalFallback)notify("Proyecto guardado; se usó la propuesta local como alternativa.");
    } finally {
      if(submitButton){submitButton.disabled=false;submitButton.textContent=originalButtonText;}
    }
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

  loadIntegrationStatus();
  renderProjects();
  restoreCloudWorkspaceSession();
})();
