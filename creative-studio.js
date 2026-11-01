(()=>{"use strict";
const $=s=>document.querySelector(s), KEY="agency-ai-os.creative-studio.v1";
const providers=[
{name:"PixVerse",url:"https://pixverse.ai/",type:"image-video",free:"Créditos gratuitos diarios; límites y condiciones sujetos a cambios."},
{name:"Kling AI",url:"https://klingai.com/",type:"image-video",free:"Créditos gratuitos limitados; cola y marca de agua pueden aplicar."},
{name:"Hailuo AI",url:"https://hailuoai.video/",type:"image-video",free:"Plan gratuito limitado; 512p y marca de agua según oferta consultada."},
{name:"Luma Dream Machine",url:"https://lumalabs.ai/dream-machine",type:"image-video",free:"Plan gratuito restringido a uso personal según su política de licencias."},
{name:"Bing Image Creator",url:"https://www.bing.com/images/create",type:"image",free:"Generación gratuita con cuenta Microsoft; revisar términos y uso permitido."},
{name:"Google Flow",url:"https://labs.google/flow/",type:"video",free:"Disponibilidad y créditos dependen de cuenta y región."}
];
const sectors=["Producto y ecommerce","Moda y belleza","Restauración y alimentación","Turismo y hostelería","Deporte y bienestar","Tecnología","Educación y formación","Música y entretenimiento","Eventos y experiencias","Empresas y servicios","Arquitectura e interiorismo","Fantasía y storytelling","Contenido para redes","Otro"];
const formats=["Vertical 9:16","Cuadrado 1:1","Retrato 4:5","Horizontal 16:9","El motor debe recomendar"];
const $v=id=>$("#cs-"+id);
function read(){try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch{return{}}}
function project(){return $("#active-project-select")?.value||"local";}
function save(){const all=read();all[project()]={sector:$v("sector").value,goal:$v("goal").value,brand:$v("brand").value,audience:$v("audience").value,style:$v("style").value,format:$v("format").value,details:$v("details").value,negative:$v("negative").value,image:$v("image-prompt").value,video:$v("video-prompt").value,updatedAt:new Date().toISOString()};localStorage.setItem(KEY,JSON.stringify(all));$v("status").textContent="Prompts guardados en este dispositivo para el proyecto activo."}
function load(){const d=read()[project()];if(!d)return;for(const k of ["sector","goal","brand","audience","style","format","details","negative","image-prompt","video-prompt"])if(d[k]!==undefined)$v(k).value=d[k]}
function generate(){
const sector=$v("sector").value,goal=$v("goal").value.trim(),brand=$v("brand").value.trim()||"No especificada",audience=$v("audience").value.trim()||"Público por definir",style=$v("style").value.trim()||"Dirección visual profesional y coherente",format=$v("format").value,details=$v("details").value.trim(),negative=$v("negative").value.trim()||"texto ilegible, logotipos inventados, marcas de agua añadidas, deformaciones, anatomía incorrecta, artefactos, cambios de identidad";
if(!goal){$v("status").textContent="Describe qué quieres crear antes de generar los prompts.";return}
const base="Proyecto/marca: "+brand+". Sector: "+sector+". Objetivo: "+goal+". Audiencia: "+audience+". Dirección artística: "+style+". Formato: "+format+". Contexto y referencias: "+(details||"No facilitados; no inventar características del producto o marca.")+".";
const image="Create a high-quality visual asset for a real-world creative campaign. "+base+" Produce a single coherent composition with a clear subject, intentional framing, realistic materials and lighting, polished art direction, accurate product details and usable negative space. Preserve any supplied reference identity and brand elements exactly. Avoid fabricated logos, claims, labels or readable text; provide text separately for later layout. Negative constraints: "+negative+".";
const video="Create a polished image-to-video shot using the approved reference image. "+base+" Preserve the exact identity, subject, product design, proportions, typography, layout, colors and environment from the source image. Animate only the requested action and subtle environmental details. Specify a single controlled camera movement, physically plausible motion, consistent lighting, stable geometry and smooth temporal continuity. Do not morph, redesign, add objects, alter logos or generate new text. Avoid: "+negative+".";
$v("image-prompt").value=image;$v("video-prompt").value=video;save();$v("status").textContent="Dos prompts listos: primero crea/elige la imagen maestra y después úsala como referencia para animar.";
}
async function copy(id){const value=$v(id).value;if(!value)return;try{await navigator.clipboard.writeText(value);$v("status").textContent="Prompt copiado."}catch{$v("status").focus();$v("status").textContent="Selecciona y copia el prompt manualmente."}}
function renderProviders(){$v("providers").innerHTML=providers.map(p=>'<article class="cs-provider"><div><strong>'+p.name+'</strong><span>'+p.type+'</span></div><p>'+p.free+'</p><a href="'+p.url+'" target="_blank" rel="noopener noreferrer">Abrir plataforma ↗</a></article>').join("")}
function init(){
$v("sector").innerHTML=sectors.map(x=>'<option>'+x+'</option>').join("");
$v("format").innerHTML=formats.map(x=>'<option>'+x+'</option>').join("");
renderProviders();load();
$v("generate").addEventListener("click",generate);
$v("copy-image").addEventListener("click",()=>copy("image-prompt"));
$v("copy-video").addEventListener("click",()=>copy("video-prompt"));
$v("save").addEventListener("click",save);
$v("clear").addEventListener("click",()=>{for(const k of ["goal","brand","audience","style","details","negative","image-prompt","video-prompt"])$v(k).value="";$v("status").textContent="Campos de trabajo vaciados. El historial guardado no se ha borrado."});
$("#active-project-select")?.addEventListener("change",load);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();