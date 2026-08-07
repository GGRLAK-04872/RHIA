import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

import {onRequestDelete,onRequestGet,onRequestOptions,onRequestPost} from "../functions/api/knowledge.js";
import {onRequestPost as onChatPost} from "../functions/api/chat.js";

const API="https://rhia.pages.dev/api/knowledge",ORIGIN="https://rhia.pages.dev";

class MemoryKV{
  constructor(){this.values=new Map()}
  async get(key,type){const value=this.values.get(key);if(value===undefined)return null;return type==="json"?JSON.parse(value):value}
  async put(key,value){this.values.set(key,String(value))}
}

class LaggingMemoryKV extends MemoryKV{
  constructor(){super();this.staleValue=null;this.staleReads=0}
  async get(key,type){
    if(this.staleReads>0&&this.staleValue!==null){this.staleReads--;return type==="json"?JSON.parse(this.staleValue):this.staleValue}
    return super.get(key,type);
  }
  async put(key,value){
    const previous=this.values.get(key);await super.put(key,value);
    if(previous!==undefined){this.staleValue=previous;this.staleReads=2}
  }
}

function browserKnowledgeOverlay(html,values=new Map()){
  const script=html.match(/<script>([\s\S]*)<\/script>/)?.[1];assert.ok(script);
  const start=script.indexOf('const VERSION='),end=script.indexOf('const MEMORY_CATEGORIES');assert.ok(start>=0&&end>start);
  const localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
  const context={localStorage,Date,JSON,console,setTimeout,clearTimeout};vm.createContext(context);
  vm.runInContext(script.slice(start,end)+"\n;globalThis.__overlay={recordKnowledgeMutation,applyKnowledgeMutations};",context);
  return{...context.__overlay,values};
}

function browserDeletionFlow(html,{initialKnowledge,refreshedKnowledge}){
  const script=html.match(/<script>([\s\S]*)<\/script>/)?.[1];assert.ok(script);
  const start=script.indexOf("function normalizedKnowledgeText"),end=script.indexOf("function isCentralExportCommand");assert.ok(start>=0&&end>start);
  const messages=[];
  const context={console};vm.createContext(context);
  vm.runInContext(`
    var centralKnowledge=${JSON.stringify(initialKnowledge)};
    var pendingCentralDeletion=null;
    async function loadCentralKnowledge(){centralKnowledge=${JSON.stringify(refreshedKnowledge)};return true}
    function say(message){globalThis.__messages.push(message)}
    async function deleteCentralKnowledge(){return true}
    const rejects=()=>false;
    globalThis.__messages=[];
    ${script.slice(start,end)}
    globalThis.__deletion={prepareCentralDeletion,getPending:()=>pendingCentralDeletion};
  `,context);
  context.__messages=messages;
  return{...context.__deletion,messages};
}

function environment({token="correct-owner-token",kv=new MemoryKV(),openAIKey}={}){
  return{RHIA_OWNER_TOKEN:token,RHIA_KNOWLEDGE:kv,...(openAIKey?{OPENAI_API_KEY:openAIKey}:{})};
}

function request(method="GET",{token,body,url=API}={}){
  const headers={origin:ORIGIN};if(token)headers["x-rhia-owner-token"]=token;if(body!==undefined)headers["content-type"]="application/json";
  return new Request(url,{method,headers,...(body!==undefined?{body:JSON.stringify(body)}:{})});
}

async function payload(response){return JSON.parse(await response.text())}

test("Besitzerzugang lehnt fehlenden, falschen und nicht konfigurierten Schlüssel ab",async()=>{
  const kv=new MemoryKV(),env=environment({kv});
  const missing=await onRequestGet({request:request(),env});
  assert.equal(missing.status,401);assert.equal((await payload(missing)).code,"OWNER_AUTH_REQUIRED");

  const wrong=await onRequestPost({request:request("POST",{token:"wrong",body:{subject:"Test",statement:"Darf nicht gespeichert werden"}}),env});
  assert.equal(wrong.status,401);assert.equal((await payload(wrong)).code,"OWNER_AUTH_REQUIRED");assert.equal(kv.values.size,0);

  const unconfigured=await onRequestGet({request:request("GET",{token:"anything"}),env:{RHIA_KNOWLEDGE:kv}});
  assert.equal(unconfigured.status,503);assert.equal((await payload(unconfigured)).code,"OWNER_AUTH_NOT_CONFIGURED");
});

