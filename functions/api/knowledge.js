export const SEED={schemaVersion:1,updatedAt:"2026-08-06T13:30:00+02:00",facts:[
  {id:"person.mike.role",subject:"Mike",statement:"Mike ist Gründer und Verantwortlicher von RH Produktion.",status:"confirmed",confirmedBy:"Mike",confirmedAt:"2026-08-06T13:30:00+02:00"},
  {id:"person.shadow-grown.role",subject:"Shadow Grown",statement:"Shadow Grown ist ein eigenständiger Künstler und Mitarbeiter von RH Produktion.",status:"confirmed",confirmedBy:"Mike",confirmedAt:"2026-08-06T13:30:00+02:00"},
  {id:"person.identity.separation",subject:"Mike und Shadow Grown",statement:"Mike und Shadow Grown dürfen von RHIA nicht automatisch als dieselbe Person behandelt werden.",status:"confirmed",confirmedBy:"Mike",confirmedAt:"2026-08-06T13:30:00+02:00"},
  {id:"organization.rh-produktion",subject:"RH Produktion",statement:"RH Produktion ist ein Unternehmen. Die genaue offizielle Rollen- und Leistungsbeschreibung wird noch gemeinsam festgelegt.",status:"confirmed",confirmedBy:"Mike",confirmedAt:"2026-08-06T13:30:00+02:00"},
  {id:"assistant.rhia.role",subject:"RHIA",statement:"RHIA bedeutet RH Intelligent Assistant und wird als persönliche digitale KI-Assistentin für Alltag, RH Produktion und kreative Projekte entwickelt.",status:"confirmed",confirmedBy:"Mike",confirmedAt:"2026-08-06T13:30:00+02:00"}
]};
const KNOWLEDGE_KEY="core",MAX_FACTS=500;
const ALLOWED_ORIGINS=new Set(["https://ggrlak-04872.github.io","https://rhia.pages.dev"]);
function cors(request){const origin=request?.headers?.get("origin")||"";return{...(ALLOWED_ORIGINS.has(origin)?{"access-control-allow-origin":origin}:{}),"access-control-allow-methods":"GET, POST, DELETE, OPTIONS","access-control-allow-headers":"content-type,x-rhia-owner-token","access-control-expose-headers":"content-disposition","access-control-max-age":"86400","vary":"Origin"}}
const json=(data,status=200,request,headers={})=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...cors(request),...headers}});
const clean=(value,max)=>String(value??"").trim().replace(/\s+/g," ").slice(0,max);
const storageReadable=env=>Boolean(env?.RHIA_KNOWLEDGE?.get);
const storageWritable=env=>storageReadable(env)&&Boolean(env?.RHIA_KNOWLEDGE?.put);
export function ownerAuthorized(request,env){
  const expected=String(env?.RHIA_OWNER_TOKEN||""),supplied=request?.headers?.get("x-rhia-owner-token")||"";
  return Boolean(expected)&&Boolean(supplied)&&supplied===expected;
}
function requireOwner(request,env){
  if(!env?.RHIA_OWNER_TOKEN)return json({ok:false,error:"Der Besitzerzugang ist serverseitig noch nicht eingerichtet.",code:"OWNER_AUTH_NOT_CONFIGURED"},503,request);
  if(!ownerAuthorized(request,env))return json({ok:false,error:"Die Besitzerfreigabe fehlt oder ist ungültig.",code:"OWNER_AUTH_REQUIRED"},401,request);
  return null;
}
function knowledgeUnavailable(request){return json({ok:false,error:"Der zentrale Speicher ist noch nicht verbunden.",code:"KNOWLEDGE_NOT_CONFIGURED"},503,request)}
function normalizedKnowledge(value){return{schemaVersion:Number(value?.schemaVersion)||1,updatedAt:value?.updatedAt||SEED.updatedAt,facts:Array.isArray(value?.facts)?value.facts:[]}}
export async function readKnowledge(env){
  if(!storageReadable(env))return SEED;
  return normalizedKnowledge(await env.RHIA_KNOWLEDGE.get(KNOWLEDGE_KEY,"json")||SEED);
}
export async function onRequestGet({request,env}){
  if(!storageReadable(env))return knowledgeUnavailable(request);
  const denied=requireOwner(request,env);if(denied)return denied;
  try{
    const knowledge=await readKnowledge(env),url=new URL(request.url);
    if(url.searchParams.get("export")==="1")return json({ok:true,exportedAt:new Date().toISOString(),knowledge},200,request,{"content-disposition":"attachment; filename=\"rhia-gedaechtnis.json\""});
    return json({ok:true,knowledge},200,request);
  }catch(error){console.error("RHIA knowledge read error",{code:"KNOWLEDGE_READ_FAILED"});return json({ok:false,error:"Das zentrale Gedächtnis ist gerade nicht erreichbar.",code:"KNOWLEDGE_READ_FAILED"},503,request)}
}
export async function onRequestPost({request,env}){
  if(!storageWritable(env))return knowledgeUnavailable(request);
  const denied=requireOwner(request,env);if(denied)return denied;
  let body;try{body=await request.json()}catch{return json({ok:false,error:"Ungültige Anfrage.",code:"INVALID_REQUEST"},400,request)}
  const statement=clean(body?.statement,700),subject=clean(body?.subject,100)||"Allgemein";
  if(statement.length<3)return json({ok:false,error:"Die Information ist zu kurz.",code:"STATEMENT_TOO_SHORT"},400,request);
  try{
    const current=await readKnowledge(env),facts=current.facts;
    const now=new Date().toISOString(),id=clean(body?.id,120)||`learned.${Date.now()}`;
    const fact={id,subject,statement,status:"confirmed",confirmedBy:"Mike",confirmedAt:now};
    const nextFacts=[...facts.filter(item=>item?.id!==id),fact];
    const next={schemaVersion:1,updatedAt:now,facts:nextFacts.slice(-MAX_FACTS)};
    await env.RHIA_KNOWLEDGE.put(KNOWLEDGE_KEY,JSON.stringify(next));
    return json({ok:true,fact,knowledge:next,knowledgeUpdatedAt:now},201,request);
  }catch(error){console.error("RHIA knowledge write error",{code:"KNOWLEDGE_WRITE_FAILED"});return json({ok:false,error:"Das zentrale Gedächtnis konnte nicht aktualisiert werden.",code:"KNOWLEDGE_WRITE_FAILED"},503,request)}
}
export async function onRequestDelete({request,env}){
  if(!storageWritable(env))return knowledgeUnavailable(request);
  const denied=requireOwner(request,env);if(denied)return denied;
  let body;try{body=await request.json()}catch{return json({ok:false,error:"Ungültige Anfrage.",code:"INVALID_REQUEST"},400,request)}
  const id=clean(body?.id,120);if(!id)return json({ok:false,error:"Es wurde kein Gedächtniseintrag angegeben.",code:"KNOWLEDGE_ID_REQUIRED"},400,request);
  try{
    const current=await readKnowledge(env),fact=current.facts.find(item=>item?.id===id);
    if(!fact)return json({ok:true,deleted:{id,alreadyAbsent:true},knowledge:current,knowledgeUpdatedAt:current.updatedAt},200,request);
    const now=new Date().toISOString(),next={schemaVersion:1,updatedAt:now,facts:current.facts.filter(item=>item?.id!==id)};
    await env.RHIA_KNOWLEDGE.put(KNOWLEDGE_KEY,JSON.stringify(next));
    return json({ok:true,deleted:{id:fact.id,subject:fact.subject},knowledge:next,knowledgeUpdatedAt:now},200,request);
  }catch(error){console.error("RHIA knowledge delete error",{code:"KNOWLEDGE_DELETE_FAILED"});return json({ok:false,error:"Der Gedächtniseintrag konnte nicht gelöscht werden.",code:"KNOWLEDGE_DELETE_FAILED"},503,request)}
}
export function onRequestOptions({request}){return new Response(null,{status:204,headers:cors(request)})}
