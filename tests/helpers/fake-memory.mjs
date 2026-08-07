import{memoryFactFingerprint,prepareMigrationManifest}from"../../shared/memory-contract.js";

const clone=value=>structuredClone(value);

export class FakeMemoryStub{
  constructor({storeId="rhia-memory:test",fail=false}={}){
    this.fail=fail;this.snapshot={storeId,schemaVersion:1,revision:0,updatedAt:null,facts:[],tombstones:[]};this.imports=new Map();
  }
  unavailable(){if(this.fail)throw new Error("simulated memory outage")}
  async read({includeTombstones=false}={}){this.unavailable();const value=clone(this.snapshot);if(!includeTombstones)delete value.tombstones;return value}
  async upsert({expectedRevision,fact}){
    this.unavailable();if(expectedRevision!==this.snapshot.revision)return{ok:false,status:409,code:"MEMORY_REVISION_CONFLICT",error:"Der zentrale Gedächtnisstand hat sich geändert.",expectedRevision,actualRevision:this.snapshot.revision};
    const fingerprint=await memoryFactFingerprint(fact.subject,fact.statement);
    if(this.snapshot.tombstones.some(item=>item.factId===fact.id||item.fingerprint===fingerprint))return{ok:false,status:409,code:"MEMORY_TOMBSTONED",error:"Gelöschter Fakt."};
    const revision=++this.snapshot.revision,now=new Date().toISOString(),stored={...fact,status:"confirmed",fingerprint,revision,confirmedBy:fact.confirmedBy||"Mike",confirmedAt:fact.confirmedAt||now};
    const index=this.snapshot.facts.findIndex(item=>item.id===stored.id);if(index>=0)this.snapshot.facts[index]=stored;else this.snapshot.facts.push(stored);
    this.snapshot.updatedAt=now;return{ok:true,status:index>=0?200:201,fact:clone(stored),snapshot:await this.read()};
  }
  async deleteFact({expectedRevision,id}){
    this.unavailable();if(expectedRevision!==this.snapshot.revision)return{ok:false,status:409,code:"MEMORY_REVISION_CONFLICT",error:"Konflikt",expectedRevision,actualRevision:this.snapshot.revision};
    const index=this.snapshot.facts.findIndex(item=>item.id===id);
    if(index<0){if(this.snapshot.tombstones.some(item=>item.factId===id))return{ok:true,status:200,deleted:{id,alreadyAbsent:true},snapshot:await this.read()};return{ok:false,status:404,code:"MEMORY_NOT_FOUND",error:"Nicht gefunden."}}
    const[fact]=this.snapshot.facts.splice(index,1),revision=++this.snapshot.revision,now=new Date().toISOString();this.snapshot.updatedAt=now;
    this.snapshot.tombstones.push({factId:id,fingerprint:fact.fingerprint,subject:fact.subject,statement:fact.statement,deletedAt:now,reason:"confirmed-deletion",revision});
    return{ok:true,status:200,deleted:{id,subject:fact.subject,tombstoneRevision:revision},snapshot:await this.read()};
  }
  async previewMigration(input){
    this.unavailable();const manifest=await prepareMigrationManifest(input),existing=this.imports.get(manifest.sourceId)||null;
    const conflicts=[];for(const fact of manifest.facts){const byId=this.snapshot.facts.find(item=>item.id===fact.id);if(byId&&byId.fingerprint!==fact.fingerprint)conflicts.push({id:fact.id,code:"FACT_ID_CONFLICT"});const byFingerprint=this.snapshot.facts.find(item=>item.fingerprint===fact.fingerprint&&item.id!==fact.id);if(byFingerprint)conflicts.push({id:fact.id,existingId:byFingerprint.id,code:"FACT_FINGERPRINT_CONFLICT"})}
    return{ok:!conflicts.length,status:conflicts.length?409:200,storeId:this.snapshot.storeId,revision:this.snapshot.revision,checksum:manifest.checksum,sourceId:manifest.sourceId,alreadyImported:Boolean(existing),existingImport:existing,empty:this.snapshot.revision===0&&this.snapshot.facts.length===0&&this.snapshot.tombstones.length===0,acceptedFacts:manifest.facts.length,tombstones:manifest.tombstones.length,skippedFacts:manifest.summary.skippedFacts,conflicts,manifest};
  }
  async importMigration({expectedRevision,confirmedChecksum,manifest:input}){
    this.unavailable();const preview=await this.previewMigration(input),manifest=preview.manifest;
    if(!preview.ok)return{ok:false,status:preview.status||409,code:"MIGRATION_FACT_CONFLICT",error:"Die Migration würde vorhandene Fakten unbemerkt überschreiben.",conflicts:clone(preview.conflicts)};
    if(expectedRevision!==this.snapshot.revision)return{ok:false,status:409,code:"MEMORY_REVISION_CONFLICT",error:"Konflikt",expectedRevision,actualRevision:this.snapshot.revision};
    if(confirmedChecksum!==manifest.checksum)return{ok:false,status:409,code:"MIGRATION_CHECKSUM_MISMATCH",error:"Prüfsumme falsch."};
    const existing=this.imports.get(manifest.sourceId);if(existing){if(existing.checksum!==manifest.checksum)return{ok:false,status:409,code:"MIGRATION_SOURCE_CONFLICT",error:"Quelle kollidiert."};return{ok:true,status:200,alreadyImported:true,importRecord:clone(existing),snapshot:await this.read({includeTombstones:true})}}
    if(manifest.requireEmpty&&this.snapshot.revision!==0)return{ok:false,status:409,code:"MIGRATION_STORE_NOT_EMPTY",error:"Nicht leer."};
    const revision=++this.snapshot.revision,now=new Date().toISOString();
    for(const tombstone of manifest.tombstones){this.snapshot.facts=this.snapshot.facts.filter(fact=>fact.id!==tombstone.factId&&fact.fingerprint!==tombstone.fingerprint);this.snapshot.tombstones.push({...tombstone,revision})}
    let factCount=0;for(const fact of manifest.facts){if(this.snapshot.tombstones.some(item=>item.factId===fact.id||item.fingerprint===fact.fingerprint))continue;if(this.snapshot.facts.some(item=>item.id===fact.id||item.fingerprint===fact.fingerprint))continue;this.snapshot.facts.push({...fact,revision});factCount++}
    this.snapshot.updatedAt=now;const record={sourceId:manifest.sourceId,sourceType:manifest.sourceType,checksum:manifest.checksum,importedAt:now,revision,factCount,tombstoneCount:manifest.tombstones.length};this.imports.set(manifest.sourceId,record);
    return{ok:true,status:201,importRecord:clone(record),snapshot:await this.read({includeTombstones:true})};
  }
  async migrationStatus(sourceId){this.unavailable();return{ok:true,storeId:this.snapshot.storeId,revision:this.snapshot.revision,record:clone(this.imports.get(sourceId)||null)}}
}

export class FakeMemoryNamespace{
  constructor(stub=new FakeMemoryStub()){this.stub=stub;this.names=[]}
  getByName(name){this.names.push(name);return this.stub}
}
