import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

import {onRequestDelete,onRequestGet,onRequestOptions,onRequestPost} from "../functions/api/knowledge.js";
import {onRequestPost as onChatPost} from "../functions/api/chat.js";

const API="https://rhia.pages.dev/api/knowledge",ORIGIN="https://rhia.pages.dev";

class MemoryKV{
  constructor(){this.values=new Map()}
  async get(key,type){const value=this.values.get(key);if(value===undefined)return null;return type==="json"?JSON.parse(value):value}
  async put(key,value){this.values.set(key,String(value))}
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
  assert.equal(deleted.status,200);assert.equal((await payload(deleted)).deleted.id,"learned.delete-me");
  const gone=await onRequestGet({request:request("GET",{token:secret}),env});
  assert.equal((await payload(gone)).knowledge.facts.some(item=>item.id==="learned.delete-me"),false);
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
