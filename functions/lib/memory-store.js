import{MEMORY_STORE_NAME,validExpectedRevision}from"../../shared/memory-contract.js";

export class MemoryStoreError extends Error{
  constructor(message,{code="MEMORY_STORE_FAILED",status=503,details=null}={}){super(message);this.name="MemoryStoreError";this.code=code;this.status=status;this.details=details}
}

export function memoryStoreConfigured(env){
  const binding=env?.RHIA_MEMORY;
  return Boolean(binding&&(typeof binding.getByName==="function"||(typeof binding.idFromName==="function"&&typeof binding.get==="function")));
}

function stubFor(env){
  if(!memoryStoreConfigured(env))throw new MemoryStoreError("Der stark konsistente zentrale Speicher ist noch nicht verbunden.",{code:"MEMORY_STORE_NOT_CONFIGURED",status:503});
  const binding=env.RHIA_MEMORY;
  return typeof binding.getByName==="function"?binding.getByName(MEMORY_STORE_NAME):binding.get(binding.idFromName(MEMORY_STORE_NAME));
}

function validSnapshot(value){
  return Boolean(value&&typeof value.storeId==="string"&&value.storeId&&validExpectedRevision(value.revision)&&Array.isArray(value.facts));
}

function ensureSnapshot(value){
  if(!validSnapshot(value))throw new MemoryStoreError("Der zentrale Speicher hat einen ungültigen Stand geliefert.",{code:"MEMORY_INVALID_RESPONSE",status:503});
  return value;
}

function resultOrThrow(result){
  if(result?.ok)return result;
  throw new MemoryStoreError(result?.error||"Der zentrale Speicher konnte die Änderung nicht ausführen.",{code:result?.code||"MEMORY_STORE_FAILED",status:Number(result?.status)||503,details:result});
}

async function callStore(env,method,...args){
  const stub=stubFor(env);
  if(typeof stub?.[method]!=="function")throw new MemoryStoreError("Die zentrale Speicherbindung unterstützt den erforderlichen Vorgang nicht.",{code:"MEMORY_BINDING_INVALID",status:503});
  try{return await stub[method](...args)}catch(error){
    if(error instanceof MemoryStoreError)throw error;
    console.error("RHIA memory store call failed",{method,code:error?.code||"MEMORY_RPC_FAILED"});
    throw new MemoryStoreError("Das zentrale Gedächtnis ist gerade nicht erreichbar.",{code:"MEMORY_STORE_UNAVAILABLE",status:503});
  }
}

export async function readCentralMemory(env,options={}){return ensureSnapshot(await callStore(env,"read",options))}
export async function writeCentralMemory(env,{expectedRevision,fact}){
  const result=resultOrThrow(await callStore(env,"upsert",{expectedRevision,fact}));result.snapshot=ensureSnapshot(result.snapshot);return result;
}
export async function deleteCentralMemory(env,{expectedRevision,id}){
  const result=resultOrThrow(await callStore(env,"deleteFact",{expectedRevision,id}));result.snapshot=ensureSnapshot(result.snapshot);return result;
}
export async function previewCentralMigration(env,manifest){return resultOrThrow(await callStore(env,"previewMigration",manifest))}
export async function importCentralMigration(env,{expectedRevision,confirmedChecksum,manifest}){
  const result=resultOrThrow(await callStore(env,"importMigration",{expectedRevision,confirmedChecksum,manifest}));result.snapshot=ensureSnapshot(result.snapshot);return result;
}
export async function centralMigrationStatus(env,sourceId){return resultOrThrow(await callStore(env,"migrationStatus",sourceId))}
