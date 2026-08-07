import assert from"node:assert/strict";
import{webcrypto}from"node:crypto";
import{readFile}from"node:fs/promises";
import test from"node:test";
import vm from"node:vm";

import{prepareMigrationManifest}from"../shared/memory-contract.js";

const LEGACY_KEYS={mutations:"rhia_knowledge_mutations_v1",memories:"rhia_memories_v011",chat:"rhia_chat_v04"},K={settings:"rhia_settings_v010"};

function storageWith(entries){
  const values=new Map(entries);
  return{values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
}

async function browserHarness(entries){
  const html=await readFile(new URL("../index.html",import.meta.url),"utf8"),script=html.match(/<script>([\s\S]*)<\/script>/)?.[1];assert.ok(script);
  const start=script.indexOf("function cleanLegacyText"),end=script.indexOf("function local");assert.ok(start>=0&&end>start);
  const storage=storageWith(entries),elements=new Map(),element=id=>{if(!elements.has(id))elements.set(id,{id,disabled:false,textContent:"",hidden:false});return elements.get(id)};
  let downloadedBlob=null;
  class FakeBlob{constructor(parts,options){this.parts=parts;this.options=options}}
  const context={
    localStorage:storage,LEGACY_KEYS,K,JSON,Date,Map,Uint8Array,TextEncoder,crypto:webcrypto,Blob:FakeBlob,
    URL:{createObjectURL:blob=>{downloadedBlob=blob;return"blob:test"},revokeObjectURL:()=>{}},
    document:{createElement:()=>({href:"",download:"",click:()=>{},remove:()=>{}}),body:{appendChild:()=>{}}},
    setTimeout:fn=>{if(typeof fn==="function")fn()},encodeURIComponent,$:element,
    knowledgeError:(message,code)=>Object.assign(new Error(message),{code}),pendingLegacyMigration:null,legacyChatExportProof:null,legacyChatDeleteArmed:false
  };
  vm.createContext(context);
  vm.runInContext(`${script.slice(start,end)};globalThis.browserApi={legacyMemoryInventory,verifyLegacyMigrationContent,clearVerifiedLegacyMemory,legacyChatSnapshot,exportLegacyChat,deleteExportedLegacyChat,chatProof:()=>legacyChatExportProof,chatArmed:()=>legacyChatDeleteArmed};`,context);
  return{api:context.browserApi,storage,elements,downloaded:()=>downloadedBlob};
}

function memoryEntries(){return[
  [LEGACY_KEYS.mutations,JSON.stringify([{type:"delete",id:"old.deleted",fact:{subject:"Test",statement:"Gelöschter Altsatz"}}])],
  [LEGACY_KEYS.memories,JSON.stringify([{id:"m1",text:"Alte Erinnerung",category:"Profil"}])],
  [LEGACY_KEYS.chat,JSON.stringify([{type:"user",text:"Erste Nachricht"},{type:"rhia",text:"Zweite Nachricht"}])],
  [K.settings,JSON.stringify({world:"RHIA",browserVoice:true,profile:{assistant:{name:"RHIA"},user:{name:"Mike",formalAddress:"Sir"},projects:["RHIA"]}})],
  ["rhia_tasks_v03","tasks"],["rhia_notes_v03","notes"],["rhia_ideas_v09","ideas"],["rhia_owner_token_v1","owner-secret"]
]}

async function normalizedScenario(harness){
  const inventory=await harness.api.legacyMemoryInventory(harness.storage),manifest=await prepareMigrationManifest(inventory.manifest,{now:"2026-08-07T12:00:00.000Z"});
  const knowledge={storeId:"preview-store",revision:1,facts:structuredClone(manifest.facts),tombstones:structuredClone(manifest.tombstones)};
  return{inventory,manifest,knowledge};
}

test("Browserbereinigung verlangt jeden Fakt, jede ID, jeden Fingerabdruck und jeden Tombstone",async()=>{
  const harness=await browserHarness(memoryEntries()),{inventory,manifest,knowledge}=await normalizedScenario(harness);
  const complete=await harness.api.verifyLegacyMigrationContent(manifest,knowledge);assert.equal(complete.ok,true);assert.equal(complete.factCount,manifest.facts.length);assert.equal(complete.tombstoneCount,manifest.tombstones.length);

  const missingFact=structuredClone(knowledge);missingFact.facts.shift();assert.equal((await harness.api.verifyLegacyMigrationContent(manifest,missingFact)).code,"MIGRATION_FACT_MISSING");
  const wrongFingerprint=structuredClone(knowledge);wrongFingerprint.facts[0].fingerprint="0".repeat(64);assert.equal((await harness.api.verifyLegacyMigrationContent(manifest,wrongFingerprint)).code,"MIGRATION_FACT_MISMATCH");
  const missingTombstone=structuredClone(knowledge);missingTombstone.tombstones=[];assert.equal((await harness.api.verifyLegacyMigrationContent(manifest,missingTombstone)).code,"MIGRATION_TOMBSTONE_MISSING");

  const pending={manifest,rawChecksum:inventory.rawChecksum,rawValues:inventory.rawValues};
  assert.equal(await harness.api.clearVerifiedLegacyMemory(harness.storage,pending,{metadataOk:true,content:complete}),true);
  assert.equal(harness.storage.values.has(LEGACY_KEYS.mutations),false);assert.equal(harness.storage.values.has(LEGACY_KEYS.memories),false);assert.equal(harness.storage.values.has(LEGACY_KEYS.chat),true);
  assert.equal(harness.storage.values.get("rhia_tasks_v03"),"tasks");assert.equal(harness.storage.values.get("rhia_notes_v03"),"notes");assert.equal(harness.storage.values.get("rhia_ideas_v09"),"ideas");assert.equal(harness.storage.values.get("rhia_owner_token_v1"),"owner-secret");
  assert.deepEqual(JSON.parse(harness.storage.values.get(K.settings)),{world:"RHIA",browserVoice:true});
});

test("Browseränderung nach der Vorschau verwirft den Beweis und löscht keinen Altwert",async()=>{
  const harness=await browserHarness(memoryEntries()),{inventory,manifest,knowledge}=await normalizedScenario(harness),content=await harness.api.verifyLegacyMigrationContent(manifest,knowledge);
  harness.storage.setItem(LEGACY_KEYS.memories,JSON.stringify([{id:"m2",text:"Erst nach der Vorschau hinzugefügt",category:"Neu"}]));
  const pending={manifest,rawChecksum:inventory.rawChecksum,rawValues:inventory.rawValues};
  assert.equal(await harness.api.clearVerifiedLegacyMemory(harness.storage,pending,{metadataOk:true,content}),false);
  assert.equal(harness.storage.values.has(LEGACY_KEYS.mutations),true);assert.equal(harness.storage.values.has(LEGACY_KEYS.memories),true);assert.equal(JSON.parse(harness.storage.values.get(K.settings)).profile.user.name,"Mike");
});

test("Chatlöschung ist an SHA-256, Anzahl und Reihenfolge gebunden und verlangt zwei getrennte Bestätigungen",async()=>{
  const harness=await browserHarness(memoryEntries());assert.equal(await harness.api.exportLegacyChat(harness.storage),true);
  const exported=JSON.parse(harness.downloaded().parts[0]);assert.equal(exported.count,2);assert.deepEqual(exported.entries.map(item=>item.text),["Erste Nachricht","Zweite Nachricht"]);assert.match(exported.checksum,/^[a-f0-9]{64}$/);
  assert.equal(await harness.api.deleteExportedLegacyChat(harness.storage),false);assert.equal(harness.api.chatArmed(),true);assert.equal(harness.storage.values.has(LEGACY_KEYS.chat),true);
  assert.equal(await harness.api.deleteExportedLegacyChat(harness.storage),true);assert.equal(harness.storage.values.has(LEGACY_KEYS.chat),false);
});

test("Chatänderung nach Export lässt den Exportstatus verfallen und verhindert die Löschung",async()=>{
  const harness=await browserHarness(memoryEntries());await harness.api.exportLegacyChat(harness.storage);
  const changed=JSON.parse(harness.storage.values.get(LEGACY_KEYS.chat));changed.reverse();harness.storage.setItem(LEGACY_KEYS.chat,JSON.stringify(changed));
  assert.equal(await harness.api.deleteExportedLegacyChat(harness.storage),false);assert.equal(harness.storage.values.has(LEGACY_KEYS.chat),true);assert.equal(harness.api.chatProof(),null);assert.equal(harness.elements.get("legacyChatDeleteBtn").disabled,true);assert.match(harness.elements.get("legacyMemoryStatus").textContent,/erneut exportieren/i);
});
