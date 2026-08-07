import{DurableObject}from"cloudflare:workers";
import{
  MAX_MEMORY_FACTS,
  MEMORY_SCHEMA_VERSION,
  normalizeMemoryFact,
  normalizeMemoryTombstone,
  prepareMigrationManifest,
  validExpectedRevision
}from"../../shared/memory-contract.js";

const asRows=cursor=>cursor.toArray();
const first=cursor=>asRows(cursor)[0]||null;

function conflict(expected,actual){
  return{ok:false,status:409,code:"MEMORY_REVISION_CONFLICT",error:"Der zentrale Gedächtnisstand hat sich geändert.",expectedRevision:expected,actualRevision:actual};
}

function rowFact(row){
  return{
    id:row.id,subject:row.subject,statement:row.statement,status:row.status,
    confirmedBy:row.confirmed_by,confirmedAt:row.confirmed_at,
    fingerprint:row.fingerprint,revision:Number(row.updated_revision)
  };
}

function rowTombstone(row){
  return{
    factId:row.fact_id,fingerprint:row.fingerprint||"",subject:row.subject||"",
    statement:row.statement||"",deletedAt:row.deleted_at,reason:row.reason,
    revision:Number(row.revision)
  };
}

export class RhiaMemoryStore extends DurableObject{
  constructor(ctx,env){
    super(ctx,env);this.env=env;this.sql=ctx.storage.sql;
    const instanceId=String(ctx.id);
    ctx.blockConcurrencyWhile(async()=>{
      this.sql.exec(`
        CREATE TABLE IF NOT EXISTS meta(
          singleton INTEGER PRIMARY KEY CHECK(singleton=1),
          store_id TEXT NOT NULL,
          schema_version INTEGER NOT NULL,
          revision INTEGER NOT NULL,
          updated_at TEXT
        );
        CREATE TABLE IF NOT EXISTS facts(
          id TEXT PRIMARY KEY,
          subject TEXT NOT NULL,
          statement TEXT NOT NULL,
          status TEXT NOT NULL,
          confirmed_by TEXT NOT NULL,
          confirmed_at TEXT NOT NULL,
          fingerprint TEXT NOT NULL,
          updated_revision INTEGER NOT NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS facts_fingerprint_idx ON facts(fingerprint);
        CREATE TABLE IF NOT EXISTS tombstones(
          fact_id TEXT PRIMARY KEY,
          fingerprint TEXT,
          subject TEXT,
          statement TEXT,
          deleted_at TEXT NOT NULL,
          reason TEXT NOT NULL,
          revision INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS tombstones_fingerprint_idx ON tombstones(fingerprint);
        CREATE TABLE IF NOT EXISTS changes(
          revision INTEGER PRIMARY KEY,
          operation TEXT NOT NULL,
          fact_id TEXT,
          changed_at TEXT NOT NULL,
          payload_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS imports(
          source_id TEXT PRIMARY KEY,
          source_type TEXT NOT NULL,
          checksum TEXT NOT NULL,
          imported_at TEXT NOT NULL,
          revision INTEGER NOT NULL,
          fact_count INTEGER NOT NULL,
          tombstone_count INTEGER NOT NULL
        );
      `);
      this.sql.exec(
        "INSERT OR IGNORE INTO meta(singleton,store_id,schema_version,revision,updated_at) VALUES(1,?,?,0,NULL)",
        `rhia-memory:${instanceId}`,MEMORY_SCHEMA_VERSION
      );
    });
  }

  meta(){
    const row=first(this.sql.exec("SELECT store_id,schema_version,revision,updated_at FROM meta WHERE singleton=1"));
    if(!row)throw new Error("MEMORY_META_MISSING");
    return{storeId:row.store_id,schemaVersion:Number(row.schema_version),revision:Number(row.revision),updatedAt:row.updated_at||null};
  }

