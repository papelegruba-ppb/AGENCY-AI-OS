const MAX_HTML_CHARS = 1_200_000;
const MAX_PAGES = 7;
const TIMEOUT_MS = 12000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" }
  });
}
function validPublicUrl(value) {
  let u;
  try { u = new URL(value); } catch { return false; }
  if (!["http:", "https:"].includes(u.protocol) || u.username || u.password) return false;
  if (u.port && !["80", "443"].includes(u.port)) return false;
  const h = u.hostname.toLowerCase();
  if (!h || h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".test")) return false;
  if (h.startsWith("[") || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(h) || !h.includes(".") || h.includes("..")) return false;
  return true;
}
function decode(s = "") {
  return String(s)
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(0x10ffff, Number(n))))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(Math.min(0x10ffff, parseInt(n, 16))))
    .replace(/\s+/g, " ").trim();
}
function textOnly(html) {
  return decode(html.replace(/<(script|style|noscript|svg|template|iframe)[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<!--([\s\S]*?)-->/g, " ").replace(/<[^>]+>/g, " "));
}
function attr(tag, name) {
  const re = new RegExp("\\b" + name + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", "i");
  const m = tag.match(re);
  return decode(m ? (m[1] ?? m[2] ?? m[3] ?? "") : "");
}
function meta(html, key) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const k = (attr(tag, "property") || attr(tag, "name") || attr(tag, "itemprop")).toLowerCase();
    if (k === key.toLowerCase()) return attr(tag, "content");
  }
  return "";
}
function absoluteUrl(value, base) {
  try {
    const u = new URL(value, base);
    if (!["http:", "https:"].includes(u.protocol) || u.username || u.password) return "";
    u.hash = "";
    return u.href;
  } catch { return ""; }
}
async function fetchPublicPage(value) {
  let current = new URL(value);
  for (let redirects = 0; redirects <= 4; redirects++) {
    if (!validPublicUrl(current.href)) throw new Error("La URL o una redirección apunta a un destino no permitido.");
    const response = await fetch(current.href, {
      redirect: "manual",
      headers: { "accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1", "user-agent": "AgencyAIOS-SiteAudit/1.0 (public website metadata scanner)" },
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("La web devolvió una redirección incompleta.");
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) throw new Error("La web respondió con HTTP " + response.status + ".");
    const type = (response.headers.get("content-type") || "").toLowerCase();
    if (!type.includes("text/html") && !type.includes("application/xhtml+xml")) throw new Error("La URL no parece ser una página HTML pública.");
    const html = (await response.text()).slice(0, MAX_HTML_CHARS);
    return { html, url: current.href };
  }
  throw new Error("Demasiadas redirecciones.");
}
function extractPage(html, url) {
  const title = decode((html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [,""])[1]);
  const description = meta(html, "description") || meta(html, "og:description");
  const ogTitle = meta(html, "og:title");
  const ogImage = absoluteUrl(meta(html, "og:image") || meta(html, "twitter:image"), url);
  const logoCandidate = (html.match(/<link\b[^>]*(?:rel\s*=\s*["'][^"']*icon[^"']*["'][^>]*|href\s*=\s*["'][^"']*favicon[^"']*["'][^>]*)>/i) || [])[0];
  const logo = absoluteUrl(logoCandidate ? attr(logoCandidate, "href") : "/favicon.ico", url);
  const headings = [...html.matchAll(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]\s*>/gi)].map(m=>textOnly(m[1])).filter(Boolean).slice(0,30);
  const images = [];
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag=m[0], src=absoluteUrl(attr(tag,"src") || attr(tag,"data-src") || attr(tag,"data-lazy-src"),url);
    if (src && !images.some(x=>x.src===src)) images.push({src,alt:attr(tag,"alt").slice(0,180),title:attr(tag,"title").slice(0,180)});
    if(images.length>=60) break;
  }
  if (ogImage && !images.some(x=>x.src===ogImage)) images.unshift({src:ogImage,alt:"Open Graph image",title:"Social preview"});
  const links=[];
  for (const m of html.matchAll(/<a\b[^>]*>/gi)) {
    const href=attr(m[0],"href"), full=absoluteUrl(href,url);
    if(full) links.push({url:full,tag:m[0]});
  }
  const pageLinks=[];
  const base=new URL(url);
  for(const l of links){
    try { const u=new URL(l.url); if(u.origin===base.origin && !/\.(?:pdf|jpe?g|png|gif|webp|svg|zip|mp4|mp3|docx?|xlsx?|css|js)(?:$|\?)/i.test(u.pathname) && !/^(mailto:|tel:|javascript:)/i.test(l.tag) && !pageLinks.includes(u.href)) pageLinks.push(u.href); } catch {}
  }
  const emails=[...new Set([...html.matchAll(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g)].map(m=>m[0]).filter(x=>!x.match(/\.(?:png|jpg|webp|svg)$/i)))].slice(0,20);
  const phones=[...new Set([...html.matchAll(/(?:tel:)([^"'<>\s]+)/gi)].map(m=>decode(m[1]).replace(/[?#].*$/,"")))].slice(0,20);
  const socialLinks=[];
  const socialDomains=[["Instagram","instagram.com"],["Facebook","facebook.com"],["LinkedIn","linkedin.com"],["TikTok","tiktok.com"],["YouTube","youtube.com"],["X","x.com"],["Pinterest","pinterest.com"]];
  for(const l of links){for(const [label,domain] of socialDomains){try{if(new URL(l.url).hostname.toLowerCase().replace(/^www\./,"")===domain && !socialLinks.some(x=>x.url===l.url))socialLinks.push({label,url:l.url});}catch{}}}
  const colors=[...new Set([...html.matchAll(/#[0-9a-f]{6}\b/gi)].map(m=>m[0].toUpperCase()))].slice(0,12);
  const addresses=[...new Set([...html.matchAll(/<address\b[^>]*>([\s\S]*?)<\/address>/gi)].map(m=>textOnly(m[1])).filter(Boolean))].slice(0,8);
  const jsonLd=[];
  for(const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    try { const parsed=JSON.parse(m[1]); jsonLd.push(...(Array.isArray(parsed)?parsed:[parsed])); } catch {}
  }
  const org=jsonLd.flatMap(x=>x["@graph"]?[...x["@graph"]]:[x]).find(x=>/Organization|LocalBusiness|Corporation|ProfessionalService|Store|Restaurant|MedicalBusiness/i.test(String(x["@type"]||"")));
  const businessName=decode((org && (org.name || org.legalName)) || meta(html,"og:site_name") || ogTitle || title).split(/[|–—]/)[0].trim().slice(0,120);
  const orgEmail=org && org.email ? [String(org.email).replace(/^mailto:/i,"")] : [];
  const orgPhone=org && org.telephone ? [String(org.telephone)] : [];
  const orgAddress=org && org.address ? [typeof org.address==="string" ? org.address : [org.address.streetAddress,org.address.postalCode,org.address.addressLocality,org.address.addressRegion,org.address.addressCountry].filter(Boolean).join(", ")] : [];
  return {url,title:title||ogTitle,description:description.slice(0,1000),content:textOnly(html).slice(0,8000),businessName,headings,images,pageLinks,emails:[...new Set([...emails,...orgEmail])].slice(0,20),phones:[...new Set([...phones,...orgPhone])].slice(0,20),socialLinks:socialLinks.slice(0,20),colors,addresses:[...new Set([...addresses,...orgAddress])].slice(0,8),logo,ogImage,links:links.length};
}
export async function onRequestPost({ request }) {
  let body;
  try { body = await request.json(); } catch { return json({error:"El cuerpo de la petición debe ser JSON."},400); }
  const target = String(body?.url || "").trim();
  if(target.length>2048 || !validPublicUrl(target)) return json({error:"Introduce una URL HTTP/HTTPS pública válida. No se admiten direcciones locales, IP literales ni puertos no estándar."},400);
  try {
    const first=await fetchPublicPage(target);
    const origin=new URL(first.url).origin;
    const pages=[extractPage(first.html,first.url)];
    const visited=new Set([first.url]);
    const queue=pages[0].pageLinks.filter(u=>{try{return new URL(u).origin===origin;}catch{return false;}}).slice(0,MAX_PAGES-1);
    for(const next of queue){
      if(visited.has(next)||pages.length>=MAX_PAGES)continue;
      visited.add(next);
      try{
        const fetched=await fetchPublicPage(next);
        if(new URL(fetched.url).origin!==origin)continue;
        pages.push(extractPage(fetched.html,fetched.url));
      }catch{}
    }
    const firstPage=pages[0];
    const mergedImages=[];
    for(const p of pages)for(const im of p.images)if(!mergedImages.some(x=>x.src===im.src)){mergedImages.push(im);if(mergedImages.length>=100)break;}
    const mergedHeadings=[...new Set(pages.flatMap(p=>p.headings))].slice(0,60);
    const mergedEmails=[...new Set(pages.flatMap(p=>p.emails))].slice(0,30);
    const mergedPhones=[...new Set(pages.flatMap(p=>p.phones))].slice(0,30);
    const mergedSocial=[...new Map(pages.flatMap(p=>p.socialLinks).map(x=>[x.url,x])).values()].slice(0,30);
    const mergedColors=[...new Set(pages.flatMap(p=>p.colors))].slice(0,12);
    const mergedAddresses=[...new Set(pages.flatMap(p=>p.addresses))].slice(0,10);
    const allPages=pages.map(p=>({url:p.url,title:p.title||p.url,description:p.description,content:p.content,headings:p.headings}));
    const services=mergedHeadings.filter(h=>/servicio|soluci|producto|qué hacemos|que hacemos|especialidad|tratamiento|proyecto/i.test(h)).slice(0,15);
    return json({
      url:first.url,title:firstPage.title,businessName:firstPage.businessName,description:firstPage.description,
      logo:firstPage.logo,ogImage:firstPage.ogImage,headings:mergedHeadings,images:mergedImages,
      emails:mergedEmails,phones:mergedPhones,socialLinks:mergedSocial,colors:mergedColors,addresses:mergedAddresses,
      pages:allPages,pagesScanned:pages.length,services,linksDiscovered:pages.reduce((n,p)=>n+p.links,0),
      notes:["Extracción de HTML público; no ejecuta JavaScript del sitio.","No accede a páginas privadas, cuentas ni contenido detrás de un inicio de sesión.","La audiencia, el objetivo comercial y los datos no publicados requieren validación humana."]
    });
  } catch(error) {
    return json({error:error?.name==="TimeoutError"?"La web tardó demasiado en responder. Inténtalo de nuevo.":(error?.message||"No se pudo analizar la web.")},502);
  }
}
