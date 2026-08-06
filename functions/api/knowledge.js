export const SEED={schemaVersion:1,updatedAt:"2026-08-06T13:30:00+02:00",facts:[
  {id:"person.mike.role",subject:"Mike",statement:"Mike ist Gründer und Verantwortlicher von RH Produktion.",status:"confirmed",confirmedBy:"Mike",confirmedAt:"2026-08-06T13:30:00+02:00"},
  {id:"person.shadow-grown.role",subject:"Shadow Grown",statement:"Shadow Grown ist ein eigenständiger Künstler und Mitarbeiter von RH Produktion.",status:"confirmed",confirmedBy:"Mike",confirmedAt:"2026-08-06T13:30:00+02:00"},
  {id:"person.identity.separation",subject:"Mike und Shadow Grown",statement:"Mike und Shadow Grown dürfen von RHIA nicht automatisch als dieselbe Person behandelt werden.",status:"confirmed",confirmedBy:"Mike",confirmedAt:"2026-08-06T13:30:00+02:00"},
  {id:"organization.rh-produktion",subject:"RH Produktion",statement:"RH Produktion ist ein Unternehmen. Die genaue offizielle Rollen- und Leistungsbeschreibung wird noch gemeinsam festgelegt.",status:"confirmed",confirmedBy:"Mike",confirmedAt:"2026-08-06T13:30:00+02:00"},
  {id:"assistant.rhia.role",subject:"RHIA",statement:"RHIA bedeutet RH Intelligent Assistant und wird als persönliche digitale KI-Assistentin für Alltag, RH Produktion und kreative Projekte entwickelt.",status:"confirmed",confirmedBy:"Mike",confirmedAt:"2026-08-06T13:30:00+02:00"}
]};
const ALLOWED_ORIGINS=new Set(["https://ggrlak-04872.github.io","https://rhia.pages.dev"]);
function cors(request){const origin=request?.headers?.get("origin")||"";return{...(ALLOWED_ORIGINS.has(origin)?{"access-control-allow-origin":origin}:{}),"access-control-allow-methods":"GET, POST, OPTIONS","access-control-allow-headers":"content-type,x-rhia-owner-token","vary":"Origin"}}
const json=(data,status=200,request)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...cors(request)}});
const clean=(value,max)=>String(value??"").trim().replace(/\s+/g," ").slice(0,max);
export async function readKnowledge(env){
  if(!env?.RHIA_KNOWLEDGE?.get)return SEED;
  return await env.RHIA_KNOWLEDGE.get("core","json")||SEED;
}
export async function onRequestGet({request,env}){
  try{return json({ok:true,knowledge:await readKnowledge(env)},200,request)}
  catch(error){console.error("RHIA knowledge read error",error);return json({ok:false,error:"Das zentrale Gedächtnis ist gerade nicht erreichbar."},503,request)}
}
export async function onRequestPost({request,env}){
  if(!env?.RHIA_KNOWLEDGE?.put)return json({ok:false,error:"Der zentrale Speicher ist noch nicht verbunden.",code:"KNOWLEDGE_NOT_CONFIGURED"},503,request);
  const supplied=request.headers.get("x-rhia-owner-token")||"";
  if(!env.RHIA_OWNER_TOKEN||supplied!==env.RHIA_OWNER_TOKEN)return json({ok:false,error:"Die Besitzerfreigabe fehlt oder ist ungültig.",code:"OWNER_AUTH_REQUIRED"},401,request);
  let body;try{body=await request.json()}catch{return json({ok:false,error:"Ungültige Anfrage."},400,request)}
  const statement=clean(body?.statement,700),subject=clean(body?.subject,100)||"Allgemein";
  if(statement.length<3)return json({ok:false,error:"Die Information ist zu kurz."},400,request);
  const current=await readKnowledge(env),facts=Array.isArray(current?.facts)?current.facts:[];
  const now=new Date().toISOString(),id=clean(body?.id,120)||`learned.${Date.now()}`;
  const fact={id,subject,statement,status:"confirmed",confirmedBy:"Mike",confirmedAt:now};
  const nextFacts=[...facts.filter(item=>item?.id!==id),fact];
  const next={schemaVersion:1,updatedAt:now,facts:nextFacts.slice(-500)};
  await env.RHIA_KNOWLEDGE.put("core",JSON.stringify(next));
  return json({ok:true,fact,knowledgeUpdatedAt:now},201,request);
}
export function onRequestOptions({request}){return new Response(null,{status:204,headers:cors(request)})}