  snapshotSync({includeTombstones=false}={}){
    const meta=this.meta();
    const facts=asRows(this.sql.exec("SELECT id,subject,statement,status,confirmed_by,confirmed_at,fingerprint,updated_revision FROM facts ORDER BY confirmed_at,id")).map(rowFact);
    const snapshot={...meta,facts};
    if(includeTombstones)snapshot.tombstones=asRows(this.sql.exec("SELECT fact_id,fingerprint,subject,statement,deleted_at,reason,revision FROM tombstones ORDER BY revision,fact_id")).map(rowTombstone);
    return snapshot;
  }

  async read(options={}){return this.snapshotSync(options)}

  async upsert(input){
    if(!validExpectedRevision(input?.expectedRevision))return{ok:false,status:400,code:"EXPECTED_REVISION_REQUIRED",error:"Die erwartete Revision fehlt."};
    const now=new Date().toISOString();
    let fact;try{fact=await normalizeMemoryFact(input?.fact,{now})}catch(error){return{ok:false,status:400,code:error.code||"MEMORY_INVALID",error:error.message}}
    return this.ctx.storage.transactionSync(()=>{
      const meta=this.meta();if(meta.revision!==input.expectedRevision)return conflict(input.expectedRevision,meta.revision);
      const tombstone=first(this.sql.exec("SELECT fact_id FROM tombstones WHERE fact_id=? OR fingerprint=? LIMIT 1",fact.id,fact.fingerprint));
      if(tombstone)return{ok:false,status:409,code:"MEMORY_TOMBSTONED",error:"Der bestätigte gelöschte Eintrag kann nicht unbemerkt wiederhergestellt werden.",revision:meta.revision};
      const fingerprintOwner=first(this.sql.exec("SELECT id FROM facts WHERE fingerprint=? AND id<>? LIMIT 1",fact.fingerprint,fact.id));
      if(fingerprintOwner)return{ok:false,status:409,code:"MEMORY_DUPLICATE_FACT",error:"Dieser bestätigte Inhalt ist bereits unter einer anderen Kennung gespeichert.",revision:meta.revision,existingId:fingerprintOwner.id};
      const exists=first(this.sql.exec("SELECT id FROM facts WHERE id=?",fact.id));
      if(!exists){
        const count=Number(first(this.sql.exec("SELECT COUNT(*) AS count FROM facts"))?.count||0);
        if(count>=MAX_MEMORY_FACTS)return{ok:false,status:409,code:"MEMORY_LIMIT_EXCEEDED",error:"Das zentrale Gedächtnis hat seine aktuelle Kapazitätsgrenze erreicht.",revision:meta.revision};
      }
      const nextRevision=meta.revision+1;
      this.sql.exec(`INSERT INTO facts(id,subject,statement,status,confirmed_by,confirmed_at,fingerprint,updated_revision)
        VALUES(?,?,?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET subject=excluded.subject,statement=excluded.statement,status=excluded.status,
        confirmed_by=excluded.confirmed_by,confirmed_at=excluded.confirmed_at,fingerprint=excluded.fingerprint,updated_revision=excluded.updated_revision`,
        fact.id,fact.subject,fact.statement,fact.status,fact.confirmedBy,fact.confirmedAt,fact.fingerprint,nextRevision);
      this.sql.exec("INSERT INTO changes(revision,operation,fact_id,changed_at,payload_json) VALUES(?,?,?,?,?)",nextRevision,exists?"update":"create",fact.id,now,JSON.stringify(fact));
      this.sql.exec("UPDATE meta SET revision=?,updated_at=? WHERE singleton=1",nextRevision,now);
      return{ok:true,status:exists?200:201,fact:{...fact,revision:nextRevision},snapshot:this.snapshotSync()};
    });
  }

