import { runAiText, aiStatus } from "../_lib/ai-runtime.js";
import { ownerSession, jsonResponse } from "../_lib/owner-auth.js";

const clean = (value, max = 3000) => String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").trim().slice(0, max);

export async function onRequestPost({ request, env }) {
  if (!(await ownerSession(request, env))) return jsonResponse({ ok: false, error: "Inicia sesión en el workspace para utilizar el chat.", code: "OWNER_AUTH_REQUIRED" }, 401);
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ ok: false, error: "El cuerpo debe ser JSON válido." }, 400); }
  const message = clean(body?.message, 5000);
  if (!message) return jsonResponse({ ok: false, error: "Escribe un mensaje para continuar." }, 400);
  const status = aiStatus(env);
  const provider = clean(body?.provider || status.provider, 32).toLowerCase();
  const allowed = new Set(["deepseek", "openai", "gemini", "anthropic", "perplexity"]);
  if (!allowed.has(provider)) return jsonResponse({ ok: false, error: "Proveedor no admitido.", code: "AI_PROVIDER_UNSUPPORTED" }, 400);

  const history = Array.isArray(body?.history) ? body.history.slice(-10).map(item => ({
    role: item?.role === "assistant" ? "assistant" : "user",
    content: clean(item?.content, 2500)
  })).filter(item => item.content) : [];
  const project = body?.project && typeof body.project === "object" ? {
    name: clean(body.project.name, 90),
    sector: clean(body.project.sector, 120),
    offer: clean(body.project.offer, 600),
    audience: clean(body.project.audience, 350),
    goal: clean(body.project.goal, 350),
    domain: clean(body.project.domain, 180),
    requirements: clean(body.project.requirements, 700),
    status: clean(body.project.status, 40)
  } : null;

  const system = [
    "Eres el asistente integrado de Agency AI OS, una plataforma de agencia digital y automatización.",
    "Responde en español salvo que el usuario pida otro idioma. Sé preciso, práctico y experto.",
    "Ayuda con estrategia, marketing, UX/UI, desarrollo web, SEO, automatización, integraciones y operaciones de agencia.",
    "Usa el contexto del proyecto como información de trabajo, no inventes datos que no estén presentes.",
    "No afirmes haber ejecutado cambios, conectado cuentas o publicado servicios si no se ha confirmado mediante herramientas.",
    "Si una acción requiere una API, OAuth, credenciales o aprobación externa, explica el requisito y no solicites secretos en el chat.",
    project ? "PROYECTO ACTIVO:\\n" + JSON.stringify(project) : "No hay un proyecto activo seleccionado."
  ].join("\\n");
  const transcript = history.map(item => (item.role === "assistant" ? "ASISTENTE: " : "USUARIO: ") + item.content).join("\\n\\n");
  const input = (transcript ? "HISTORIAL RECIENTE:\\n" + transcript + "\\n\\n" : "") + "MENSAJE ACTUAL:\\n" + message;
  const result = await runAiText({ env, request, endpoint: "integrated-chat", provider, system, input, maxOutputTokens: 1400, temperature: 0.35 });
  if (!result.ok) return result.response;
  return jsonResponse({ ok: true, provider: result.provider, model: result.model, reply: result.text });
}
