import { TASK_CATALOG, buildFallbackPlan } from "./project-workflows-core.js";

const PROJECTS_KEY = "agency-ai-os.projects.v1";
const ACTIVE_KEY = "agency-ai-os.active-project-id.v1";
const WORKFLOWS_KEY = "agency-ai-os.project-workflows.v1";
const $ = (selector, root=document) => root.querySelector(selector);
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } };
let currentPlan = null;

function activeProject() {
  const id = localStorage.getItem(ACTIVE_KEY);
  return read(PROJECTS_KEY, []).find(project => String(project.id) === String(id)) || null;
}
function workflowStore() { return read(WORKFLOWS_KEY, {}); }
function saveWorkflow(item) {
  const project = activeProject();
  if (!project) { $("#pw-status").textContent = "Selecciona primero un proyecto activo."; return; }
  const store = workflowStore();
  const list = Array.isArray(store[project.id]) ? store[project.id] : [];
  list.unshift({ id: "task_" + Date.now(), createdAt: new Date().toISOString(), status: "planificado", ...item });
  store[project.id] = list.slice(0, 50);
  localStorage.setItem(WORKFLOWS_KEY, JSON.stringify(store));
  render();
}
function render() {
  const project = activeProject();
  const context = $("#pw-project");
  if (!context) return;
  context.textContent = project ? "Tareas y alternativas guardadas para: " + project.name : "Selecciona un proyecto en la barra superior para usar este espacio.";
  const list = project ? (workflowStore()[project.id] || []) : [];
  $("#pw-history").innerHTML = list.map(item => '<article class="pw-history-item"><div><strong>'+esc(item.task)+'</strong><small>'+esc(item.app)+' · '+esc(new Date(item.createdAt).toLocaleString())+'</small></div><span>'+esc(item.status)+'</span></article>').join("") || '<p class="pw-empty">Todavía no hay tareas guardadas en este proyecto.</p>';
}
function generate() {
  const project = activeProject();
  const task = $("#pw-task").value.trim();
  if (!project) { $("#pw-status").textContent = "Selecciona un proyecto activo antes de guardar tareas."; return; }
  try {
    currentPlan = buildFallbackPlan({ task, projectName: project.name, category: $("#pw-category").value || undefined });
    $("#pw-output").textContent = currentPlan.prompt;
    $("#pw-recommendation").innerHTML = '<strong>'+esc(currentPlan.app)+'</strong><p>'+esc(currentPlan.purpose)+'</p><p><b>Resultado:</b> '+esc(currentPlan.output)+'</p><p><b>Aplicación posterior:</b> '+esc(currentPlan.apply)+'</p><a href="'+esc(currentPlan.url)+'" target="_blank" rel="noopener">Abrir aplicación ↗</a>';
    $("#pw-copy").disabled = false;
    $("#pw-save").disabled = false;
    $("#pw-status").textContent = "Plan alternativo preparado. Comprueba el plan y los límites de la aplicación antes de usarla.";
  } catch (error) { $("#pw-status").textContent = error.message; }
}
$("#pw-generate")?.addEventListener("click", generate);
$("#pw-copy")?.addEventListener("click", async () => {
  if (!currentPlan) return;
  try { await navigator.clipboard.writeText(currentPlan.prompt); $("#pw-status").textContent = "Prompt copiado."; }
  catch { $("#pw-status").textContent = "No se pudo copiar automáticamente; selecciona el texto."; }
});
$("#pw-save")?.addEventListener("click", () => {
  if (!currentPlan) return;
  saveWorkflow({ ...currentPlan, prompt: currentPlan.prompt });
  $("#pw-status").textContent = "Plan guardado en el historial local de este proyecto.";
});
$("#active-project-select")?.addEventListener("change", render);
window.addEventListener("agency:active-project-change", render);
window.addEventListener("storage", event => { if ([ACTIVE_KEY, PROJECTS_KEY, WORKFLOWS_KEY].includes(event.key)) render(); });
render();