  async deleteFact(input){
    if(!validExpectedRevision(input?.expectedRevision))return{ok:false,status:400,code:"EXPECTED_REVISION_REQUIRED",error:"Die erwartete Revision fehlt."};
    const id=String(input?.id||"").trim().slice(0,120);
    if(!id)return{ok:false,status:400,code:"MEMORY_ID_REQUIRED",error:"Es wurde kein Gedächtniseintrag angegeben."};
    const now=new Date().toISOString();
    return this.ctx.storage.transactionSync(()=>{
      const meta=this.meta();if(meta.revision!==input.expectedRevision)return conflict(input.expectedRevision,meta.revision);
      const row=first(this.sql.exec("SELECT id,subject,statement,status,confirmed_by,confirmed_at,fingerprint,updated_revision FROM facts WHERE id=?",id));
      if(!row){
        const existing=first(this.sql.exec("SELECT fact_id FROM tombstones WHERE fact_id=?",id));
        if(existing)return{ok:true,status:200,deleted:{id,alreadyAbsent:true},snapshot:this.snapshotSync()};
        return{ok:false,status:404,code:"MEMORY_NOT_FOUND",error:"Der Gedächtniseintrag wurde nicht gefunden.",revision:meta.revision};
      }
      const fact=rowFact(row),nextRevision=meta.revision+1;
      this.sql.exec("DELETE FROM facts WHERE id=?",id);
      this.sql.exec(`INSERT INTO tombstones(fact_id,fingerprint,subject,statement,deleted_at,reason,revision)
        VALUES(?,?,?,?,?,?,?) ON CONFLICT(fact_id) DO UPDATE SET fingerprint=excluded.fingerprint,subject=excluded.subject,
        statement=excluded.statement,deleted_at=excluded.deleted_at,reason=excluded.reason,revision=excluded.revision`,
        id,fact.fingerprint,fact.subject,fact.statement,now,"confirmed-deletion",nextRevision);
      this.sql.exec("INSERT INTO changes(revision,operation,fact_id,changed_at,payload_json) VALUES(?,?,?,?,?)",nextRevision,"delete",id,now,JSON.stringify({id,fingerprint:fact.fingerprint}));
      this.sql.exec("UPDATE meta SET revision=?,updated_at=? WHERE singleton=1",nextRevision,now);
      return{ok:true,status:200,deleted:{id,subject:fact.subject,tombstoneRevision:nextRevision},snapshot:this.snapshotSync()};
    });
  }

  evaluateMigrationSync(manifest){
    const meta=this.meta();
    const existingImport=first(this.sql.exec("SELECT source_id,checksum,revision FROM imports WHERE source_id=?",manifest.sourceId));
    const existingFacts=asRows(this.sql.exec("SELECT id,fingerprint FROM facts"));
    const existingTombstones=asRows(this.sql.exec("SELECT fact_id,fingerprint FROM tombstones"));
    const tombstoneIds=new Set([...existingTombstones.map(row=>row.fact_id),...manifest.tombstones.map(value=>value.factId)].filter(Boolean));
    const tombstoneFingerprints=new Set([...existingTombstones.map(row=>row.fingerprint),...manifest.tombstones.map(value=>value.fingerprint)].filter(Boolean));
    const conflicts=[];
    for(const fact of manifest.facts){
      const existing=existingFacts.find(row=>row.id===fact.id);
      if(existing&&existing.fingerprint!==fact.fingerprint)conflicts.push({id:fact.id,code:"FACT_ID_CONFLICT"});
    }
    const acceptedFacts=manifest.facts.filter(fact=>!tombstoneIds.has(fact.id)&&!tombstoneFingerprints.has(fact.fingerprint));
    return{
      ok:!conflicts.length,
      storeId:meta.storeId,revision:meta.revision,checksum:manifest.checksum,sourceId:manifest.sourceId,
      alreadyImported:Boolean(existingImport),existingImport,
      requireEmpty:manifest.requireEmpty,empty:existingFacts.length===0&&existingTombstones.length===0&&meta.revision===0,
      acceptedFacts:acceptedFacts.length,tombstones:manifest.tombstones.length,
      skippedFacts:manifest.facts.filter(fact=>!acceptedFacts.includes(fact)).map(fact=>({id:fact.id,reason:"tombstoned"})),
      conflicts
    };
  }

