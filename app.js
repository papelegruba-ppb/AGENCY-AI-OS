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
      saveHistory(); // Guarda versión para el historial de 7 días
      syncToDrive(); // Autoguardado en Drive
      return true; 
    }
    catch (_) { notify("No se pudo guardar. Exporta los datos y libera espacio del navegador."); return false; }
  }

  function saveHistory() {
    try {
      let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      history.unshift({ date: Date.now(), data: JSON.stringify(projects) });
      // Limpiar versiones con más de 7 días
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      history = history.filter(h => h.date > sevenDaysAgo);
      // Guardar máximo 50 versiones
      if (history.length > 50) history = history.slice(0, 50);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (_) {}
  }

  function syncToDrive() {
    if (!window.location.search.includes("drive=success") && !localStorage.getItem("drive_linked")) return;
    localStorage.setItem("drive_linked", "true");
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
  
  // ... (AQUÍ CONTINÚA TU CÓDIGO ORIGINAL DE getFormData, makePlan, renderProjects, etc.)
  // Para no hacer el archivo infinito, asegúrate de mantener el resto de funciones que ya tenías
  // desde getFormData() hasta el final del archivo original, PERO 
  // sustituye el addEventListener de #clear-data por esto:

  $("#clear-data").addEventListener("click",()=>{
    if(!projects.length){notify("No hay proyectos que borrar.");return;}
    if(!confirm("Esto eliminará todos los proyectos guardados en este navegador. ¿Continuar?"))return;
    projects=[]; activeProjectId=null; saveProjects(); renderProjects(); renderDeliverables(); notify("Datos locales eliminados.");
  });

  // --- LÓGICA DE GOOGLE DRIVE (BOTONES) ---
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
    btnLink.addEventListener("click", () => {
      window.location.href = "/api/drive-auth";
    });
  }

  if (btnSync) {
    btnSync.addEventListener("click", async () => {
      btnSync.disabled = true;
      btnSync.textContent = "Sincronizando...";
      if(driveStatus) driveStatus.textContent = "Subiendo datos a tu Google Drive...";
      
      try {
        const payload = { projects, exportDate: new Date().toISOString() };
        const res = await fetch("/api/drive-save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        
        if (!res.ok) throw new Error("Fallo en el servidor");
        
        if(driveStatus) driveStatus.textContent = "✅ Copia guardada en Drive a las " + new Date().toLocaleTimeString();
      } catch (e) {
        if(driveStatus) driveStatus.textContent = "❌ Error al sincronizar. ¿Has vinculado tu cuenta?";
      } finally {
        btnSync.disabled = false;
        btnSync.textContent = "Sincronizar ahora";
      }
    });
  }
})();
