const MAX_HTML_BYTES = 2_000_000;
const USER_AGENT = "Mozilla/5.0 (compatible; AgencyAIOS/1.0; +https://github.com/papelegruba-ppb/AGENCY-AI-OS)";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" }
  });
}
function validPublicUrl(value) {
  let u;
  try { u = new URL(value); } catch { return null; }
  if (!["http:", "https:"].includes(u.protocol) || u.username || u.password) return null;
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!h || h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".test")) return null;
  if (!h.includes(".") || h.includes("..")) return null;
  if (h === "::1" || h === "0.0.0.0" || h === "127.0.0.1" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80:")) return null;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(h)) {
    const a = h.split(".").map(Number);
    if (a.some(n => n > 255) || a[0] === 10 || a[0] === 127 || a[0] === 0 || a[0] === 169 && a[1] === 254 || a[0] === 192 && a[1] === 168 || a[0] === 172 && a[1] >= 16 && a[1] <= 31 || a[0] >= 224) return null;
    return u;
  }
  if (h.includes(":")) return null;
  return u;
}
function decode(s) { return String(s || "").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16))).replace(/\s+/g, " ").trim(); }
function textOf(s) { return decode(String(s || "").replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, " ").replace(/<[^>]*>/g, " ")); }
function attr(tag, name) { const re = new RegExp("(?:^|\\s)" + name + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", "i"); const m = tag.match(re); return decode(m ? (m[1] ?? m[2] ?? m[3] ?? "") : ""); }
function esc(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c])); }