  async previewMigration(input){
    let manifest;try{manifest=await prepareMigrationManifest(input)}catch(error){return{ok:false,status:400,code:error.code||"MIGRATION_INVALID",error:error.message}}
    const plan=this.evaluateMigrationSync(manifest);
    return{...plan,status:plan.ok?200:409,manifest};
  }

  async importMigration(input){
    if(!validExpectedRevision(input?.expectedRevision))return{ok:false,status:400,code:"EXPECTED_REVISION_REQUIRED",error:"Die erwartete Revision fehlt."};
    let manifest;try{manifest=await prepareMigrationManifest(input?.manifest)}catch(error){return{ok:false,status:400,code:error.code||"MIGRATION_INVALID",error:error.message}}
    if(String(input?.confirmedChecksum||"")!==manifest.checksum)return{ok:false,status:409,code:"MIGRATION_CHECKSUM_MISMATCH",error:"Die bestätigte Prüfsumme stimmt nicht mit der Migrationsvorschau überein."};
    const now=new Date().toISOString();
    return this.ctx.storage.transactionSync(()=>{
      const meta=this.meta();if(meta.revision!==input.expectedRevision)return conflict(input.expectedRevision,meta.revision);
      const plan=this.evaluateMigrationSync(manifest);
      if(plan.alreadyImported){
        if(plan.existingImport.checksum===manifest.checksum)return{ok:true,status:200,alreadyImported:true,importRecord:plan.existingImport,snapshot:this.snapshotSync({includeTombstones:true})};
        return{ok:false,status:409,code:"MIGRATION_SOURCE_CONFLICT",error:"Diese Quellenkennung wurde bereits mit anderem Inhalt importiert."};
      }
      if(manifest.requireEmpty&&!plan.empty)return{ok:false,status:409,code:"MIGRATION_STORE_NOT_EMPTY",error:"Die Erst-Migration ist nur in einen leeren Speicher erlaubt.",revision:meta.revision};
      if(plan.conflicts.length)return{ok:false,status:409,code:"MIGRATION_FACT_CONFLICT",error:"Die Migration würde vorhandene Fakten unbemerkt überschreiben.",conflicts:plan.conflicts,revision:meta.revision};
      const nextRevision=meta.revision+1;
      for(const tombstone of manifest.tombstones){
        if(tombstone.factId)this.sql.exec("DELETE FROM facts WHERE id=?",tombstone.factId);
        if(tombstone.fingerprint)this.sql.exec("DELETE FROM facts WHERE fingerprint=?",tombstone.fingerprint);
        const factId=tombstone.factId||`fingerprint:${tombstone.fingerprint}`;
        this.sql.exec(`INSERT INTO tombstones(fact_id,fingerprint,subject,statement,deleted_at,reason,revision)
          VALUES(?,?,?,?,?,?,?) ON CONFLICT(fact_id) DO UPDATE SET fingerprint=excluded.fingerprint,subject=excluded.subject,
          statement=excluded.statement,deleted_at=excluded.deleted_at,reason=excluded.reason,revision=excluded.revision`,
          factId,tombstone.fingerprint||null,tombstone.subject||null,tombstone.statement||null,tombstone.deletedAt,tombstone.reason,nextRevision);
      }
      const currentTombstoneIds=new Set(asRows(this.sql.exec("SELECT fact_id FROM tombstones")).map(row=>row.fact_id));
      const currentTombstoneFingerprints=new Set(asRows(this.sql.exec("SELECT fingerprint FROM tombstones WHERE fingerprint IS NOT NULL")).map(row=>row.fingerprint));
      let importedFacts=0;
      for(const fact of manifest.facts){
        if(currentTombstoneIds.has(fact.id)||currentTombstoneFingerprints.has(fact.fingerprint))continue;
        const duplicate=first(this.sql.exec("SELECT id,fingerprint FROM facts WHERE id=? OR fingerprint=? LIMIT 1",fact.id,fact.fingerprint));
        if(duplicate)continue;
        const count=Number(first(this.sql.exec("SELECT COUNT(*) AS count FROM facts"))?.count||0);
        if(count>=MAX_MEMORY_FACTS)throw Object.assign(new Error("MEMORY_LIMIT_EXCEEDED"),{code:"MEMORY_LIMIT_EXCEEDED"});
        this.sql.exec("INSERT INTO facts(id,subject,statement,status,confirmed_by,confirmed_at,fingerprint,updated_revision) VALUES(?,?,?,?,?,?,?,?)",fact.id,fact.subject,fact.statement,fact.status,fact.confirmedBy,fact.confirmedAt,fact.fingerprint,nextRevision);
        importedFacts++;
      }
      this.sql.exec("INSERT INTO imports(source_id,source_type,checksum,imported_at,revision,fact_count,tombstone_count) VALUES(?,?,?,?,?,?,?)",manifest.sourceId,manifest.sourceType,manifest.checksum,now,nextRevision,importedFacts,manifest.tombstones.length);
      this.sql.exec("INSERT INTO changes(revision,operation,fact_id,changed_at,payload_json) VALUES(?,?,?,?,?)",nextRevision,"migration",null,now,JSON.stringify({sourceId:manifest.sourceId,checksum:manifest.checksum,factCount:importedFacts,tombstoneCount:manifest.tombstones.length}));
      this.sql.exec("UPDATE meta SET revision=?,updated_at=? WHERE singleton=1",nextRevision,now);
      return{ok:true,status:201,importRecord:{sourceId:manifest.sourceId,checksum:manifest.checksum,revision:nextRevision,factCount:importedFacts,tombstoneCount:manifest.tombstones.length},snapshot:this.snapshotSync({includeTombstones:true})};
    });
  }

