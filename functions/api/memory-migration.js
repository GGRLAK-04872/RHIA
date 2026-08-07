import{
  centralMigrationStatus,
  importCentralMigration,
  MemoryStoreError,
  previewCentralMigration
}from"../lib/memory-store.js";
import{cleanMemoryText,validExpectedRevision}from"../../shared/memory-contract.js";
import{corsHeaders,json,requireOwner}from"./knowledge.js";

function migrationEnabled(env){return String(env?.RHIA_MIGRATION_ENABLED||"").toLowerCase()==="true"}

function disabled(request){return json({ok:false,error:"Der kontrollierte Migrationszugang ist nicht aktiviert.",code:"MIGRATION_DISABLED"},503,request)}

function migrationError(error,request){
  const known=error instanceof MemoryStoreError;
  if(!known)console.error("RHIA migration failed",{code:error?.code||"MIGRATION_FAILED"});
  return json({ok:false,error:known?error.message:"Die Migration konnte nicht geprüft werden.",code:known?error.code:"MIGRATION_FAILED",...(known&&error.details?{details:error.details}:{})},known?error.status:503,request);
}

export async function onRequestGet({request,env}){
  if(!migrationEnabled(env))return disabled(request);
  const denied=requireOwner(request,env);if(denied)return denied;
  const sourceId=cleanMemoryText(new URL(request.url).searchParams.get("sourceId"),160);
  if(!sourceId)return json({ok:false,error:"Die Quellenkennung fehlt.",code:"MIGRATION_SOURCE_REQUIRED"},400,request);
  try{return json(await centralMigrationStatus(env,sourceId),200,request)}catch(error){return migrationError(error,request)}
}

export async function onRequestPost({request,env}){
  if(!migrationEnabled(env))return disabled(request);
  const denied=requireOwner(request,env);if(denied)return denied;
  let body;try{body=await request.json()}catch{return json({ok:false,error:"Ungültige Anfrage.",code:"INVALID_REQUEST"},400,request)}
  const action=String(body?.action||"");
  try{
    if(action==="preview"){
      const preview=await previewCentralMigration(env,body?.manifest||{});
      return json(preview,200,request);
    }
    if(action==="commit"){
      if(!validExpectedRevision(body?.expectedRevision))return json({ok:false,error:"Die bestätigte Ausgangsrevision fehlt.",code:"EXPECTED_REVISION_REQUIRED"},400,request);
      const confirmedChecksum=cleanMemoryText(body?.confirmedChecksum,64);
      if(!confirmedChecksum)return json({ok:false,error:"Die bestätigte Prüfsumme fehlt.",code:"MIGRATION_CHECKSUM_REQUIRED"},400,request);
      const result=await importCentralMigration(env,{expectedRevision:body.expectedRevision,confirmedChecksum,manifest:body?.manifest||{}});
      return json(result,result.status||201,request);
    }
    return json({ok:false,error:"Unbekannter Migrationsvorgang.",code:"MIGRATION_ACTION_INVALID"},400,request);
  }catch(error){return migrationError(error,request)}
}

export function onRequestOptions({request}){return new Response(null,{status:204,headers:corsHeaders(request)})}
export function onRequest({request}){return json({ok:false,error:"Methode nicht erlaubt.",code:"METHOD_NOT_ALLOWED"},405,request)}
