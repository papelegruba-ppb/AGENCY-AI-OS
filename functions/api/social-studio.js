import { runAiText } from "../_lib/ai-runtime.js";
import { ownerSession, sameOrigin, jsonResponse } from "../_lib/owner-auth.js";

const clean=(value,max=2000)=>String(value??"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max);
const PLATFORMS=new Set(["Instagram","TikTok","Facebook","LinkedIn","YouTube Shorts"]);
const GOALS=new Set(["Reconocimiento de marca","Interacción y comunidad","Captación de leads","Ventas y conversiones","Lanzamiento de producto o servicio"]);
export async function onRequestPost({request,env}){
 if(!sameOrigin(request))return jsonResponse({ok:false,error:"Origen de solicitud no válido."},403);
 if(!(await ownerSession(request,env)))return jsonResponse({ok:false,code:"OWNER_AUTH_REQUIRED",error:"Inicia sesión en el Workspace privado."},401);
 let body;try{body=await request.json()}catch{return jsonResponse({ok:false,error:"La petición debe ser JSON."},400)}
 const task=clean(body?.task,2500),platform=clean(body?.platform,40),goal=clean(body?.goal,80);
 if(!task)return jsonResponse({ok:false,error:"Describe qué contenido necesitas."},400);
 if(!PLATFORMS.has(platform)||!GOALS.has(goal))return jsonResponse({ok:false,error:"Selecciona una plataforma y un objetivo válidos."},400);
 const raw=body?.project&&typeof body.project==="object"?body.project:{};
 const project={
  name:clean(raw.name,100),sector:clean(raw.sector,120),offer:clean(raw.offer,500),
  audience:clean(raw.audience,300),goal:clean(raw.goal,250),domain:clean(raw.domain,160),
  requirements:clean(raw.requirements,500),style:clean(raw.style,100),color:/^#[0-9a-f]{6}$/i.test(raw.color||"")?raw.color:""
 };
 const system=[
  "Eres el Social Media & Content Studio de Agency AI OS. Trabajas solo para el proyecto activo y respondes en español.",
  "Actúa como estratega social, copywriter, director creativo y productor de contenidos.",
  "Entrega contenido utilizable, no solo ideas: ganchos, textos finales, CTA, hashtags pertinentes, dirección visual y guiones por escena cuando se solicite vídeo.",
  "Adapta tono, longitud y formato a la plataforma. Evita repetir la misma pieza en todas las redes.",
  "No inventes datos de empresa, precios, resultados, reseñas, testimonios, certificaciones ni estadísticas. Señala los datos que faltan.",
  "Para cada pieza incluye objetivo, formato, texto/copy, CTA y propuesta visual. Para historias, diseña una secuencia de pantallas. Para Reels/Shorts, incluye escenas, duración aproximada, voz y subtítulos.",
  "Incluye prompts listos para Canva u otra aplicación externa cuando la pieza requiera diseño o generación audiovisual. Explica qué resultado exportar y cómo incorporarlo al proyecto.",
  "No publiques, programes ni conectes cuentas. La salida requiere revisión y aprobación humana.",
  "Si el briefing es insuficiente, declara supuestos y utiliza marcadores editables en lugar de inventar información."
 ].join("\n");
 const input="PROYECTO:\n"+JSON.stringify(project)+"\nPLATAFORMA: "+platform+"\nOBJETIVO DE CAMPAÑA: "+goal+"\nSOLICITUD:\n"+task+"\n\nPrepara un paquete editorial compacto pero completo con: enfoque estratégico, pilares de contenido, calendario sugerido de 7 días, 3 posts/carruseles, 3 historias secuenciadas y 1 Reel/Short con guion (adapta las cantidades si la solicitud pide otra cosa). Añade copy final, CTA, hashtags, prompts visuales y pasos para aplicar los entregables en el proyecto.";
 const result=await runAiText({env,request,endpoint:"/api/social-studio",provider:clean(body?.provider,32).toLowerCase(),system,input,maxOutputTokens:1700,temperature:0.55});
 if(!result.ok)return result.response;
 return jsonResponse({ok:true,content:result.text,provider:result.provider,model:result.model,projectName:project.name,platform,goal,publication:"manual-approval-required"});
}