test("korrekter Schlüssel erlaubt Schreiben, Neustart, Zweitgerät und Export",async()=>{
  const secret="correct-owner-token",kv=new MemoryKV(),env=environment({token:secret,kv});
  const written=await onRequestPost({request:request("POST",{token:secret,body:{id:"learned.testcode",subject:"Mein Testcode",statement:"Mein Testcode ist Bordeaux 47"}}),env});
  assert.equal(written.status,201);assert.equal((await payload(written)).fact.statement,"Mein Testcode ist Bordeaux 47");

  const afterRestart=await onRequestGet({request:request("GET",{token:secret}),env});
  const restartBody=await payload(afterRestart);assert.equal(afterRestart.status,200);assert.equal(restartBody.knowledge.facts.at(-1).statement,"Mein Testcode ist Bordeaux 47");

  const secondDevice=await onRequestGet({request:request("GET",{token:secret}),env});
  assert.equal((await payload(secondDevice)).knowledge.facts.at(-1).id,"learned.testcode");

  const exported=await onRequestGet({request:request("GET",{token:secret,url:API+"?export=1"}),env});
  const exportText=await exported.text();assert.equal(exported.status,200);assert.match(exported.headers.get("content-disposition"),/rhia-gedaechtnis\.json/);assert.match(exportText,/Bordeaux 47/);assert.doesNotMatch(exportText,new RegExp(secret));
});

test("veralteter Schlüssel verändert keine Daten und kann durch den aktuellen ersetzt werden",async()=>{
  const kv=new MemoryKV(),env=environment({token:"new-owner-token",kv});
  const stale=await onRequestPost({request:request("POST",{token:"old-owner-token",body:{id:"learned.stale",subject:"Alt",statement:"Dieser Satz darf nicht erscheinen"}}),env});
  assert.equal(stale.status,401);assert.equal(kv.values.size,0);

  const current=await onRequestPost({request:request("POST",{token:"new-owner-token",body:{id:"learned.current",subject:"Aktuell",statement:"Der aktuelle Schlüssel funktioniert"}}),env});
  assert.equal(current.status,201);
  const read=await onRequestGet({request:request("GET",{token:"new-owner-token"}),env});
  const facts=(await payload(read)).knowledge.facts;assert.equal(facts.some(item=>item.id==="learned.stale"),false);assert.equal(facts.some(item=>item.id==="learned.current"),true);
});

test("zentrale Löschung verlangt Bestätigungsschlüssel und entfernt nur das gewählte Objekt",async()=>{
  const secret="correct-owner-token",kv=new MemoryKV(),env=environment({token:secret,kv});
  await onRequestPost({request:request("POST",{token:secret,body:{id:"learned.delete-me",subject:"Test",statement:"Bitte später löschen"}}),env});

  const denied=await onRequestDelete({request:request("DELETE",{token:"wrong",body:{id:"learned.delete-me"}}),env});
  assert.equal(denied.status,401);
  const stillThere=await onRequestGet({request:request("GET",{token:secret}),env});
  assert.equal((await payload(stillThere)).knowledge.facts.some(item=>item.id==="learned.delete-me"),true);

  const deleted=await onRequestDelete({request:request("DELETE",{token:secret,body:{id:"learned.delete-me"}}),env});
  assert.equal(deleted.status,200);const deletedBody=await payload(deleted);assert.equal(deletedBody.deleted.id,"learned.delete-me");assert.equal(deletedBody.knowledge.facts.some(item=>item.id==="learned.delete-me"),false);
  const gone=await onRequestGet({request:request("GET",{token:secret}),env});
  assert.equal((await payload(gone)).knowledge.facts.some(item=>item.id==="learned.delete-me"),false);

  const alreadyAbsent=await onRequestDelete({request:request("DELETE",{token:secret,body:{id:"learned.delete-me"}}),env});
  assert.equal(alreadyAbsent.status,200,"Eine wiederholte Löschung muss als bereits erledigt bestätigt werden.");
  assert.equal((await payload(alreadyAbsent)).deleted.alreadyAbsent,true);
});

test("veraltete KV-Antwort lässt bestätigte Löschung im Browser nicht wieder erscheinen",async()=>{
  const secret="correct-owner-token",kv=new LaggingMemoryKV(),env=environment({token:secret,kv}),id="learned.eventual-delete";
  await onRequestPost({request:request("POST",{token:secret,body:{id,subject:"Mein Testcode",statement:"Mein Testcode ist Bordeaux 47"}}),env});
  const deleted=await onRequestDelete({request:request("DELETE",{token:secret,body:{id}}),env});
  const deletionBody=await payload(deleted);assert.equal(deletionBody.knowledge.facts.some(item=>item.id===id),false);

  const staleRead=await onRequestGet({request:request("GET",{token:secret}),env}),staleKnowledge=(await payload(staleRead)).knowledge;
  assert.equal(staleKnowledge.facts.some(item=>item.id===id),true,"Der Test muss Cloudflare-KV-Verzögerung nachstellen.");

  const html=await readFile(new URL("../index.html",import.meta.url),"utf8"),overlay=browserKnowledgeOverlay(html);
  overlay.recordKnowledgeMutation({type:"delete",id});
  const protectedKnowledge=overlay.applyKnowledgeMutations(staleKnowledge,{reconcile:true});
  assert.equal(protectedKnowledge.facts.some(item=>item.id===id),false);
  assert.equal(overlay.values.has("rhia_knowledge_mutations_v1"),true,"Die Löschvormerkung muss einen Neustart überstehen.");

  const reloadedOverlay=browserKnowledgeOverlay(html,overlay.values);
  const secondStaleRead=await onRequestGet({request:request("GET",{token:secret}),env}),secondStaleKnowledge=(await payload(secondStaleRead)).knowledge;
  assert.equal(secondStaleKnowledge.facts.some(item=>item.id===id),true);
  assert.equal(reloadedOverlay.applyKnowledgeMutations(secondStaleKnowledge,{reconcile:true}).facts.some(item=>item.id===id),false,"Auch nach einem Browser-Neustart darf der alte Satz nicht wieder erscheinen.");

  const freshRead=await onRequestGet({request:request("GET",{token:secret}),env}),freshKnowledge=(await payload(freshRead)).knowledge;
  assert.equal(freshKnowledge.facts.some(item=>item.id===id),false);
  reloadedOverlay.applyKnowledgeMutations(freshKnowledge,{reconcile:true});
  assert.equal(reloadedOverlay.values.has("rhia_knowledge_mutations_v1"),true,"Eine einzelne neue Antwort darf den Löschschutz noch nicht entfernen.");
  assert.equal(reloadedOverlay.applyKnowledgeMutations(staleKnowledge,{reconcile:true}).facts.some(item=>item.id===id),false,"Auch wenn nach einer neuen Antwort nochmals ein alter KV-Stand erscheint, muss der Satz gelöscht bleiben.");
});

