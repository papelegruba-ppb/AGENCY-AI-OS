import { ownerSession, sameOrigin, jsonResponse } from "../_lib/owner-auth.js";

const OWNER_ID = "owner";
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Map([
  [".pdf", ["application/pdf"]], [".png", ["image/png"]], [".jpg", ["image/jpeg"]],
  [".jpeg", ["image/jpeg"]], [".webp", ["image/webp"]], [".gif", ["image/gif"]],
  [".txt", ["text/plain"]], [".md", ["text/markdown", "text/plain"]],
  [".csv", ["text/csv", "application/vnd.ms-excel", "text/plain"]],
  [".json", ["application/json", "text/plain"]],
  [".docx", ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]],
  [".xlsx", ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]],
  [".pptx", ["application/vnd.openxmlformats-officedocument.presentationml.presentation"]]
]);
const TEXT_EXTENSIONS = new Set([".txt", ".md", ".csv", ".json"]);
const clean = (value, max=180) => String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0,max);
const ext = name => { const i=name.lastIndexOf("."); return i>=0?name.slice(i).toLowerCase():""; };
const sha256 = async bytes => [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map(v=>v.toString(16).padStart(2,"0")).join("");
async function authorize(context) {
  if (!sameOrigin(context.request)) return jsonResponse({ok:false,error:"Origen no válido."},403);
  if (!(await ownerSession(context.request,context.env))) return jsonResponse({ok:false,code:"OWNER_AUTH_REQUIRED",error:"Inicia sesión en el Workspace privado."},401);
  if (!context.env.AGENCY_DB) return jsonResponse({ok:false,code:"D1_NOT_CONFIGURED",error:"Falta el binding AGENCY_DB."},503);
  if (!context.env.AGENCY_FILES || typeof context.env.AGENCY_FILES.put!=="function") return jsonResponse({ok:false,code:"R2_NOT_CONFIGURED",error:"Falta el binding privado AGENCY_FILES de Cloudflare R2. No se ha subido ningún archivo."},503);
  return null;
}
function validProjectId(value) { return /^[a-zA-Z0-9_-]{1,100}$/.test(value); }
export async function onRequestGet(context) {
  const denied=await authorize(context); if(denied)return denied;
  const projectId=new URL(context.request.url).searchParams.get("projectId")||"";
  if(!validProjectId(projectId)) return jsonResponse({ok:false,error:"Identificador de proyecto inválido."},400);
  try {
    const project=await context.env.AGENCY_DB.prepare("SELECT id FROM projects WHERE id=? AND owner_id=?").bind(projectId,OWNER_ID).first();
    if(!project) return jsonResponse({ok:false,error:"Proyecto no encontrado."},404);
    const {results=[]}=await context.env.AGENCY_DB.prepare("SELECT id,file_name,mime_type,size_bytes,sha256,processing_status,created_at FROM project_files WHERE project_id=? AND owner_id=? ORDER BY created_at DESC LIMIT 100").bind(projectId,OWNER_ID).all();
    return jsonResponse({ok:true,files:results,storage:"private-r2",processing:"text-files-indexed; other-formats-pending-parser"});
  } catch { return jsonResponse({ok:false,code:"PROJECT_FILES_DB_ERROR",error:"No se pudo consultar la biblioteca del proyecto. Comprueba la migración SQL."},503); }
}
export async function onRequestPost(context) {
  const denied=await authorize(context); if(denied)return denied;
  const request=context.request;
  const projectId=clean(request.headers.get("x-project-id"),100);
  const fileName=clean(request.headers.get("x-file-name"),180);
  const suffix=ext(fileName);
  const mime=String(request.headers.get("content-type")||"").split(";")[0].toLowerCase();
  if(!validProjectId(projectId)||!fileName||!ALLOWED.has(suffix)||!ALLOWED.get(suffix).includes(mime)) return jsonResponse({ok:false,error:"Proyecto, extensión o tipo MIME no admitido."},415);
  const length=Number(request.headers.get("content-length")||0);
  if(length>MAX_FILE_BYTES) return jsonResponse({ok:false,error:"El archivo supera el límite de 8 MB."},413);
  try {
    const project=await context.env.AGENCY_DB.prepare("SELECT id FROM projects WHERE id=? AND owner_id=?").bind(projectId,OWNER_ID).first();
    if(!project) return jsonResponse({ok:false,error:"Proyecto no encontrado."},404);
    const existing=await context.env.AGENCY_DB.prepare("SELECT COUNT(*) AS total FROM project_files WHERE project_id=? AND owner_id=?").bind(projectId,OWNER_ID).first();
    if(Number(existing?.total||0)>=100) return jsonResponse({ok:false,error:"Este proyecto ha alcanzado el límite de 100 archivos."},429);
    const bytes=await request.arrayBuffer();
    if(!bytes.byteLength||bytes.byteLength>MAX_FILE_BYTES) return jsonResponse({ok:false,error:"Archivo vacío o superior a 8 MB."},413);
    const digest=await sha256(bytes), id=crypto.randomUUID(), objectKey="owner/"+projectId+"/"+id+suffix;
    await context.env.AGENCY_FILES.put(objectKey,bytes,{httpMetadata:{contentType:mime,cacheControl:"private, no-store"},customMetadata:{ownerId:OWNER_ID,projectId,fileId:id,sha256:digest}});
    const createdAt=new Date().toISOString();
    try {
      await context.env.AGENCY_DB.prepare("INSERT INTO project_files (id,project_id,owner_id,object_key,file_name,mime_type,size_bytes,sha256,processing_status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(id,projectId,OWNER_ID,objectKey,fileName,mime,bytes.byteLength,digest,TEXT_EXTENSIONS.has(suffix)?"processing":"pending_parser",createdAt).run();
    } catch(error) { await context.env.AGENCY_FILES.delete(objectKey).catch(()=>{}); throw error; }
    let processingStatus="pending_parser";
    if(TEXT_EXTENSIONS.has(suffix)) {
      try {
        let text=new TextDecoder("utf-8").decode(bytes).replace(/\\u0000/g,"").replace(/[\\u0001-\\u0008\\u000b\\u000c\\u000e-\\u001f]/g," ");
        const truncated=text.length>90000;
        text=text.slice(0,90000).trim();
        if(!text) throw new Error("No se encontró texto legible.");
        const chunkSize=1200, overlap=160, statements=[];
        for(let offset=0,index=0;offset<text.length&&index<80;offset+=chunkSize-overlap,index++){
          const content=text.slice(offset,offset+chunkSize).trim();
          if(content) statements.push(context.env.AGENCY_DB.prepare("INSERT INTO project_file_chunks (id,file_id,project_id,owner_id,chunk_index,content,created_at) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(),id,projectId,OWNER_ID,index,content,createdAt));
        }
        if(!statements.length) throw new Error("No se pudieron crear fragmentos.");
        await context.env.AGENCY_DB.batch(statements);
        processingStatus=truncated?"indexed_truncated":"indexed";
        await context.env.AGENCY_DB.prepare("UPDATE project_files SET processing_status=? WHERE id=? AND project_id=? AND owner_id=?").bind(processingStatus,id,projectId,OWNER_ID).run();
      } catch {
        processingStatus="processing_failed";
        await context.env.AGENCY_DB.prepare("UPDATE project_files SET processing_status=? WHERE id=? AND project_id=? AND owner_id=?").bind(processingStatus,id,projectId,OWNER_ID).run().catch(()=>{});
      }
    }
    const note=processingStatus.startsWith("indexed")?"Archivo almacenado y texto indexado para búsquedas dentro de este proyecto.":"Archivo almacenado de forma privada. Su formato requiere un procesador documental adicional.";
    return jsonResponse({ok:true,file:{id,projectId,fileName,mimeType:mime,sizeBytes:bytes.byteLength,sha256:digest,processingStatus},note},201);
  } catch { return jsonResponse({ok:false,code:"PROJECT_FILE_UPLOAD_FAILED",error:"No se pudo almacenar el archivo. Comprueba AGENCY_FILES y la migración de D1."},503); }
}
export async function onRequestDelete(context) {
  const denied=await authorize(context); if(denied)return denied;
  const url=new URL(context.request.url), projectId=url.searchParams.get("projectId")||"", fileId=url.searchParams.get("fileId")||"";
  if(!validProjectId(projectId)||! /^[a-f0-9-]{36}$/i.test(fileId)) return jsonResponse({ok:false,error:"Identificadores inválidos."},400);
  try {
    const file=await context.env.AGENCY_DB.prepare("SELECT object_key FROM project_files WHERE id=? AND project_id=? AND owner_id=?").bind(fileId,projectId,OWNER_ID).first();
    if(!file) return jsonResponse({ok:false,error:"Archivo no encontrado."},404);
    await context.env.AGENCY_FILES.delete(file.object_key);
    await context.env.AGENCY_DB.prepare("DELETE FROM project_file_chunks WHERE file_id=? AND project_id=? AND owner_id=?").bind(fileId,projectId,OWNER_ID).run();
    await context.env.AGENCY_DB.prepare("DELETE FROM project_files WHERE id=? AND project_id=? AND owner_id=?").bind(fileId,projectId,OWNER_ID).run();
    return jsonResponse({ok:true,deleted:true});
  } catch { return jsonResponse({ok:false,code:"PROJECT_FILE_DELETE_FAILED",error:"No se pudo eliminar el archivo."},503); }
}
