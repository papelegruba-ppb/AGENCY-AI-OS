const MAX_HTML_BYTES = 1500000;
const DEFAULT_MAX_PAGES = 20;
const USER_AGENT = "Mozilla/5.0 (compatible; AgencyAIOS/1.0; +https://github.com/papelegruba-ppb/AGENCY-AI-OS)";
const BLOCKED_EXT = /\.(?:pdf|zip|png|jpe?g|gif|webp|svg|ico|mp4|mp3|woff2?|ttf|css|js|xml|json|docx?|xlsx?)$/i;

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});}
function validPublicUrl(value){
  let u;try{u=new URL(value);}catch{return null;}
  if(!["http:","https:"].includes(u.protocol)||u.username||u.password)return null;
  const h=u.hostname.toLowerCase().replace(/^\[|\]$/g,"");
  if(!h||h==="localhost"||h.endsWith(".localhost")||h.endsWith(".local")||h.endsWith(".internal")||h.endsWith(".test")||h.includes(":"))return null;
  if(!h.includes(".")||h.includes("..")||/^\d{1,3}(?:\.\d{1,3}){3}$/.test(h))return null;
  return u;
}
function decode(s){return String(s||"").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCharCode(parseInt(n,16))).replace(/\s+/g," ").trim();}
function textOf(s){return decode(String(s||"").replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi," ").replace(/<[^>]*>/g," "));}
function attr(tag,name){const m=tag.match(new RegExp("(?:^|\\s)"+name+"\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))","i"));return decode(m?(m[1]??m[2]??m[3]??""):"");}
function tags(html,name){return [...html.matchAll(new RegExp("<"+name+"\\b[^>]*>","gi"))].map(m=>m[0]);}
function sameOriginUrl(value,base,origin){
  try{const u=new URL(value,base);if(u.origin!==origin||!["http:","https:"].includes(u.protocol))return null;u.hash="";if(BLOCKED_EXT.test(u.pathname))return null;return u;}catch{return null;}
}
async function fetchLimited(url,expectedOrigin){
  let target=validPublicUrl(url);if(!target||target.origin!==expectedOrigin)throw new Error("UNSAFE_URL");
  let response;
  for(let i=0;i<=3;i++){
    response=await fetch(target.href,{redirect:"manual",headers:{"User-Agent":USER_AGENT,"Accept":"text/html,application/xhtml+xml"},signal:AbortSignal.timeout(10000)});
    if([301,302,303,307,308].includes(response.status)){
      const loc=response.headers.get("location");if(!loc||i===3)throw new Error("REDIRECT_LIMIT");
      target=validPublicUrl(new URL(loc,target).href);if(!target||target.origin!==expectedOrigin)throw new Error("UNSAFE_REDIRECT");continue;
    }break;
  }
  if(!response?.ok)throw new Error("HTTP_"+(response?.status||0));
  const type=response.headers.get("content-type")||"";if(type&&!/text\/html|application\/xhtml\+xml/i.test(type))throw new Error("NOT_HTML");
  const reader=response.body?.getReader();if(!reader)throw new Error("EMPTY_BODY");
  const chunks=[];let size=0;
  while(true){const{done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_HTML_BYTES){await reader.cancel();throw new Error("HTML_TOO_LARGE");}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  return{url:target.href,status:response.status,html:new TextDecoder("utf-8").decode(bytes)};
}
function parsePage(html,url,status){
  const titleMatch=html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i),metas=tags(html,"meta"),links=tags(html,"link");
  const meta=name=>metas.find(t=>attr(t,"name").toLowerCase()===name.toLowerCase());
  const property=name=>metas.find(t=>attr(t,"property").toLowerCase()===name.toLowerCase());
  const headings={};for(let n=1;n<=6;n++)headings["h"+n]=[...html.matchAll(new RegExp("<h"+n+"\\b[^>]*>([\\s\\S]*?)<\\/h"+n+"\\s*>","gi"))].map(m=>textOf(m[1])).filter(Boolean);
  const images=tags(html,"img").map(t=>({src:attr(t,"src")||attr(t,"data-src"),alt:attr(t,"alt"),hasAlt:/\balt\s*=/i.test(t)}));
  const pageLinks=[];
  for(const m of html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a\s*>/gi)){
    const tag=m[0].slice(0,m[0].indexOf(">")+1),href=attr(tag,"href");if(!href||/^(?:javascript:|mailto:|tel:|data:|#)/i.test(href))continue;
    try{const u=new URL(href,url);if(["http:","https:"].includes(u.protocol))pageLinks.push({url:u.href,text:textOf(m[1])});}catch{}
  }
  const canonicalTag=links.find(t=>attr(t,"rel").toLowerCase().split(/\s+/).includes("canonical"));
  const forms=[...html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form\s*>/gi)].map(m=>({action:attr("<form "+m[1]+">","action"),method:attr("<form "+m[1]+">","method")||"get",fields:(m[2].match(/<(?:input|select|textarea)\b/gi)||[]).length}));
  const colors=[...html.matchAll(/(?:--[\w-]*color[\w-]*|(?:background-color|background|color))\s*:\s*(#[0-9a-f]{3,8})\b/gi)].map(m=>m[1]);
  const fonts=[...html.matchAll(/font-family\s*:\s*([^;}]+)/gi)].map(m=>m[1].trim());
  return{
    url,status,title:titleMatch?textOf(titleMatch[1]):"",description:attr(meta("description")||property("og:description")||"","content"),
    canonical:canonicalTag?attr(canonicalTag,"href"):"",robots:attr(meta("robots")||"","content"),
    openGraph:{title:attr(property("og:title")||"","content"),description:attr(property("og:description")||"","content"),image:attr(property("og:image")||"","content"),type:attr(property("og:type")||"","content")},
    headings,h1:headings.h1,h2:headings.h2,images,missingAlt:images.filter(i=>!i.hasAlt||!i.alt.trim()).length,links:pageLinks,
    scripts:tags(html,"script").map(t=>attr(t,"src")).filter(Boolean),
    stylesheets:links.filter(t=>attr(t,"rel").toLowerCase().split(/\s+/).includes("stylesheet")).map(t=>attr(t,"href")).filter(Boolean),
    forms,lang:(html.match(/<html\b[^>]*\blang\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i)||[]).slice(1).find(Boolean)||"",
    themeColor:attr(meta("theme-color")||"","content"),colors:[...new Set(colors)].slice(0,30),fontFamilies:[...new Set(fonts)].slice(0,20)
  };
}
function parseRobots(source){
  const rules=[];let applies=false;
  for(const raw of source.split(/\r?\n/)){const line=raw.trim();if(!line||line.startsWith("#"))continue;const i=line.indexOf(":");if(i<0)continue;
    const key=line.slice(0,i).trim().toLowerCase(),value=line.slice(i+1).trim();
    if(key==="user-agent"){applies=value==="*"||USER_AGENT.toLowerCase().includes(value.toLowerCase());continue;}
    if(applies&&(key==="allow"||key==="disallow")&&value)rules.push({type:key,path:value});
  }return rules;
}
function allowedPath(path,rules){const found=rules.filter(r=>path.startsWith(r.path)).sort((a,b)=>b.path.length-a.path.length);return!found.length||found[0].type==="allow";}

export async function onRequestPost({request}){
  let body;try{body=await request.json();}catch{return json({ok:false,error:"El cuerpo de la petición debe ser JSON válido.",code:"INVALID_JSON"},400);}
  const initial=validPublicUrl(String(body?.url||"").trim());
  if(!initial||initial.href.length>2048)return json({ok:false,error:"Introduce una URL pública HTTP/HTTPS válida. No se admiten direcciones locales ni IP literales.",code:"INVALID_URL"},400);
  const maxPages=Math.max(1,Math.min(25,Number.isInteger(body.maxPages)?body.maxPages:DEFAULT_MAX_PAGES)),origin=initial.origin;
  let robotsRules=[],robotsStatus="unavailable",sitemaps=[];
  try{
    const r=await fetch(new URL("/robots.txt",origin),{headers:{"User-Agent":USER_AGENT},signal:AbortSignal.timeout(4500)});
    if(r.ok){const source=(await r.text()).slice(0,200000);robotsRules=parseRobots(source);robotsStatus="read";for(const m of source.matchAll(/^\s*Sitemap:\s*(\S+)/gim)){try{const u=new URL(m[1]);if(u.origin===origin)sitemaps.push(u.href);}catch{}}}
    else robotsStatus="http_"+r.status;
  }catch{}
  const candidates=[...sitemaps,new URL("/sitemap.xml",origin).href].slice(0,3),discovered=new Set([initial.href]),queue=[initial.href],pages=[],errors=[],seen=new Set();
  for(const sitemap of candidates){
    try{const r=await fetch(sitemap,{headers:{"User-Agent":USER_AGENT},signal:AbortSignal.timeout(5000)});if(!r.ok)continue;const xml=(await r.text()).slice(0,500000);
      for(const m of xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)){const u=sameOriginUrl(m[1],sitemap,origin);if(u&&allowedPath(u.pathname,robotsRules))discovered.add(u.href);if(discovered.size>=maxPages*4)break;}
    }catch{}
  }
  for(const u of discovered){if(!queue.includes(u)&&queue.length<maxPages*4)queue.push(u);}
  while(queue.length&&pages.length<maxPages){
    const batch=[];while(queue.length&&batch.length<4&&pages.length+batch.length<maxPages){const u=queue.shift();if(!seen.has(u)){seen.add(u);batch.push(u);}}
    if(!batch.length)break;
    const fetched=await Promise.all(batch.map(async url=>{try{return{url,...await fetchLimited(url,origin)};}catch(e){return{url,error:e.message||"FETCH_FAILED"};}}));
    for(const item of fetched){
      if(item.error){errors.push({url:item.url,reason:item.error});continue;}
      const page=parsePage(item.html,item.url,item.status);pages.push(page);
      for(const link of page.links){const u=sameOriginUrl(link.url,page.url,origin);if(!u||!allowedPath(u.pathname,robotsRules)||seen.has(u.href)||queue.includes(u.href))continue;if(queue.length<maxPages*4)queue.push(u.href);}
    }
  }
  if(!pages.length)return json({ok:false,error:"No se ha podido leer ninguna página HTML pública. Comprueba el dominio, el acceso y las reglas anti-bot.",code:"NO_PAGES_CRAWLED",errors},502);
  const root=pages.find(p=>new URL(p.url).pathname===initial.pathname)||pages[0],allImages=pages.flatMap(p=>p.images.map(i=>({...i,pageUrl:p.url})));
  const allLinks=pages.flatMap(p=>p.links.map(l=>({...l,pageUrl:p.url,type:new URL(l.url).hostname===initial.hostname?"internal":"outbound"}))),findings=[];
  for(const p of pages){
    if(!p.title)findings.push({url:p.url,category:"SEO",severity:"high",message:"Falta la etiqueta title."});
    else if(p.title.length<30||p.title.length>60)findings.push({url:p.url,category:"SEO",severity:"medium",message:"Title fuera de la longitud orientativa (30–60 caracteres)."});
    if(!p.description)findings.push({url:p.url,category:"SEO",severity:"medium",message:"Falta la meta description."});
    if(!p.h1.length)findings.push({url:p.url,category:"SEO",severity:"high",message:"No se ha encontrado un H1."});
    if(p.h1.length>1)findings.push({url:p.url,category:"SEO",severity:"medium",message:"La página contiene más de un H1."});
    if(p.missingAlt)findings.push({url:p.url,category:"Accesibilidad",severity:"medium",message:p.missingAlt+" imágenes sin ALT."});
    if(p.robots&&/noindex/i.test(p.robots))findings.push({url:p.url,category:"Indexación",severity:"info",message:"La directiva robots contiene noindex."});
  }
  const rootText=pages.map(p=>p.url+" "+p.h1.join(" ")+" "+p.h2.join(" ")).join(" ").toLowerCase(),sectors=[];
  for(const[re,label]of[[/fiscal|impuesto|hacienda|tributario/,"Asesoría Fiscal"],[/laboral|nómina|contrato/,"Asesoría Laboral"],[/gestoría|contable|contabilidad/,"Gestoría y Contabilidad"],[/abogado|jurídico|legal/,"Servicios Legales"],[/diseño|web|marketing|publicidad/,"Marketing y Diseño"],[/clínica|salud|médico/,"Salud y Bienestar"],[/inmobiliaria|alquiler|vivienda/,"Inmobiliaria"],[/restaurante|comida|menú/,"Hostelería"],[/construcción|reforma|arquitecto/,"Construcción y Reformas"]])if(re.test(rootText))sectors.push(label);
  const audiences=[];for(const[re,label]of[[/autónomo|autonomos/,"Autónomos"],[/pyme|pymes/,"PYMES"],[/particular|familias/,"Particulares"],[/emprendedor|startup/,"Emprendedores"]])if(re.test(rootText))audiences.push(label);
  const services=[...new Set(pages.flatMap(p=>p.h2).filter(x=>x.length>2&&x.length<90))].slice(0,30);
  const checks=[pages.every(p=>!!p.title),pages.every(p=>!!p.description),pages.every(p=>p.h1.length===1),allImages.every(i=>!!i.alt.trim()),pages.every(p=>!!p.canonical),pages.every(p=>!!p.lang)],score=Math.round(checks.filter(Boolean).length/checks.length*100);
  const projectName=(root.title||initial.hostname).split(/[|–—-]/)[0].trim();
  const limitations=["El rastreo respeta robots.txt cuando está disponible y analiza HTML público. No ejecuta JavaScript ni reproduce interacciones de navegador.","Lighthouse y Core Web Vitals se miden en una fase separada mediante PageSpeed Insights cuando la clave del servicio está configurada.","La identidad visual extraída se limita a colores y tipografías declarados en el HTML; CSS externo y estilos calculados requieren navegador de renderizado.","Los datos comerciales no visibles públicamente quedan pendientes de confirmación."];
  const complete=queue.length===0&&errors.length===0;
  return json({
    ok:true,url:initial.href,fetchedAt:new Date().toISOString(),httpStatus:root.status,title:root.title,description:root.description,themeColor:root.themeColor,projectName,
    sector:sectors.join(", ")||"Pendiente de confirmar",offer:root.description||"Pendiente de confirmar con el cliente.",
    audience:audiences.join(", ")||"Pendiente de confirmar con el cliente.",goal:/presupuesto|contacto|solicita/.test(rootText)?"Captar solicitudes y contactos comerciales":"Pendiente de confirmar con el cliente.",
    requirements:services.join("\n"),h1:root.h1,h2:root.h2,
    crawl:{pagesAnalyzed:pages.length,urlsDiscovered:seen.size+queue.length,queuedRemaining:queue.length,maxPages,complete,robotsStatus,robotsRulesApplied:robotsRules.length},
    pages:pages.map(p=>({url:p.url,status:p.status,title:p.title,description:p.description,canonical:p.canonical,robots:p.robots,openGraph:p.openGraph,headings:p.headings,h1:p.h1,h2:p.h2,images:{total:p.images.length,missingAlt:p.missingAlt,details:p.images.filter(i=>!i.hasAlt||!i.alt.trim()).slice(0,30)},links:p.links.slice(0,100),scripts:p.scripts,stylesheets:p.stylesheets,forms:p.forms,lang:p.lang,themeColor:p.themeColor,colors:p.colors,fontFamilies:p.fontFamilies})),
    images:{total:allImages.length,missingAlt:allImages.filter(i=>!i.alt.trim()).length,details:allImages.filter(i=>!i.alt.trim()).slice(0,100)},
    links:{total:allLinks.length,internal:allLinks.filter(l=>l.type==="internal").length,outbound:allLinks.filter(l=>l.type==="outbound").length,details:allLinks.slice(0,300)},
    findings,score,scoreType:"heuristic_html_checks_not_lighthouse",
    checks:{titles:checks[0],descriptions:checks[1],singleH1:checks[2],imageAlt:checks[3],canonical:checks[4],htmlLang:checks[5]},errors,limitations,
    summary:"Rastreo de "+pages.length+" páginas públicas de "+initial.hostname+". "+findings.length+" hallazgos preliminares. La puntuación "+score+"/100 resume solo comprobaciones HTML; no es una puntuación Lighthouse."
  });
}
