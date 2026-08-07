export const MEMORY_SCHEMA_VERSION=1;
export const MEMORY_STORE_NAME="rhia-primary-memory-v1";
export const MAX_MEMORY_FACTS=500;

const textEncoder=new TextEncoder();

export function cleanMemoryText(value,max=700){
  return String(value??"").trim().replace(/\s+/g," ").slice(0,max);
}

export function normalizedMemoryText(value){
  return cleanMemoryText(value,1200)
    .toLocaleLowerCase("de-DE")
    .replace(/[.,!?;:„“\"'()]/g," ")
    .replace(/\s+/g," ")
    .trim();
}

export function canonicalJson(value){
  if(Array.isArray(value))return`[${value.map(canonicalJson).join(",")}]`;
  if(value&&typeof value==="object"){
    return`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function sha256Hex(value){
  const bytes=typeof value==="string"?textEncoder.encode(value):value;
  const digest=await crypto.subtle.digest("SHA-256",bytes);
  return[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,"0")).join("");
}

export async function memoryFactFingerprint(subject,statement){
  return sha256Hex(`${normalizedMemoryText(subject)}\n${normalizedMemoryText(statement)}`);
}

function validIso(value,fallback){
  const text=String(value||"").trim();
  return text&&!Number.isNaN(Date.parse(text))?new Date(text).toISOString():fallback;
}

export async function normalizeMemoryFact(value,{now=new Date().toISOString(),defaultConfirmedBy="Mike"}={}){
  const id=cleanMemoryText(value?.id,120);
  const subject=cleanMemoryText(value?.subject,100)||"Allgemein";
  const statement=cleanMemoryText(value?.statement??value?.text??value?.content,700);
  if(!id)throw Object.assign(new Error("Jeder Gedächtniseintrag benötigt eine Kennung."),{code:"MEMORY_ID_REQUIRED"});
  if(statement.length<3)throw Object.assign(new Error("Die Information ist zu kurz."),{code:"STATEMENT_TOO_SHORT"});
  return{
    id,
    subject,
    statement,
    status:"confirmed",
    confirmedBy:cleanMemoryText(value?.confirmedBy,80)||defaultConfirmedBy,
    confirmedAt:validIso(value?.confirmedAt,now),
    fingerprint:await memoryFactFingerprint(subject,statement)
  };
}

export async function normalizeMemoryTombstone(value,{now=new Date().toISOString()}={}){
  const factId=cleanMemoryText(value?.factId??value?.id,120);
  const subject=cleanMemoryText(value?.subject,100);
  const statement=cleanMemoryText(value?.statement??value?.text,700);
  const suppliedFingerprint=cleanMemoryText(value?.fingerprint,64).toLowerCase();
  const fingerprint=/^[a-f0-9]{64}$/.test(suppliedFingerprint)
    ?suppliedFingerprint
    :(statement?await memoryFactFingerprint(subject||"Allgemein",statement):"");
  if(!factId&&!fingerprint)throw Object.assign(new Error("Eine Löschmarkierung benötigt eine Kennung oder einen Fingerabdruck."),{code:"TOMBSTONE_TARGET_REQUIRED"});
  return{
    factId,
    fingerprint,
    subject,
    statement,
    deletedAt:validIso(value?.deletedAt,now),
    reason:cleanMemoryText(value?.reason,240)||"confirmed-deletion"
  };
}

function uniqueOrThrow(values,key){
  const result=[],seen=new Map();
  for(const value of values){
    const id=key(value),serialized=canonicalJson(value);
    if(seen.has(id)){
      if(seen.get(id)!==serialized)throw Object.assign(new Error(`Die Migrationsquelle enthält widersprüchliche Duplikate für ${id}.`),{code:"MIGRATION_DUPLICATE_CONFLICT"});
      continue;
    }
    seen.set(id,serialized);result.push(value);
  }
  return result;
}

export async function prepareMigrationManifest(input,{now=new Date().toISOString()}={}){
  const sourceId=cleanMemoryText(input?.sourceId,160);
  if(!sourceId)throw Object.assign(new Error("Die Migration benötigt eine eindeutige Quellenkennung."),{code:"MIGRATION_SOURCE_REQUIRED"});
  const rawFacts=Array.isArray(input?.facts)?input.facts:[];
  const rawTombstones=Array.isArray(input?.tombstones)?input.tombstones:[];
  if(rawFacts.length>MAX_MEMORY_FACTS)throw Object.assign(new Error("Die Migration enthält zu viele Fakten."),{code:"MEMORY_LIMIT_EXCEEDED"});
  const facts=uniqueOrThrow(await Promise.all(rawFacts.map(value=>normalizeMemoryFact(value,{now}))),value=>value.id);
  const tombstones=uniqueOrThrow(await Promise.all(rawTombstones.map(value=>normalizeMemoryTombstone(value,{now}))),value=>value.factId||value.fingerprint);
  const deletedIds=new Set(tombstones.map(value=>value.factId).filter(Boolean));
  const deletedFingerprints=new Set(tombstones.map(value=>value.fingerprint).filter(Boolean));
  const activeFacts=facts.filter(value=>!deletedIds.has(value.id)&&!deletedFingerprints.has(value.fingerprint));
  const skippedFacts=facts.filter(value=>!activeFacts.includes(value)).map(value=>({id:value.id,fingerprint:value.fingerprint,reason:"tombstoned"}));
  const normalized={
    sourceId,
    sourceType:cleanMemoryText(input?.sourceType,80)||"manual-export",
    sourceUpdatedAt:validIso(input?.sourceUpdatedAt,null),
    requireEmpty:Boolean(input?.requireEmpty),
    facts:activeFacts,
    tombstones
  };
  const checksum=await sha256Hex(canonicalJson(normalized));
  return{...normalized,checksum,summary:{facts:activeFacts.length,tombstones:tombstones.length,skippedFacts}};
}

export function validExpectedRevision(value){
  return Number.isSafeInteger(value)&&value>=0;
}
