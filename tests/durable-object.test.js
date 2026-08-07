import{env}from"cloudflare:workers";
import{runInDurableObject}from"cloudflare:test";
import{beforeEach,describe,expect,it}from"vitest";

let stub;
beforeEach(()=>{stub=env.RHIA_MEMORY.getByName(`test-${crypto.randomUUID()}`)});

function fact(id,statement=`Aussage ${id}`){return{id,subject:"Test",statement,confirmedBy:"Mike",confirmedAt:"2026-08-07T10:00:00.000Z"}}

describe("SQLite-Durable-Object als einzige Gedächtnisquelle",()=>{
  it("initialisiert einen leeren, revisionsbasierten SQLite-Speicher",async()=>{
    const snapshot=await stub.read({includeTombstones:true});
    expect(snapshot.storeId).toMatch(/^rhia-memory:/);expect(snapshot.schemaVersion).toBe(1);expect(snapshot.revision).toBe(0);expect(snapshot.facts).toEqual([]);expect(snapshot.tombstones).toEqual([]);
    await runInDurableObject(stub,async(_instance,state)=>{
      const tables=state.storage.sql.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").toArray().map(row=>row.name);
      expect(tables).toEqual(expect.arrayContaining(["meta","facts","tombstones","changes","imports"]));
    });
  });

  it("vergibt bei gleichzeitigen Änderungen genau eine nächste Revision",async()=>{
    const results=await Promise.all([stub.upsert({expectedRevision:0,fact:fact("one")}),stub.upsert({expectedRevision:0,fact:fact("two")})]);
    expect(results.filter(result=>result.ok)).toHaveLength(1);expect(results.filter(result=>result.code==="MEMORY_REVISION_CONFLICT")).toHaveLength(1);
    const snapshot=await stub.read();expect(snapshot.revision).toBe(1);expect(snapshot.facts).toHaveLength(1);
  });

  it("weist denselben bestätigten Inhalt unter einer zweiten Kennung kontrolliert ab",async()=>{
    await stub.upsert({expectedRevision:0,fact:fact("first","Ein Inhalt darf nur einmal existieren")});
    const duplicate=await stub.upsert({expectedRevision:1,fact:fact("second","Ein Inhalt darf nur einmal existieren")});
    expect(duplicate.ok).toBe(false);expect(duplicate.code).toBe("MEMORY_DUPLICATE_FACT");expect(duplicate.existingId).toBe("first");
    const snapshot=await stub.read();expect(snapshot.revision).toBe(1);expect(snapshot.facts.map(item=>item.id)).toEqual(["first"]);
  });

  it("schreibt Fakt und Revision atomar und rollt einen absichtlichen Fehler vollständig zurück",async()=>{
    const written=await stub.upsert({expectedRevision:0,fact:fact("atomic")});expect(written.ok).toBe(true);expect(written.snapshot.revision).toBe(1);
    const rolledBack=await stub.testAtomicRollback(1);expect(rolledBack.ok).toBe(true);expect(rolledBack.snapshot.revision).toBe(1);expect(rolledBack.snapshot.facts.some(item=>item.id==="test.rollback")).toBe(false);
    await runInDurableObject(stub,async(_instance,state)=>{expect(state.storage.sql.exec("SELECT COUNT(*) AS count FROM changes").one().count).toBe(1)});
  });

  it("löscht Fakt und erzeugt Tombstone in derselben Revision",async()=>{
    await stub.upsert({expectedRevision:0,fact:fact("deleted","Mein Testcode ist Bordeaux 47")});
    const deleted=await stub.deleteFact({expectedRevision:1,id:"deleted"});expect(deleted.ok).toBe(true);expect(deleted.snapshot.revision).toBe(2);expect(deleted.snapshot.facts).toEqual([]);
    const full=await stub.read({includeTombstones:true});expect(full.tombstones).toHaveLength(1);expect(full.tombstones[0]).toMatchObject({factId:"deleted",statement:"Mein Testcode ist Bordeaux 47",revision:2});
    const resurrection=await stub.upsert({expectedRevision:2,fact:fact("deleted","Mein Testcode ist Bordeaux 47")});expect(resurrection.code).toBe("MEMORY_TOMBSTONED");expect((await stub.read()).revision).toBe(2);
    await runInDurableObject(stub,async(_instance,state)=>{const meta=state.storage.sql.exec("SELECT revision FROM meta WHERE singleton=1").one();const tomb=state.storage.sql.exec("SELECT revision FROM tombstones WHERE fact_id='deleted'").one();expect(meta.revision).toBe(tomb.revision)});
  });

  it("bestätigt eine wiederholte Löschung nur bei vorhandenem Tombstone",async()=>{
    await stub.upsert({expectedRevision:0,fact:fact("known")});await stub.deleteFact({expectedRevision:1,id:"known"});
    const repeated=await stub.deleteFact({expectedRevision:2,id:"known"});expect(repeated.ok).toBe(true);expect(repeated.deleted.alreadyAbsent).toBe(true);expect(repeated.snapshot.revision).toBe(2);
    const unknown=await stub.deleteFact({expectedRevision:2,id:"unknown"});expect(unknown.ok).toBe(false);expect(unknown.code).toBe("MEMORY_NOT_FOUND");
  });

  it("migriert nur nach Vorschau, Prüfsumme und erwarteter Revision",async()=>{
    const input={sourceId:"central-export",sourceType:"controlled-central-export",requireEmpty:true,facts:[fact("active"),fact("deleted","Mein Testcode ist Bordeaux 47")],tombstones:[{factId:"deleted",subject:"Test",statement:"Mein Testcode ist Bordeaux 47",reason:"confirmed-legacy-deletion"}]};
    const preview=await stub.previewMigration(input);expect(preview.ok).toBe(true);expect(preview.revision).toBe(0);expect(preview.manifest.summary.facts).toBe(1);expect((await stub.read()).revision).toBe(0);
    const wrong=await stub.importMigration({expectedRevision:0,confirmedChecksum:"0".repeat(64),manifest:preview.manifest});expect(wrong.code).toBe("MIGRATION_CHECKSUM_MISMATCH");expect((await stub.read()).revision).toBe(0);
    const imported=await stub.importMigration({expectedRevision:0,confirmedChecksum:preview.checksum,manifest:preview.manifest});expect(imported.ok).toBe(true);expect(imported.snapshot.revision).toBe(1);expect(imported.snapshot.facts.map(item=>item.id)).toEqual(["active"]);expect(imported.snapshot.tombstones.map(item=>item.factId)).toContain("deleted");
    const repeated=await stub.importMigration({expectedRevision:1,confirmedChecksum:preview.checksum,manifest:preview.manifest});expect(repeated.ok).toBe(true);expect(repeated.alreadyImported).toBe(true);expect(repeated.snapshot.revision).toBe(1);expect(repeated.importRecord).toMatchObject({sourceId:"central-export",revision:1,factCount:1,tombstoneCount:1});
    const status=await stub.migrationStatus("central-export");expect(status.record.checksum).toBe(preview.checksum);expect(status.revision).toBe(1);
  });

  it("verwirft widersprüchliche Duplikate bereits in der Migrationsvorschau",async()=>{
    const preview=await stub.previewMigration({sourceId:"duplicate-source",facts:[fact("same","Erste Fassung"),fact("same","Widersprüchliche Fassung")],tombstones:[]});
    expect(preview.ok).toBe(false);expect(preview.code).toBe("MIGRATION_DUPLICATE_CONFLICT");expect((await stub.read()).revision).toBe(0);
  });

  it("verwirft eine vorhandene Fingerabdruck-Kollision unter anderer ID vor dem Import",async()=>{
    await stub.upsert({expectedRevision:0,fact:fact("existing","Identischer bestätigter Inhalt")});
    const preview=await stub.previewMigration({sourceId:"fingerprint-conflict",facts:[fact("legacy-id","Identischer bestätigter Inhalt")],tombstones:[]});
    expect(preview.ok).toBe(false);expect(preview.status).toBe(409);expect(preview.conflicts).toContainEqual({id:"legacy-id",existingId:"existing",code:"FACT_FINGERPRINT_CONFLICT"});expect((await stub.read()).revision).toBe(1);
  });
});