test("sichtbarer Altstand bleibt löschbar, wenn die nächste KV-Abfrage den Eintrag schon nicht mehr findet",async()=>{
  const html=await readFile(new URL("../index.html",import.meta.url),"utf8"),fact={id:"learned.flapping-delete",subject:"Mein Testcode",statement:"Mein Testcode ist Bordeaux 47",status:"confirmed"};
  const flow=browserDeletionFlow(html,{
    initialKnowledge:{schemaVersion:1,facts:[fact]},
    refreshedKnowledge:{schemaVersion:1,facts:[]}
  });
  await flow.prepareCentralDeletion("Mein Testcode ist Bordeaux 47");
  assert.equal(flow.getPending()?.id,fact.id,"RHIA muss den unmittelbar zuvor sichtbaren Eintrag für die Löschbestätigung behalten.");
  assert.match(flow.messages.at(-1)||"",/Ja oder Nein/i);
});

test("kostenfreie Chatantwort bleibt frei, bezahlter Aufruf verlangt Besitzerzugang",async()=>{
  const kv=new MemoryKV(),env=environment({token:"correct-owner-token",kv});
  const freeRequest=new Request("https://rhia.pages.dev/api/chat",{method:"POST",headers:{origin:ORIGIN,"content-type":"application/json"},body:JSON.stringify({message:"Wie geht es dir?",history:[]})});
  const free=await onChatPost({request:freeRequest,env});assert.equal(free.status,200);assert.equal((await payload(free)).model,"local-zero-credit");

  const approvedBody={message:"Ja",history:[{role:"user",content:"Erkläre mir Quantenphysik"},{role:"assistant",content:"RHIA_KOSTENFREIGABE Bitte bestätigen"}]};
  const missing=new Request("https://rhia.pages.dev/api/chat",{method:"POST",headers:{origin:ORIGIN,"content-type":"application/json"},body:JSON.stringify(approvedBody)});
  const denied=await onChatPost({request:missing,env});assert.equal(denied.status,401);assert.equal((await payload(denied)).code,"OWNER_AUTH_REQUIRED");

  const authorized=new Request("https://rhia.pages.dev/api/chat",{method:"POST",headers:{origin:ORIGIN,"content-type":"application/json","x-rhia-owner-token":"correct-owner-token"},body:JSON.stringify(approvedBody)});
  const noModelKey=await onChatPost({request:authorized,env});assert.equal(noModelKey.status,503);assert.match((await payload(noModelKey)).error,/OPENAI_API_KEY/);
});

test("CORS und Oberfläche enthalten den sicheren Stufe-0.1-Fluss",async()=>{
  const options=onRequestOptions({request:request("OPTIONS")});assert.equal(options.status,204);assert.match(options.headers.get("access-control-allow-methods"),/DELETE/);

  const html=await readFile(new URL("../index.html",import.meta.url),"utf8");
  assert.match(html,/id="ownerTokenInput" type="password"/);assert.doesNotMatch(html,/\bprompt\s*\(/);assert.match(html,/ungültig oder veraltet/);assert.match(html,/exportCentralKnowledge/);assert.match(html,/deleteCentralKnowledge/);
  assert.doesNotMatch(html,/console\.(?:log|warn|error)\([^\n]*ownerToken/);
  const script=html.match(/<script>([\s\S]*)<\/script>/)?.[1];assert.ok(script);assert.doesNotThrow(()=>new Function(script));
  const requestStart=script.indexOf("async function knowledgeRequest"),successCheck=script.indexOf("if(!response.ok)",requestStart),storeToken=script.indexOf("localStorage.setItem(OWNER_TOKEN_KEY",requestStart);
  assert.ok(requestStart>=0&&successCheck>requestStart&&storeToken>successCheck,"Der Schlüssel darf erst nach erfolgreicher Serverantwort gespeichert werden.");
});
