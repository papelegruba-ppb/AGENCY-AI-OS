(() => {
  "use strict";
  const STORE_KEY = "agency-ai-os.projects.v1";
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  let projects = loadProjects();
  let activeProjectId = null;
  let toastTimer;
  let currentWebsiteAudit = null;

  function loadProjects() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
  }
  function saveProjects() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(projects)); return true; }
    catch (_) { notify("No se pudo guardar. Exporta los datos y libera espacio del navegador."); return false; }
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
      websiteAudit: currentWebsiteAudit,\n      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), status: "briefing"
    };
  }
  function makePlan(p) {
    const title = p.name;
    const audience = p.audience;
    const offer = p.offer;
    const goal = p.goal;
    const mainService = p.requirements || offer;
    const titleLine = `Una forma más clara de ${goal.toLowerCase().replace(/[.!?]+$/,"")}`;
    const copy = {
      brand: title,
      valueProposition: `${offer} Diseñado para ${audience.toLowerCase().replace(/[.!?]+$/,"")}.`,
      headline: titleLine,
      subheadline: `${offer} Una experiencia pensada para ${audience.toLowerCase().replace(/[.!?]+$/,"")}.`,
      primaryCTA: "Hablemos de tu proyecto",
      secondaryCTA: "Descubrir servicios",
      sections: [
        {name:"Hero",headline:titleLine,body:`${offer} Conoce una propuesta adaptada a tus objetivos.`,cta:"Hablemos de tu proyecto"},
        {name:"Servicios",headline:"Soluciones pensadas para avanzar",body:mainService,cta:"Ver soluciones"},
        {name:"Proceso",headline:"Claridad en cada etapa",body:"Entendemos el contexto, definimos prioridades, ejecutamos y revisamos contigo.",cta:"Conocer el proceso"},
        {name:"Preguntas frecuentes",headline:"Resolvemos tus dudas",body:"Explica aquí alcance, plazos, metodología y qué necesita aportar el cliente.",cta:"Consultar una duda"},
        {name:"Contacto",headline:"Cuéntanos qué necesitas",body:`El siguiente paso es entender el proyecto y valorar cómo ayudarte a conseguir: ${goal}`,cta:"Enviar solicitud"}
      ],
      disclaimers:["Los textos son un primer borrador generado a partir del briefing y deben revisarse antes de publicar.","No se han inventado testimonios, métricas ni resultados."]
    };
    const ux = {
      concept:`Dirección visual ${p.style}, con contraste editorial y un color de acento ${p.color}.`,
      palette:[{name:"Fondo",hex:"#111318"},{name:"Superficie",hex:"#191C23"},{name:"Texto",hex:"#F2F3F7"},{name:"Acento de marca",hex:p.color}],
      typography:["Manrope o equivalente para titulares con personalidad y buena legibilidad.","DM Sans o equivalente para texto funcional.","Jerarquía breve: H1 único, H2 por sección, párrafos cortos y CTA visibles."],
      layout:["Hero con propuesta concreta y CTA primario.","Servicios presentados en bloques diferenciados, sin repetir la misma tarjeta en todas las secciones.","Proceso en pasos claros.","Prueba de confianza solo con evidencias reales.","Formulario breve y CTA final."],
      responsive:"Diseño mobile-first; navegación sencilla; objetivos táctiles de al menos 44px; evitar desbordamiento horizontal."
    };
    const motion = {
      principle:"El movimiento guía la atención hacia el mensaje y el CTA; no debe ser requisito para acceder al contenido.",
      animations:[
        {element:"Hero headline",trigger:"Entrada inicial",effect:"Revelado breve por opacidad y desplazamiento vertical",duration:"450–650ms",easing:"cubic-bezier(.22,1,.36,1)",fallback:"Contenido visible sin animación"},
        {element:"Secciones",trigger:"IntersectionObserver al entrar en viewport",effect:"Fade-in + translateY sutil",duration:"350–500ms",easing:"ease-out",fallback:"Visible por defecto con prefers-reduced-motion"},
        {element:"CTA",trigger:"Hover/focus/active",effect:"Elevación 1–2px y cambio de contraste",duration:"160ms",easing:"ease-out",fallback:"Indicador de focus visible"},
        {element:"Formulario",trigger:"Error o envío",effect:"Mensaje de estado textual y foco al primer error",duration:"Sin animación obligatoria",easing:"N/A",fallback:"Mensajes accesibles con aria-live"}
      ],
      stack:"CSS transitions + IntersectionObserver nativo. Incorporar GSAP/ScrollTrigger solo si se necesita una secuencia de scroll compleja.",
      performance:["Animar principalmente opacity y transform.","No bloquear contenido esencial.","Respetar prefers-reduced-motion.","No depender de hover para funciones esenciales."]
    };
    const frontend = {stack:"HTML5, CSS3 y JavaScript sin framework para una landing estática exportable.",files:["index.html","styles.css","script.js"],requirements:["Componentes semánticos","Responsive mobile-first","CTA y enlaces funcionales","Validación de formulario en cliente","Animaciones discretas y accesibles"],note:"El formulario de la plantilla exportada necesita un endpoint real para guardar solicitudes. No simula persistencia en servidor."};
    const backend = {
      recommended:"Para una primera versión sin costes: Cloudflare Pages para estáticos; Cloudflare Pages Functions o Workers para endpoint; D1 si se necesita persistencia, sujeto a cuotas y términos vigentes.",
      endpoint:{method:"POST",path:"/api/leads",contentType:"application/json",fields:["name","email","phone (opcional)","service","message","consent"],responses:["201 Created","400 Validation error","429 Rate limited","500 Internal error"]},
      safeguards:["Validación en servidor","Límite de frecuencia y protección anti-spam","No registrar secretos ni datos innecesarios","Aviso de privacidad y consentimiento cuando corresponda"],
      status:"Diseño técnico propuesto; no hay endpoint ni base de datos conectados en este prototipo."
    };
    const seo = {
      title:`${title} | ${p.sector}`,
      description:`${offer} Descubre cómo ${title} puede ayudarte a ${goal.toLowerCase().replace(/[.!?]+$/,"")}.`,
      h1:titleLine,
      keywords:[p.sector,p.location ? `${p.sector} ${p.location}` : p.sector, ...mainService.split(/[,.]/).slice(0,2).map(s=>s.trim()).filter(Boolean)],
      openGraph:{type:"website",title:`${title} — ${p.sector}`,description:offer,url:p.domain || "PENDIENTE_DOMINIO"},
      checklist:["Confirmar dominio y URL canónica antes de publicar","Añadir textos alternativos descriptivos a imágenes reales","Comprobar robots.txt, sitemap.xml y canonical","Revisar Core Web Vitals con datos reales","Añadir datos estructurados solo con información verificada"]
    };
    const bot = {
      name:`Asistente de ${title}`,
      channel:"WhatsApp",
      status:p.phone ? "Enlace wa.me preparado; automatización no conectada." : "Número pendiente. El flujo se puede exportar, pero no se puede construir el enlace final sin número.",
      entry:{trigger:"Usuario pulsa CTA de WhatsApp",welcome:`¡Hola! Gracias por contactar con ${title}. ¿En qué podemos ayudarte?`,options:[{id:"services",label:"Quiero información sobre servicios"},{id:"quote",label:"Quiero pedir presupuesto"},{id:"other",label:"Tengo otra consulta"}]},
      branches:[
        {id:"services",message:"¿Qué servicio te interesa?",options:["Opción A: servicio principal","Opción B: servicio complementario","No lo tengo claro"],next:"ask_goal"},
        {id:"quote",message:"¡Perfecto! Para orientarte mejor, cuéntanos brevemente qué necesitas y cuál es tu plazo aproximado.",next:"qualify"},
        {id:"other",message:"Cuéntanos tu consulta en un mensaje y te orientaremos.",next:"human_handoff"},
        {id:"ask_goal",message:"¿Cuál es el objetivo principal que quieres conseguir?",next:"qualify"},
        {id:"qualify",message:"¿Cómo te llamas y cuál es la mejor forma de contactar contigo? Comparte solo los datos necesarios.",next:"human_handoff"},
        {id:"human_handoff",message:"Gracias. Hemos recogido el contexto inicial. Una persona del equipo deberá revisar tu consulta y continuar la conversación.",next:"human"}
      ],
      implementationNotes:["El JSON describe el flujo; no despliega por sí mismo un bot.","Para automatización se necesita WhatsApp Business Platform y un proveedor o integración configurada.","Respetar opt-in, plantillas y políticas aplicables.","No solicitar datos sensibles innecesarios."]
    };
    const qa = [
      {check:"Coherencia de marca",status:"Preparado para revisión",evidence:"Copy, UX y SEO comparten el briefing."},
      {check:"Responsive",status:"Pendiente de ejecutar",evidence:"Debe probarse en navegador real y varios tamaños."},
      {check:"Formulario",status:"No conectado",evidence:"Se ha diseñado el contrato de API; no existe persistencia activa."},
      {check:"WhatsApp",status:p.phone ? "Enlace posible" : "Número pendiente",evidence:"El bot automático no está conectado."},
      {check:"SEO",status:"Metadatos propuestos",evidence:"El posicionamiento no puede garantizarse desde el código."},
      {check:"Motion y accesibilidad",status:"Especificado",evidence:"Se requieren pruebas con teclado y movimiento reducido."}
    ];
    return {copy,ux,motion,frontend,backend,seo,bot,qa};
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
    const cards = [
      deliverableCard("Marketing & copy","01 · COPY","Propuesta de valor, titulares, CTA y secciones.",JSON.stringify(plan.copy,null,2),`${slugify(p.name)}-copy.json`),
      deliverableCard("Guía UX/UI","02 · DESIGN","Dirección visual, paleta, tipografía y responsive.",JSON.stringify(plan.ux,null,2),`${slugify(p.name)}-design.json`),
      deliverableCard("Motion UX","03 · MOTION","Animaciones, disparadores y reglas de accesibilidad.",JSON.stringify(plan.motion,null,2),`${slugify(p.name)}-motion.json`),
      deliverableCard("Frontend plan","04 · FRONTEND","Stack, archivos y requisitos de implementación.",JSON.stringify(plan.frontend,null,2),`${slugify(p.name)}-frontend.json`),
      deliverableCard("Backend plan","05 · BACKEND","Contrato de API y requisitos de seguridad.",JSON.stringify(plan.backend,null,2),`${slugify(p.name)}-backend.json`),
      deliverableCard("SEO","06 · SEO","Metadatos propuestos y lista de validación.",JSON.stringify(plan.seo,null,2),`${slugify(p.name)}-seo.json`),
      deliverableCard("WhatsApp bot","07 · BOT","Árbol conversacional exportable en JSON.",JSON.stringify(plan.bot,null,2),`${slugify(p.name)}-bot-flow.json`),
      deliverableCard("QA y estado","08 · QA","Distingue propuesta, implementación y pruebas pendientes.",JSON.stringify(plan.qa,null,2),`${slugify(p.name)}-qa.json`)
    ].join("");
    host.innerHTML = selector + `<div class="panel export-site-row"><div><strong>Agente 8 · Comparativa personalizada</strong><p class="body-copy">Genera una demo Antes/Después con el briefing, copy y paleta de este proyecto. Añade capturas y métricas con evidencia.</p></div><button class="button button-primary" id="open-agent8">Preparar comparativa ↗</button><button class="button button-secondary" id="export-landing">Exportar landing HTML ↧</button></div><div class="deliverable-grid">${cards}</div>`;
    $("#deliverable-select").addEventListener("change",e=>{activeProjectId=e.target.value;renderDeliverables();});
    $("#export-package").addEventListener("click",()=>exportProject(p.id));
    $("#export-landing").addEventListener("click",()=>exportSite(p));
    $("#open-agent8").addEventListener("click",()=>{window.location.href=`./agente-8.html?project=${encodeURIComponent(p.id)}`;});
    $$("[data-download]",host).forEach(btn=>btn.addEventListener("click",()=>{
      download(decodeURIComponent(btn.dataset.download),decodeURIComponent(btn.dataset.content),decodeURIComponent(btn.dataset.mime));
      notify("Descarga preparada.");
    }));
  }
  function exportProject(id) {
    const p = findProject(id); if (!p) return;
    const payload = {...p, plan:p.plan || makePlan(p), exportedAt:new Date().toISOString(), prototypeNotice:"Los entregables son borradores generados localmente; las integraciones externas no están conectadas."};
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
  function buildLandingHtml(p) {
    const plan = p.plan || makePlan(p);
    const c = plan.copy;
    const s = plan.seo;
    const color = p.color || "#8B5CF6";
    const phoneLink = p.phone ? `https://wa.me/${p.phone}?text=${encodeURIComponent("Hola, me gustaría recibir información sobre " + p.name + ".")}` : "#contacto";
    const sectionHtml = c.sections.map((sec,i)=>`<section class="section ${i%2?"section-alt":""}" id="${["inicio","servicios","proceso","preguntas","contacto"][i]}"><div class="container"><p class="kicker">0${i+1} / ${esc(sec.name)}</p><h2>${esc(sec.headline)}</h2><p class="section-copy">${esc(sec.body)}</p>${i===3?'<details><summary>¿Cómo empezamos?</summary><p>Cuéntanos tu objetivo y revisaremos el alcance del proyecto.</p></details><details><summary>¿Qué información necesitáis?</summary><p>Una descripción de tu negocio, tus necesidades y el resultado que buscas.</p></details>':""}${i===4?`<form class="lead-form" id="lead-form"><label>Nombre<input required name="name" autocomplete="name"></label><label>Email<input required type="email" name="email" autocomplete="email"></label><label>¿Qué necesitas?<textarea required name="message" rows="4"></textarea></label><label class="consent"><input required type="checkbox" name="consent"> He leído la política de privacidad.</label><button class="cta" type="submit">Enviar solicitud ↗</button><p class="form-note" id="form-note" role="status">Formulario de demostración: configura un endpoint para recibir solicitudes.</p></form>`:""}<a class="text-link" href="${i===4?phoneLink:"#contacto"}">${esc(sec.cta)} ↗</a></div></section>`).join("");
    return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(s.title)}</title><meta name="description" content="${esc(s.description)}"><meta property="og:type" content="website"><meta property="og:title" content="${esc(s.openGraph.title)}"><meta property="og:description" content="${esc(s.openGraph.description)}"><meta name="theme-color" content="${esc(color)}"><style>
:root{--accent:${color};--ink:#15151b;--muted:#666875;--paper:#f7f5f1;--line:#e5e0d8}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font-family:Inter,Arial,sans-serif}a{color:inherit}.nav{height:76px;padding:0 6vw;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line)}.brand{font-weight:800;letter-spacing:-.04em}.nav a{text-decoration:none;font-size:13px}.hero{min-height:74vh;display:flex;align-items:center;padding:90px 6vw;background:radial-gradient(ellipse at 80% 10%,${color}25,transparent 45%),var(--paper)}.container{max-width:1080px;margin:auto;width:100%}.hero .container{max-width:1080px}.kicker{text-transform:uppercase;letter-spacing:.16em;font-size:11px;color:var(--accent);font-weight:700}.hero h1{font-size:clamp(42px,7.5vw,88px);letter-spacing:-.075em;line-height:.98;max-width:900px;margin:25px 0}.hero p{max-width:620px;font-size:clamp(16px,2vw,20px);line-height:1.7;color:var(--muted)}.cta{display:inline-flex;background:var(--ink);color:white;border:0;border-radius:100px;padding:15px 22px;text-decoration:none;font-size:13px;font-weight:700;cursor:pointer;margin-top:15px}.section{padding:100px 6vw;border-top:1px solid var(--line)}.section-alt{background:#efede8}.section h2{font-size:clamp(32px,5vw,56px);line-height:1.05;letter-spacing:-.06em;max-width:750px;margin:15px 0}.section-copy{max-width:680px;color:var(--muted);font-size:17px;line-height:1.8}.text-link{display:inline-block;margin-top:22px;text-decoration:none;border-bottom:1px solid var(--accent);padding-bottom:5px;font-size:13px;font-weight:700}.lead-form{max-width:580px;display:grid;gap:14px;margin:30px 0}.lead-form label{display:grid;gap:6px;font-size:12px;font-weight:700}.lead-form input,.lead-form textarea{border:1px solid #d3cfc8;border-radius:8px;padding:12px;background:white;font:inherit}.lead-form .consent{display:flex;align-items:center;gap:8px;font-weight:400}.lead-form .consent input{width:auto}.form-note{font-size:12px;color:var(--muted)}details{border-bottom:1px solid var(--line);padding:18px 0;max-width:700px}summary{cursor:pointer;font-weight:700}footer{padding:35px 6vw;background:#15151b;color:#d8d8df;font-size:12px}footer .container{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap}@media(max-width:600px){.nav{padding:0 5vw;height:64px}.hero{padding:70px 6vw;min-height:68vh}.section{padding:70px 6vw}.hero h1{font-size:clamp(40px,13vw,64px)}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
</style></head><body><header class="nav"><a class="brand" href="#inicio">${esc(p.name)}</a><a href="#contacto">Hablemos ↗</a></header><main><section class="hero" id="inicio"><div class="container"><p class="kicker">${esc(p.sector)}</p><h1>${esc(c.headline)}</h1><p>${esc(c.subheadline)}</p><a class="cta" href="${phoneLink}">${esc(c.primaryCTA)} ↗</a></div></section>${sectionHtml}</main><footer><div class="container"><strong>${esc(p.name)}</strong><span>© <span id="year"></span> · Todos los derechos reservados</span></div></footer><script>
document.getElementById("year").textContent=new Date().getFullYear();
const form=document.getElementById("lead-form");if(form){form.addEventListener("submit",async e=>{e.preventDefault();const note=document.getElementById("form-note");note.textContent="Formulario validado en este navegador. Para recibir solicitudes, conecta un endpoint en el servidor.";note.setAttribute("aria-live","polite");});}
</script></body></html>`;
  }
  function exportSite(p) {
    const html = buildLandingHtml(p);
    download(`${slugify(p.name)}-landing.html`,html,"text/html;charset=utf-8");
    notify("HTML de demostración exportado. El formulario aún requiere backend.");
  }


  function setFieldValue(id, value) {
    const el = document.getElementById(id);
    if (el && value && !String(el.value || "").trim()) el.value = value;
  }
  function renderWebsiteAudit(audit) {
    const host = $("#website-scan-results");
    if (!host) return;
    const imgs = (audit.images || []).slice(0, 8);
    const pages = (audit.pages || []).slice(0, 12);
    const links = (audit.socialLinks || []).slice(0, 6);
    host.hidden = false;
    host.innerHTML = `
      <div class="scan-result-top"><div><span class="pill pill-green">ANÁLISIS COMPLETADO</span><h3>${esc(audit.businessName || audit.title || audit.url)}</h3><p>${esc(audit.description || "No se encontró una meta descripción; puedes revisar el contenido extraído.")}</p></div>${audit.logo ? `<img class="scan-logo" src="${esc(audit.logo)}" alt="Logotipo detectado" loading="lazy" referrerpolicy="no-referrer">` : ""}</div>
      <div class="scan-metrics"><span><b>${audit.pagesScanned || 1}</b> páginas revisadas</span><span><b>${(audit.images || []).length}</b> imágenes detectadas</span><span><b>${(audit.emails || []).length}</b> correos</span><span><b>${(audit.phones || []).length}</b> teléfonos</span></div>
      ${pages.length ? `<div class="scan-subsection"><strong>Páginas detectadas</strong><div class="scan-chips">${pages.map(p=>`<a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${esc(p.title || p.url)}</a>`).join("")}</div></div>` : ""}
      ${imgs.length ? `<div class="scan-subsection"><strong>Imágenes detectadas</strong><div class="scan-image-grid">${imgs.map(im=>`<a href="${esc(im.src)}" target="_blank" rel="noopener noreferrer" title="${esc(im.alt || "Abrir imagen")}"><img src="${esc(im.src)}" alt="${esc(im.alt || "Imagen extraída de la web")}" loading="lazy" referrerpolicy="no-referrer"></a>`).join("")}</div></div>` : ""}
      ${links.length ? `<div class="scan-subsection"><strong>Redes sociales</strong><div class="scan-chips">${links.map(l=>`<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.label)}</a>`).join("")}</div></div>` : ""}
      <p class="scan-footnote">Los datos son una extracción automática de páginas accesibles, no una auditoría exhaustiva. Las imágenes se muestran desde sus URL originales.</p>`;
  }
  async function analyzeWebsite() {
    const input = $("#website-url");
    const button = $("#analyze-website");
    const status = $("#website-scan-status");
    const results = $("#website-scan-results");
    const rawUrl = (input.value || "").trim();
    if (!rawUrl) { input.focus(); notify("Introduce la URL de la web que quieres analizar."); return; }
    let url;
    try { url = new URL(rawUrl); } catch (_) { notify("La URL no parece válida. Incluye https://"); return; }
    if (!["http:", "https:"].includes(url.protocol)) { notify("Solo se admiten URLs HTTP o HTTPS."); return; }
    button.disabled = true; button.textContent = "Analizando…"; status.textContent = "Leyendo páginas públicas, datos de marca e imágenes…"; results.hidden = true;
    try {
      const response = await fetch("/api/site-audit", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({url:url.href}) });
      const data = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(data.error || "No se pudo analizar esta web.");
      currentWebsiteAudit = data;
      setFieldValue("projectName", data.businessName || data.title || url.hostname.replace(/^www\./,""));
      setFieldValue("sector", data.sector || "Sector por confirmar");
      setFieldValue("offer", data.description || (data.headings || []).slice(0,4).join(". ") || "Oferta por revisar a partir de la web analizada.");
      setFieldValue("audience", "Audiencia por confirmar con el cliente; revisar la web original.");
      setFieldValue("goal", "Objetivo de conversión por confirmar con el cliente.");
      setFieldValue("domain", data.url || url.href);
      setFieldValue("phone", (data.phones || []).map(p=>p.replace(/\D/g,"")).find(Boolean) || "");
      if (data.colors && data.colors[0]) {
        const color = data.colors[0];
        if (/^#[0-9a-f]{6}$/i.test(color)) { $("#color").value=color; $("#color-picker").value=color; }
      }
      const requirements = [
        ...(data.services || []).map(s=>"Servicio detectado: "+s),
        ...(data.emails || []).map(e=>"Email detectado: "+e),
        ...(data.phones || []).map(p=>"Teléfono detectado: "+p),
        ...(data.addresses || []).map(a=>"Dirección detectada: "+a),
        ...(data.socialLinks || []).map(l=>l.label+": "+l.url)
      ];
      setFieldValue("requirements", requirements.join("\n"));
      renderWebsiteAudit(data);
      status.textContent = "Análisis listo. Hemos rellenado los campos que pudimos identificar; revisa y completa audiencia y objetivo antes de generar el proyecto.";
      notify("Web analizada. Revisa los datos antes de guardar el proyecto.");
    } catch (error) {
      status.textContent = error.message || "Error al analizar la web.";
      notify(status.textContent);
    } finally {
      button.disabled = false; button.textContent = "Analizar web ↗";
    }
  }
\n  $(".nav-item[data-view]").forEach(btn=>btn.addEventListener("click",()=>currentView(btn.dataset.view)));
  document.addEventListener("click", e => { const go = e.target.closest("[data-go]"); if (go) currentView(go.dataset.go); });
  $("#top-new").addEventListener("click",()=>currentView("builder"));
  $("#mobile-menu").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
  $("#color-picker").addEventListener("input",e=>$("#color").value=e.target.value);
  $("#color").addEventListener("input",e=>{if(/^#[0-9a-f]{6}$/i.test(e.target.value))$("#color-picker").value=e.target.value;});
  $("#analyze-website").addEventListener("click", analyzeWebsite);
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
    $("#dialog-description").textContent=`Briefing guardado. Se ha generado una primera propuesta de trabajo para ${p.sector}. Recuerda: son entregables iniciales basados en plantillas; no se ha llamado a ningún modelo de IA externo.`;
    const dialog=$("#project-dialog");
    if(typeof dialog.showModal==="function")dialog.showModal();
    else {currentView("deliverables");}
    form.reset();currentWebsiteAudit=null;$("#website-url").value="";$("#website-scan-status").textContent="";$("#website-scan-results").hidden=true;$("#color").value="#8B5CF6";$("#color-picker").value="#8B5CF6";
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
  renderProjects();
})();