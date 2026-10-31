import { runAiText } from "../_lib/ai-runtime.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

function text(value, max = 500) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function normalizePlan(raw, project, provider = "ai") {
  if (!raw || typeof raw !== "object") throw new Error("La IA no devolvió un objeto válido.");
  const fallbackHeadline = "Una forma más clara de " + text(project.goal, 120).replace(/[.!?]+$/g, "").toLowerCase();
  const sourceCopy = raw.copy && typeof raw.copy === "object" ? raw.copy : {};
  const sections = Array.isArray(sourceCopy.sections) ? sourceCopy.sections.slice(0, 8).map((section, i) => ({
    name: text(section?.name, 50) || ["Hero", "Servicios", "Proceso", "Contacto"][i] || ("Sección " + (i + 1)),
    headline: text(section?.headline, 120) || fallbackHeadline,
    body: text(section?.body, 600) || text(project.offer, 300),
    cta: text(section?.cta, 60) || "Conocer más"
  })) : [];
  const copy = {
    brand: text(project.name, 90),
    valueProposition: text(sourceCopy.valueProposition, 300) || text(project.offer, 300),
    headline: text(sourceCopy.headline, 120) || fallbackHeadline,
    subheadline: text(sourceCopy.subheadline, 350) || text(project.offer, 300),
    primaryCTA: text(sourceCopy.primaryCTA, 50) || "Hablemos de tu proyecto",
    sections: sections.length ? sections : [
      { name: "Servicios", headline: "Soluciones pensadas para avanzar", body: text(project.requirements || project.offer, 500), cta: "Ver soluciones" },
      { name: "Contacto", headline: "Cuéntanos qué necesitas", body: "El siguiente paso es entender tu objetivo y valorar cómo ayudarte.", cta: "Contactar" }
    ]
  };
  const sourceUx = raw.ux && typeof raw.ux === "object" ? raw.ux : {};
  const palette = Array.isArray(sourceUx.palette) ? sourceUx.palette.slice(0, 6).map((item, i) => ({
    name: text(item?.name, 30) || "Color " + (i + 1),
    hex: /^#[0-9a-f]{6}$/i.test(item?.hex || "") ? item.hex : (i === 0 ? "#F5F5F9" : i === 1 ? "#FFFFFF" : i === 2 ? "#17151D" : project.color)
  })) : [
    { name: "Fondo", hex: "#F5F5F9" },
    { name: "Superficie", hex: "#FFFFFF" },
    { name: "Texto", hex: "#17151D" },
    { name: "Acento", hex: project.color }
  ];
  return {
    copy,
    ux: {
      concept: text(sourceUx.concept, 350) || "Dirección visual " + text(project.style, 80) + ".",
      palette,
      typography: Array.isArray(sourceUx.typography) ? sourceUx.typography.slice(0, 5).map(x => text(x, 160)) : ["Jerarquía tipográfica clara", "Texto legible y accesible"],
      layout: Array.isArray(sourceUx.layout) ? sourceUx.layout.slice(0, 8).map(x => text(x, 160)) : ["Hero con propuesta y CTA", "Servicios", "Contacto"]
    },
    generatedBy: provider,
    generatedAt: new Date().toISOString()
  };
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: "El cuerpo debe ser JSON válido.", code: "INVALID_JSON" }, 400); }

  const project = body?.project;
  if (!project || typeof project !== "object") return json({ ok: false, error: "Faltan los datos del proyecto.", code: "PROJECT_REQUIRED" }, 400);
  const name = text(project.name, 90);
  const sector = text(project.sector, 120);
  const offer = text(project.offer, 1200);
  const audience = text(project.audience, 500);
  const goal = text(project.goal, 500);
  const color = /^#[0-9a-f]{6}$/i.test(project.color || "") ? project.color : "#8B5CF6";
  if (!name || !sector || !offer || !audience || !goal) {
    return json({ ok: false, error: "Completa nombre, sector, oferta, público y objetivo antes de generar la propuesta.", code: "PROJECT_FIELDS_REQUIRED" }, 400);
  }

  const system = [
    "Eres estratega de marketing y diseñador UX/UI senior para negocios reales en España.",
    "Responde exclusivamente con un objeto JSON válido, sin markdown ni HTML.",
    "No inventes cifras, certificaciones, reseñas, clientes ni resultados.",
    "Usa el rastreo y PageSpeed del briefing como evidencia; distingue datos medidos, comprobaciones HTML y elementos pendientes. No llames Lighthouse a puntuaciones heurísticas.",
    "Todo el contenido de cara al cliente debe estar en español natural, específico y no genérico.",
    "El copy debe explicar la oferta, hablar al público objetivo y proponer CTA concretas.",
    "Devuelve este esquema: {copy:{valueProposition:string,headline:string,subheadline:string,primaryCTA:string,sections:[{name:string,headline:string,body:string,cta:string}]},ux:{concept:string,palette:[{name:string,hex:string}],typography:string[],layout:string[]}}.",
    "Incluye de 3 a 6 secciones relevantes. Usa una paleta accesible con el color de marca como acento y fondo claro."
  ].join(" ");

  const user = {
    negocio: name, sector, oferta: offer, publico_objetivo: audience, objetivo: goal,
    ubicacion: text(project.location, 160), estilo_visual: text(project.style, 100),
    color_marca: color, secciones_requeridas: text(project.requirements, 1000),
    dominio_actual: text(project.domain, 300),
    auditoria_web: project.websiteAudit && typeof project.websiteAudit === "object" ? {
      title: text(project.websiteAudit.title, 160),
      description: text(project.websiteAudit.description, 320),
      h1: Array.isArray(project.websiteAudit.h1) ? project.websiteAudit.h1.slice(0, 5).map(x => text(x, 120)) : [],
      h2: Array.isArray(project.websiteAudit.h2) ? project.websiteAudit.h2.slice(0, 10).map(x => text(x, 120)) : [],
      score: Number.isFinite(project.websiteAudit.score) ? project.websiteAudit.score : null,
      findings: Array.isArray(project.websiteAudit.findings) ? project.websiteAudit.findings.slice(0, 30).map(x => ({
        url: text(x?.url, 300), category: text(x?.category, 60), severity: text(x?.severity, 20), message: text(x?.message ?? x, 240)
      })) : [],
      crawl: project.websiteAudit.crawl && typeof project.websiteAudit.crawl === "object" ? {
        pagesAnalyzed: Number(project.websiteAudit.crawl.pagesAnalyzed) || 0,
        urlsDiscovered: Number(project.websiteAudit.crawl.urlsDiscovered) || 0,
        complete: Boolean(project.websiteAudit.crawl.complete),
        robotsStatus: text(project.websiteAudit.crawl.robotsStatus, 40)
      } : null,
      pageSpeed: project.websiteAudit.pageSpeed && typeof project.websiteAudit.pageSpeed === "object" ? Object.fromEntries(["mobile", "desktop"].map(device => {
        const result = project.websiteAudit.pageSpeed[device];
        return [device, result?.available ? {
          scores: result.scores || {},
          metrics: result.metrics || {}
        } : { available: false }];
      })) : null,
      links: project.websiteAudit.links && typeof project.websiteAudit.links === "object" ? {
        total: Number(project.websiteAudit.links.total) || 0,
        internal: Number(project.websiteAudit.links.internal) || 0,
        outbound: Number(project.websiteAudit.links.outbound) || 0
      } : null,
      images: project.websiteAudit.images && typeof project.websiteAudit.images === "object" ? {
        total: Number(project.websiteAudit.images.total) || 0,
        missingAlt: Number(project.websiteAudit.images.missingAlt) || 0
      } : null,
      pages: Array.isArray(project.websiteAudit.pages) ? project.websiteAudit.pages.slice(0, 20).map(page => ({
        url: text(page?.url, 300), title: text(page?.title, 160), description: text(page?.description, 300),
        canonical: text(page?.canonical, 300), h1: Array.isArray(page?.h1) ? page.h1.slice(0, 3).map(x => text(x, 120)) : [],
        h2: Array.isArray(page?.h2) ? page.h2.slice(0, 8).map(x => text(x, 120)) : [],
        forms: Array.isArray(page?.forms) ? page.forms.slice(0, 5) : []
      })) : []
    } : null
  };

  const ai = await runAiText({
    env, request, endpoint: "/api/generate-proposal", system,
    input: JSON.stringify(user), maxOutputTokens: 1600, jsonMode: true, temperature: 0.65
  });
  if (!ai.ok) return json({ ok: false, error: "La IA no está disponible; se usará el generador local.", code: ai.response.status === 429 ? "AI_RATE_LIMITED" : "AI_UNAVAILABLE" }, ai.response.status);
  try {
    const parsed = JSON.parse(ai.text);
    return json({ ok: true, plan: normalizePlan(parsed, { ...project, name, sector, offer, audience, goal, color }, ai.provider), provider: ai.provider });
  } catch (error) {
    console.error(JSON.stringify({ event: "ai_proposal_invalid_response", provider: ai.provider }));
    return json({ ok: false, error: "No se pudo validar la respuesta de IA. Se usará el generador local.", code: "AI_INVALID_RESPONSE" }, 502);
  }
}