export async function onRequestPost({ request }) {
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "El cuerpo de la petición debe ser JSON válido.", code: "INVALID_JSON" }, 400); }
  const raw = String(body?.url || "").trim();
  if (!raw || raw.length > 2048 || !validPublicUrl(raw)) return json({ ok: false, error: "Introduce una URL HTTP/HTTPS pública válida. No se admiten direcciones locales ni IP privadas.", code: "INVALID_URL" }, 400);
  try {
    let target = validPublicUrl(raw);
    let response;
    for (let redirects = 0; redirects <= 3; redirects++) {
      response = await fetch(target.toString(), { redirect: "manual", headers: { "User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml" }, signal: AbortSignal.timeout(15000) });
      if ([301,302,303,307,308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location || redirects === 3) return json({ ok: false, error: "La web redirige demasiadas veces o a un destino no permitido.", code: "REDIRECT_LIMIT" }, 502);
        const next = validPublicUrl(new URL(location, target).toString());
        if (!next) return json({ ok: false, error: "La web redirige a una dirección no permitida.", code: "UNSAFE_REDIRECT" }, 400);
        target = next;
        continue;
      }
      break;
    }
    if (!response?.ok) return json({ ok: false, error: "La web respondió con HTTP " + (response?.status || "desconocido") + ".", code: "UPSTREAM_HTTP_ERROR" }, 502);
    const contentType = response.headers.get("content-type") || "";
    if (contentType && !/text\/html|application\/xhtml\+xml/i.test(contentType)) return json({ ok: false, error: "La URL no devuelve un documento HTML.", code: "NOT_HTML" }, 415);
    const reader = response.body?.getReader();
    if (!reader) return json({ ok: false, error: "No se pudo leer el HTML de la web.", code: "EMPTY_BODY" }, 502);
    const chunks = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_HTML_BYTES) { await reader.cancel(); return json({ ok: false, error: "La página supera el límite de análisis de 2 MB.", code: "HTML_TOO_LARGE" }, 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const html = new TextDecoder("utf-8").decode(bytes);
    const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i);
    const title = titleMatch ? textOf(titleMatch[1]) : "";
    const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map(m => m[0]);
    const descriptionTag = metas.find(t => attr(t, "name").toLowerCase() === "description");
    const ogTag = metas.find(t => attr(t, "property").toLowerCase() === "og:description");
    const themeTag = metas.find(t => attr(t, "name").toLowerCase() === "theme-color");
    const themeColorRaw = themeTag ? attr(themeTag, "content") : "";
    const preferredCssColor = html.match(/--(?:brand|primary|accent|color-primary)[\\w-]*\\s*:\\s*(#[0-9a-f]{3,8})/i)?.[1]
      || html.match(/(?:background-color|background|color)\\s*:\\s*(#[0-9a-f]{6})/i)?.[1]
      || "";
    const themeColor = /^#[0-9a-f]{6}$/i.test(themeColorRaw) ? themeColorRaw
      : /^#[0-9a-f]{6}$/i.test(preferredCssColor) ? preferredCssColor : "";
    const description = descriptionTag ? attr(descriptionTag, "content") : ogTag ? attr(ogTag, "content") : "";
    const h1 = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/gi)].map(m => textOf(m[1])).filter(Boolean);
    const h2 = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2\s*>/gi)].map(m => textOf(m[1])).filter(Boolean);
    const images = [...html.matchAll(/<img\b[^>]*>/gi)].map(m => ({ src: attr(m[0], "src"), alt: attr(m[0], "alt"), hasAlt: /(?:^|\s)alt\s*=/i.test(m[0]) }));
    const missingAlt = images.filter(i => !i.hasAlt || !i.alt.trim()).map(i => ({ src: i.src, alt: i.alt }));
    const links = [];
    for (const m of html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a\s*>/gi)) {
      const tag = m[0].slice(0, m[0].indexOf(">") + 1), href = attr(tag, "href");
      if (!href || /^(?:javascript:|mailto:|tel:|data:|#)/i.test(href)) continue;
      try {
        const resolved = new URL(href, target);
        if (!["http:", "https:"].includes(resolved.protocol)) continue;
        links.push({ url: resolved.href, text: textOf(m[1]), type: resolved.hostname === target.hostname ? "internal" : "outbound" });
      } catch {}
    }
    const internalLinks = links.filter(l => l.type === "internal");
    const outboundLinks = links.filter(l => l.type === "outbound");
    const cleanText = textOf(html).toLowerCase();
    const sectors = [];
    if (/fiscal|impuesto|hacienda|tributario/.test(cleanText)) sectors.push("Asesoría Fiscal");
    if (/laboral|trabajo|nómina|contrato/.test(cleanText)) sectors.push("Asesoría Laboral");
    if (/gestoría|gestión|contable|contabilidad/.test(cleanText)) sectors.push("Gestoría y Contabilidad");
    if (/abogado|jurídico|legal|ley/.test(cleanText)) sectors.push("Servicios Legales");
    if (/diseño|web|marketing|publicidad/.test(cleanText)) sectors.push("Marketing y Diseño");
    if (/clínica|salud|médico|paciente/.test(cleanText)) sectors.push("Salud y Bienestar");
    if (/inmobiliaria|pisos|alquiler|vivienda/.test(cleanText)) sectors.push("Inmobiliaria");
    if (/restaurante|comida|café|menú/.test(cleanText)) sectors.push("Hostelería");
    if (/construcción|reforma|arquitecto|obra/.test(cleanText)) sectors.push("Construcción y Reformas");
    const audiences = [];
    if (/autónomo|autonomos/.test(cleanText)) audiences.push("Autónomos");
    if (/pyme|pymes|pequeña empresa/.test(cleanText)) audiences.push("PYMES");
    if (/gran empresa|grandes empresas|corporativo/.test(cleanText)) audiences.push("Grandes Empresas");
    if (/particular|familias|personas/.test(cleanText)) audiences.push("Particulares");
    if (/emprendedor|startup/.test(cleanText)) audiences.push("Emprendedores");
    if (/inversor|inversores|no residente/.test(cleanText)) audiences.push("Inversores / No residentes");
    let goal = /presupuesto|llámanos|contacto/.test(cleanText) ? "Captar solicitudes de presupuesto" : /reserva|cita/.test(cleanText) ? "Conseguir reservas y citas" : /carrito|comprar|tienda online/.test(cleanText) ? "Vender productos online" : /suscripción|newsletter/.test(cleanText) ? "Captar suscriptores" : "Generar contactos comerciales";
    const services = [...new Set([...h2, ...[...html.matchAll(/<nav\b[^>]*>([\s\S]*?)<\/nav\s*>/gi)].flatMap(n => [...n[1].matchAll(/<a\b[^>]*>([\s\S]*?)<\/a\s*>/gi)].map(a => textOf(a[1]))).filter(s => s.length > 2 && s.length < 45 && !/inicio|home|contacto|blog|aviso|privacidad/i.test(s))])].slice(0, 8);
    const findings = [];
    if (!title) findings.push("La página no tiene etiqueta <title>.");
    else if (title.length < 30 || title.length > 60) findings.push("El título tiene " + title.length + " caracteres; como referencia, suele recomendarse aproximadamente 30–60.");
    if (!description) findings.push("Falta la meta descripción.");
    else if (description.length < 70 || description.length > 160) findings.push("La meta descripción tiene " + description.length + " caracteres; revisa su longitud (referencia aproximada: 70–160).");
    if (h1.length === 0) findings.push("No se ha encontrado ningún H1.");
    if (h1.length > 1) findings.push("Se han encontrado " + h1.length + " H1; revisa la jerarquía principal.");
    if (missingAlt.length) findings.push("Hay " + missingAlt.length + " imágenes sin ALT o con ALT vacío.");
    if (!internalLinks.length) findings.push("No se han encontrado enlaces internos rastreables.");
    const checks = [
      Boolean(title), Boolean(description), h1.length === 1, missingAlt.length === 0,
      h2.length > 0, internalLinks.length > 0, Boolean(/<html\b[^>]*lang\s*=/i.test(html)),
      Boolean(metas.some(t => attr(t, "name").toLowerCase() === "viewport"))
    ];
    const score = Math.round(checks.filter(Boolean).length / checks.length * 100);
    const projectName = title.split(/[|–—-]/)[0].trim() || target.hostname;
    const result = {
      ok: true, url: target.href, fetchedAt: new Date().toISOString(), httpStatus: response.status,
      title, titleLength: title.length, description, descriptionLength: description.length, themeColor,
      h1, h2, images: { total: images.length, missingAlt: missingAlt.length, details: missingAlt.slice(0, 100) },
      links: { total: links.length, internal: internalLinks.length, outbound: outboundLinks.length, internalDetails: internalLinks.slice(0, 100), outboundDetails: outboundLinks.slice(0, 100) },
      checks: { title: Boolean(title), description: Boolean(description), singleH1: h1.length === 1, imageAlt: missingAlt.length === 0, h2: h2.length > 0, internalLinks: internalLinks.length > 0, htmlLang: /<html\b[^>]*lang\s*=/i.test(html), viewport: metas.some(t => attr(t, "name").toLowerCase() === "viewport") },
      score, findings,
      // Backwards-compatible fields used by the commercial proposal generator.
      projectName, sector: sectors.join(", ") || "Servicios profesionales",
      offer: description || "Completa con la propuesta de valor de la empresa.",
      audience: audiences.join(", ") || "Público general", goal, requirements: services.join("\n"),
      analysis: findings.length ? findings.map((f, i) => (i + 1) + ". " + f).join("\n") : "No se han detectado problemas en las comprobaciones SEO básicas.",
      summary: "Auditoría básica de " + target.hostname + ": " + score + "/100 en " + checks.length + " comprobaciones técnicas."
    };
    return json(result);
  } catch (e) {
    const timeout = e?.name === "TimeoutError";
    console.error(JSON.stringify({ event: "site_audit_failure", code: timeout ? "UPSTREAM_TIMEOUT" : "FETCH_FAILED", errorName: e?.name || "Error" }));
    return json({ ok: false, error: timeout ? "La web tardó demasiado en responder. Inténtalo de nuevo." : "No se pudo descargar o analizar la web. Comprueba que sea pública y accesible.", code: timeout ? "UPSTREAM_TIMEOUT" : "FETCH_FAILED" }, 502);
  }
}