  async migrationStatus(sourceId){
    const id=String(sourceId||"").trim().slice(0,160);
    const record=id?first(this.sql.exec("SELECT source_id,source_type,checksum,imported_at,revision,fact_count,tombstone_count FROM imports WHERE source_id=?",id)):null;
    return{ok:true,storeId:this.meta().storeId,revision:this.meta().revision,record:record?{sourceId:record.source_id,sourceType:record.source_type,checksum:record.checksum,importedAt:record.imported_at,revision:Number(record.revision),factCount:Number(record.fact_count),tombstoneCount:Number(record.tombstone_count)}:null};
  }

  async testAtomicRollback(expectedRevision){
    if(this.env?.RHIA_TEST_MODE!=="true")return{ok:false,status:404,code:"NOT_FOUND"};
    try{
      this.ctx.storage.transactionSync(()=>{
        const meta=this.meta();if(meta.revision!==expectedRevision)throw new Error("REVISION_MISMATCH");
        const nextRevision=meta.revision+1,now=new Date().toISOString();
        this.sql.exec("INSERT INTO facts(id,subject,statement,status,confirmed_by,confirmed_at,fingerprint,updated_revision) VALUES(?,?,?,?,?,?,?,?)","test.rollback","Test","Darf niemals bestehen","confirmed","Test",now,"rollback-fingerprint",nextRevision);
        this.sql.exec("UPDATE meta SET revision=?,updated_at=? WHERE singleton=1",nextRevision,now);
        throw new Error("INTENTIONAL_ROLLBACK");
      });
    }catch(error){if(error.message!=="INTENTIONAL_ROLLBACK")throw error}
    return{ok:true,snapshot:this.snapshotSync({includeTombstones:true})};
  }
}

export default{
  fetch(){return Response.json({ok:true,service:"rhia-memory-store",publicData:false},{headers:{"cache-control":"no-store"}})}
};
