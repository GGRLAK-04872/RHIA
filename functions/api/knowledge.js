import{
  deleteCentralMemory,
  MemoryStoreError,
  readCentralMemory,
  writeCentralMemory
}from"../lib/memory-store.js";
import{cleanMemoryText,validExpectedRevision}from"../../shared/memory-contract.js";

const ALLOWED_ORIGINS=new Set(["https://ggrlak-04872.github.io","https://rhia.pages.dev"]);

export function corsHeaders(request){
  const origin=request?.headers?.get("origin")||"";
  return{
    ...(ALLOWED_ORIGINS.has(origin)?{"access-control-allow-origin":origin}:{}),
    "access-control-allow-methods":"GET, POST, DELETE, OPTIONS",
    "access-control-allow-headers":"content-type,x-rhia-owner-token",
    "access-control-expose-headers":"content-disposition",
    "access-control-max-age":"86400",
    "vary":"Origin"
  };
}

export function json(data,status=200,request,headers={}){
  return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...corsHeaders(request),...headers}});
}

export function deploymentEnvironment(env){return String(env?.RHIA_DEPLOYMENT_ENV||"production").toLowerCase()==="preview"?"preview":"production"}

export function configuredOwnerToken(env){
  return deploymentEnvironment(env)==="preview"?String(env?.RHIA_PREVIEW_OWNER_TOKEN||""):String(env?.RHIA_OWNER_TOKEN||"");
}

export function ownerAccessConfigured(env){return Boolean(configuredOwnerToken(env))}

export function ownerAuthorized(request,env){
  const expected=configuredOwnerToken(env),supplied=request?.headers?.get("x-rhia-owner-token")||"";
  return Boolean(expected)&&Boolean(supplied)&&supplied===expected;
}

export function requireOwner(request,env){
  if(!ownerAccessConfigured(env))return json({ok:false,error:"Der Besitzerzugang ist serverseitig noch nicht eingerichtet.",code:"OWNER_AUTH_NOT_CONFIGURED"},503,request);
  if(!ownerAuthorized(request,env))return json({ok:false,error:"Die Besitzerfreigabe fehlt oder ist ungültig.",code:"OWNER_AUTH_REQUIRED"},401,request);
  return null;
}

function memoryError(error,request,operation){
  const known=error instanceof MemoryStoreError;
  if(!known)console.error("RHIA memory API failed",{operation,code:error?.code||"MEMORY_API_FAILED"});
  return json({
    ok:false,
    error:known?error.message:"Das zentrale Gedächtnis ist gerade nicht erreichbar.",
    code:known?error.code:"MEMORY_STORE_UNAVAILABLE",
    ...(known&&error.details?.actualRevision!==undefined?{actualRevision:error.details.actualRevision}:{}),
    ...(known&&error.details?.expectedRevision!==undefined?{expectedRevision:error.details.expectedRevision}:{})
  },known?error.status:503,request);
}

function snapshotResponse(snapshot,extra={}){
  return{ok:true,storeId:snapshot.storeId,revision:snapshot.revision,knowledge:snapshot,...extra};
}

export async function onRequestGet({request,env}){
  const denied=requireOwner(request,env);if(denied)return denied;
  try{
    const url=new URL(request.url),exportMode=url.searchParams.get("export")==="1";
    const knowledge=await readCentralMemory(env,{includeTombstones:exportMode});
    if(exportMode)return json(snapshotResponse(knowledge,{exportedAt:new Date().toISOString()}),200,request,{"content-disposition":"attachment; filename=\"rhia-gedaechtnis.json\""});
    return json(snapshotResponse(knowledge),200,request);
  }catch(error){return memoryError(error,request,"read")}
}

export async function onRequestPost({request,env}){
  const denied=requireOwner(request,env);if(denied)return denied;
  let body;try{body=await request.json()}catch{return json({ok:false,error:"Ungültige Anfrage.",code:"INVALID_REQUEST"},400,request)}
  if(!validExpectedRevision(body?.expectedRevision))return json({ok:false,error:"Die erwartete Gedächtnisrevision fehlt.",code:"EXPECTED_REVISION_REQUIRED"},400,request);
  const statement=cleanMemoryText(body?.statement,700),subject=cleanMemoryText(body?.subject,100)||"Allgemein";
  if(statement.length<3)return json({ok:false,error:"Die Information ist zu kurz.",code:"STATEMENT_TOO_SHORT"},400,request);
  const id=cleanMemoryText(body?.id,120)||`learned.${Date.now()}.${crypto.randomUUID().slice(0,8)}`;
  try{
    const result=await writeCentralMemory(env,{expectedRevision:body.expectedRevision,fact:{id,subject,statement,status:"confirmed",confirmedBy:"Mike",confirmedAt:new Date().toISOString()}});
    return json(snapshotResponse(result.snapshot,{fact:result.fact}),result.status||201,request);
  }catch(error){return memoryError(error,request,"write")}
}

export async function onRequestDelete({request,env}){
  const denied=requireOwner(request,env);if(denied)return denied;
  let body;try{body=await request.json()}catch{return json({ok:false,error:"Ungültige Anfrage.",code:"INVALID_REQUEST"},400,request)}
  const id=cleanMemoryText(body?.id,120);
  if(!id)return json({ok:false,error:"Es wurde kein Gedächtniseintrag angegeben.",code:"MEMORY_ID_REQUIRED"},400,request);
  if(!validExpectedRevision(body?.expectedRevision))return json({ok:false,error:"Die erwartete Gedächtnisrevision fehlt.",code:"EXPECTED_REVISION_REQUIRED"},400,request);
  try{
    const result=await deleteCentralMemory(env,{expectedRevision:body.expectedRevision,id});
    return json(snapshotResponse(result.snapshot,{deleted:result.deleted}),result.status||200,request);
  }catch(error){return memoryError(error,request,"delete")}
}

export function onRequestOptions({request}){return new Response(null,{status:204,headers:corsHeaders(request)})}
export function onRequest({request}){return json({ok:false,error:"Methode nicht erlaubt.",code:"METHOD_NOT_ALLOWED"},405,request)}
