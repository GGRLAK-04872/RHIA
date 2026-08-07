import assert from"node:assert/strict";
import{readFile}from"node:fs/promises";
import test from"node:test";
import vm from"node:vm";

import{onRequestDelete,onRequestGet,onRequestOptions,onRequestPost}from"../functions/api/knowledge.js";
import{onRequestPost as onChatPost}from"../functions/api/chat.js";
import{onRequestGet as onMigrationGet,onRequestPost as onMigrationPost}from"../functions/api/memory-migration.js";
import{FakeMemoryNamespace,FakeMemoryStub}from"./helpers/fake-memory.mjs";

const API="https://rhia.pages.dev/api/knowledge",MIGRATION_API="https://rhia.pages.dev/api/memory-migration",ORIGIN="https://rhia.pages.dev",TOKEN="correct-owner-token";

function environment({token=TOKEN,stub=new FakeMemoryStub(),openAIKey,migration=false,deploymentEnv,previewToken,previewOpenAIKey}={}){return{RHIA_OWNER_TOKEN:token,RHIA_MEMORY:new FakeMemoryNamespace(stub),...(openAIKey?{OPENAI_API_KEY:openAIKey}:{}),...(migration?{RHIA_MIGRATION_ENABLED:"true"}:{}),...(deploymentEnv?{RHIA_DEPLOYMENT_ENV:deploymentEnv}:{}),...(previewToken?{RHIA_PREVIEW_OWNER_TOKEN:previewToken}:{}),...(previewOpenAIKey?{RHIA_PREVIEW_OPENAI_API_KEY:previewOpenAIKey}:{})}}
function request(method="GET",{token,body,url=API}={}){const headers={origin:ORIGIN};if(token)headers["x-rhia-owner-token"]=token;if(body!==undefined)headers["content-type"]="application/json";return new Request(url,{method,headers,...(body!==undefined?{body:JSON.stringify(body)}:{})})}
async function payload(response){return JSON.parse(await response.text())}

test("Besitzerzugang lehnt fehlende, falsche und nicht konfigurierte Schlüssel ohne Änderung ab",async()=>{
  const stub=new FakeMemoryStub(),env=environment({stub});
  const missing=await onRequestGet({request:request(),env});assert.equal(missing.status,401);assert.equal((await payload(missing)).code,"OWNER_AUTH_REQUIRED");
  const wrong=await onRequestPost({request:request("POST",{token:"wrong",body:{expectedRevision:0,id:"forbidden",subject:"Test",statement:"Darf nicht gespeichert werden"}}),env});assert.equal(wrong.status,401);assert.equal(stub.snapshot.revision,0);
  const unconfigured=await onRequestGet({request:request("GET",{token:"anything"}),env:{RHIA_MEMORY:env.RHIA_MEMORY}});assert.equal(unconfigured.status,503);assert.equal((await payload(unconfigured)).code,"OWNER_AUTH_NOT_CONFIGURED");
});

test("Preview verweigert Produktionsgeheimnisse und akzeptiert nur eigene Preview-Schlüssel",async()=>{
  const stub=new FakeMemoryStub(),withoutPreview=environment({stub,deploymentEnv:"preview",token:"production-owner"});
  const unavailable=await onRequestGet({request:request("GET",{token:"production-owner"}),env:withoutPreview});assert.equal(unavailable.status,503);assert.equal((await payload(unavailable)).code,"OWNER_AUTH_NOT_CONFIGURED");
  const env=environment({stub,deploymentEnv:"preview",token:"production-owner",previewToken:"preview-owner",openAIKey:"production-openai"});
  const rejected=await onRequestGet({request:request("GET",{token:"production-owner"}),env});assert.equal(rejected.status,401);
  const accepted=await onRequestGet({request:request("GET",{token:"preview-owner"}),env});assert.equal(accepted.status,200);assert.equal(JSON.stringify(await payload(accepted)).includes("preview-owner"),false);

  const approved={message:"Ja",history:[{role:"user",content:"Erstelle eine Vorschauanalyse"},{role:"assistant",content:"RHIA_KOSTENFREIGABE Bitte bestätigen"}]};
  const noPreviewAI=await onChatPost({request:request("POST",{url:"https://preview.rhia.pages.dev/api/chat",token:"preview-owner",body:approved}),env});assert.equal(noPreviewAI.status,503);assert.match((await payload(noPreviewAI)).error,/Preview-KI-Schlüssel/);
});

test("ein fehlendes Durable Object liefert 503 und niemals Seed-, KV- oder Browserwissen",async()=>{
  const response=await onRequestGet({request:request("GET",{token:TOKEN}),env:{RHIA_OWNER_TOKEN:TOKEN}}),body=await payload(response);
  assert.equal(response.status,503);assert.equal(body.code,"MEMORY_STORE_NOT_CONFIGURED");assert.equal(JSON.stringify(body).includes("Mike ist Gründer"),false);
  const failedStub=new FakeMemoryStub({fail:true}),failed=await onRequestGet({request:request("GET",{token:TOKEN}),env:environment({stub:failedStub})});assert.equal(failed.status,503);assert.equal((await payload(failed)).code,"MEMORY_STORE_UNAVAILABLE");
});

test("Schreiben, Neustart, Zweitgerät und Export verwenden dieselbe storeId und Revision",async()=>{
  const stub=new FakeMemoryStub(),env=environment({stub});
  const written=await onRequestPost({request:request("POST",{token:TOKEN,body:{expectedRevision:0,id:"learned.testcode",subject:"Mein Testcode",statement:"Mein Testcode ist Bordeaux 47"}}),env}),writeBody=await payload(written);
  assert.equal(written.status,201);assert.equal(writeBody.revision,1);assert.equal(writeBody.fact.statement,"Mein Testcode ist Bordeaux 47");
  const restarted=await onRequestGet({request:request("GET",{token:TOKEN}),env}),restartBody=await payload(restarted);
  const secondDevice=await onRequestGet({request:request("GET",{token:TOKEN}),env}),secondBody=await payload(secondDevice);
  const exported=await onRequestGet({request:request("GET",{token:TOKEN,url:API+"?export=1"}),env}),exportBody=await payload(exported);
  assert.deepEqual([restartBody.storeId,secondBody.storeId,exportBody.storeId],[writeBody.storeId,writeBody.storeId,writeBody.storeId]);
  assert.deepEqual([restartBody.revision,secondBody.revision,exportBody.revision],[1,1,1]);assert.match(exported.headers.get("content-disposition"),/rhia-gedaechtnis\.json/);assert.equal(JSON.stringify(exportBody).includes(TOKEN),false);
});

test("Revisionskonflikte verhindern Überschreiben; Löschen erzeugt dauerhaften Tombstone",async()=>{
  const stub=new FakeMemoryStub(),env=environment({stub}),fact={expectedRevision:0,id:"learned.delete-me",subject:"Test",statement:"Bitte später löschen"};
  await onRequestPost({request:request("POST",{token:TOKEN,body:fact}),env});
  const stale=await onRequestPost({request:request("POST",{token:TOKEN,body:{...fact,statement:"Veraltete Änderung"}}),env}),staleBody=await payload(stale);assert.equal(stale.status,409);assert.equal(staleBody.code,"MEMORY_REVISION_CONFLICT");assert.equal(staleBody.actualRevision,1);
  const deleted=await onRequestDelete({request:request("DELETE",{token:TOKEN,body:{id:fact.id,expectedRevision:1}}),env}),deletedBody=await payload(deleted);assert.equal(deleted.status,200);assert.equal(deletedBody.revision,2);assert.equal(stub.snapshot.tombstones[0].statement,fact.statement);
  const repeated=await onRequestDelete({request:request("DELETE",{token:TOKEN,body:{id:fact.id,expectedRevision:2}}),env}),repeatedBody=await payload(repeated);assert.equal(repeated.status,200);assert.equal(repeatedBody.deleted.alreadyAbsent,true);assert.equal(repeatedBody.revision,2);
  const resurrect=await onRequestPost({request:request("POST",{token:TOKEN,body:{...fact,expectedRevision:2}}),env});assert.equal(resurrect.status,409);assert.equal((await payload(resurrect)).code,"MEMORY_TOMBSTONED");
  const unknown=await onRequestDelete({request:request("DELETE",{token:TOKEN,body:{id:"unknown",expectedRevision:2}}),env});assert.equal(unknown.status,404);assert.equal((await payload(unknown)).code,"MEMORY_NOT_FOUND");
});

test("kostenfreie Chatantwort bleibt frei; bezahlter Aufruf bleibt geschützt",async()=>{
  const env=environment();
  const free=await onChatPost({request:request("POST",{url:"https://rhia.pages.dev/api/chat",body:{message:"Wie geht es dir?",history:[]}}),env});assert.equal(free.status,200);assert.equal((await payload(free)).model,"local-zero-credit");
  const approvedBody={message:"Ja",history:[{role:"user",content:"Erkläre mir Quantenphysik"},{role:"assistant",content:"RHIA_KOSTENFREIGABE Bitte bestätigen"}]};
  const denied=await onChatPost({request:request("POST",{url:"https://rhia.pages.dev/api/chat",body:approvedBody}),env});assert.equal(denied.status,401);assert.equal((await payload(denied)).code,"OWNER_AUTH_REQUIRED");
  const noModel=await onChatPost({request:request("POST",{url:"https://rhia.pages.dev/api/chat",token:TOKEN,body:approvedBody}),env});assert.equal(noModel.status,503);assert.match((await payload(noModel)).error,/OPENAI_API_KEY/);
});

test("Oberfläche, Export und Chat melden dieselbe Gedächtnisidentität; Browser-Erinnerungen werden ignoriert",async()=>{
  const stub=new FakeMemoryStub(),env=environment({stub,openAIKey:"test-only"});
  await onRequestPost({request:request("POST",{token:TOKEN,body:{expectedRevision:0,id:"central.fact",subject:"Zentral",statement:"Nur dieser zentrale Fakt ist gültig"}}),env});
  let sentBody=null;const originalFetch=globalThis.fetch;globalThis.fetch=async(_url,options)=>{sentBody=JSON.parse(options.body);return new Response(JSON.stringify({output_text:"Geprüfte Antwort",model:"test-model"}),{status:200,headers:{"content-type":"application/json"}})};
  try{
    const body={message:"Ja",memories:[{text:"Eingeschleuster Browserfakt"}],history:[{role:"user",content:"Erstelle eine kurze Analyse"},{role:"assistant",content:"RHIA_KOSTENFREIGABE Bitte bestätigen"}]};
    const chat=await onChatPost({request:request("POST",{url:"https://rhia.pages.dev/api/chat",token:TOKEN,body}),env}),chatBody=await payload(chat);
    const uiBody=await payload(await onRequestGet({request:request("GET",{token:TOKEN}),env})),exportBody=await payload(await onRequestGet({request:request("GET",{token:TOKEN,url:API+"?export=1"}),env}));
    assert.deepEqual(chatBody.memory,{storeId:uiBody.storeId,revision:uiBody.revision});assert.equal(exportBody.storeId,uiBody.storeId);assert.equal(exportBody.revision,uiBody.revision);
    assert.match(sentBody.instructions,/Nur dieser zentrale Fakt/);assert.doesNotMatch(sentBody.instructions,/Eingeschleuster Browserfakt/);assert.equal(sentBody.store,false);
  }finally{globalThis.fetch=originalFetch}
});

test("Tombstonte Fakten gelangen nicht in die Online-KI; Speicherausfall löst keinen Rückfall aus",async()=>{
  const stub=new FakeMemoryStub(),env=environment({stub,openAIKey:"test-only"});
  await stub.upsert({expectedRevision:0,fact:{id:"deleted.code",subject:"Mein Testcode",statement:"Mein Testcode ist Bordeaux 47",confirmedBy:"Mike"}});await stub.deleteFact({expectedRevision:1,id:"deleted.code"});
  let sentBody=null,calls=0;const originalFetch=globalThis.fetch;globalThis.fetch=async(_url,options)=>{calls++;sentBody=JSON.parse(options.body);return new Response(JSON.stringify({output_text:"Antwort",model:"test-model"}),{status:200,headers:{"content-type":"application/json"}})};
  const approved={message:"Ja",history:[{role:"user",content:"Mein Testcode ist Bordeaux 47"},{role:"assistant",content:"Dieser alte Verlauf nennt Bordeaux 47"},{role:"user",content:"Erstelle eine andere Analyse"},{role:"assistant",content:"RHIA_KOSTENFREIGABE Bitte bestätigen"}]};
  try{
    const response=await onChatPost({request:request("POST",{url:"https://rhia.pages.dev/api/chat",token:TOKEN,body:approved}),env});assert.equal(response.status,200);assert.doesNotMatch(JSON.stringify(sentBody.input),/Bordeaux 47/);
    const unavailable=await onChatPost({request:request("POST",{url:"https://rhia.pages.dev/api/chat",token:TOKEN,body:approved}),env:{RHIA_OWNER_TOKEN:TOKEN,OPENAI_API_KEY:"test-only"}});assert.equal(unavailable.status,503);assert.equal((await payload(unavailable)).code,"MEMORY_STORE_NOT_CONFIGURED");assert.equal(calls,1);
  }finally{globalThis.fetch=originalFetch}
});

test("Migrationsvorschau verändert nichts; Commit verlangt Aktivierung, Revision und Prüfsumme",async()=>{
  const stub=new FakeMemoryStub(),baseEnv=environment({stub}),manifest={sourceId:"central-export-test",sourceType:"controlled-central-export",requireEmpty:true,facts:[{id:"migrated.one",subject:"Test",statement:"Kontrolliert übernommen"}],tombstones:[]};
  const disabled=await onMigrationPost({request:request("POST",{url:MIGRATION_API,token:TOKEN,body:{action:"preview",manifest}}),env:baseEnv});assert.equal(disabled.status,503);assert.equal(stub.snapshot.revision,0);
  const env=environment({stub,migration:true}),preview=await onMigrationPost({request:request("POST",{url:MIGRATION_API,token:TOKEN,body:{action:"preview",manifest}}),env}),previewBody=await payload(preview);assert.equal(preview.status,200);assert.equal(stub.snapshot.revision,0);assert.equal(previewBody.manifest.summary.facts,1);
  const wrong=await onMigrationPost({request:request("POST",{url:MIGRATION_API,token:TOKEN,body:{action:"commit",manifest:previewBody.manifest,expectedRevision:0,confirmedChecksum:"0".repeat(64)}}),env});assert.equal(wrong.status,409);assert.equal(stub.snapshot.revision,0);
  const committed=await onMigrationPost({request:request("POST",{url:MIGRATION_API,token:TOKEN,body:{action:"commit",manifest:previewBody.manifest,expectedRevision:0,confirmedChecksum:previewBody.checksum}}),env}),committedBody=await payload(committed);assert.equal(committed.status,201);assert.equal(committedBody.snapshot.revision,1);
  const status=await onMigrationGet({request:request("GET",{url:MIGRATION_API+"?sourceId=central-export-test",token:TOKEN}),env}),statusBody=await payload(status);assert.equal(statusBody.record.checksum,previewBody.checksum);assert.equal(statusBody.storeId,committedBody.snapshot.storeId);assert.equal(statusBody.revision,committedBody.snapshot.revision);
});

test("Tablet-Test-14-Regression verwirft einen nachträglich eintreffenden alten Stand",async()=>{
  const html=await readFile(new URL("../index.html",import.meta.url),"utf8"),script=html.match(/<script>([\s\S]*)<\/script>/)?.[1];assert.ok(script);
  const start=script.indexOf("function acceptCentralKnowledge"),end=script.indexOf("function finishOwnerPrompt");assert.ok(start>=0&&end>start);
  const messages=[],context={centralKnowledge:{storeId:null,schemaVersion:1,revision:-1,updatedAt:null,facts:[]},pendingCentralDeletion:null,knowledgeError:(message,code)=>Object.assign(new Error(message),{code}),storedOwnerToken:()=>TOKEN,loadCentralKnowledge:async()=>true,say:message=>messages.push(message),rejects:()=>false,deleteCentralKnowledge:async()=>true};vm.createContext(context);
  vm.runInContext(`${script.slice(start,end)};globalThis.accept=acceptCentralKnowledge;globalThis.current=()=>centralKnowledge;`,context);
  const deleted={storeId:"store-1",schemaVersion:1,revision:3,facts:[]},old={storeId:"store-1",schemaVersion:1,revision:2,facts:[{id:"old",subject:"Mein Testcode",statement:"Mein Testcode ist Bordeaux 47",status:"confirmed"}]};
  assert.equal(context.accept(deleted),true);assert.equal(context.accept(old),false);assert.equal(JSON.stringify(context.current()).includes("Bordeaux 47"),false);
  const answerStart=script.indexOf("function normalizedKnowledgeText"),answerEnd=script.indexOf("function isCentralExportCommand");assert.ok(answerStart>=0&&answerEnd>answerStart);
  vm.runInContext(`${script.slice(answerStart,answerEnd)};globalThis.answerFromMemory=answerFromCentralKnowledge;`,context);
  assert.equal(await context.answerFromMemory("Wie lautet mein Testcode?"),true);assert.match(messages.at(-1),/keine bestätigte Information/i);assert.doesNotMatch(messages.at(-1),/Bordeaux 47/i);
});

test("CORS und Oberfläche enthalten den neuen sicheren Stufe-0.1-Fluss",async()=>{
  const options=onRequestOptions({request:request("OPTIONS")});assert.equal(options.status,204);assert.match(options.headers.get("access-control-allow-methods"),/DELETE/);
  const html=await readFile(new URL("../index.html",import.meta.url),"utf8");assert.match(html,/id="ownerTokenInput" type="password"/);assert.doesNotMatch(html,/\bprompt\s*\(/);assert.match(html,/acceptCentralKnowledge/);assert.match(html,/expectedRevision/);assert.match(html,/Altgedächtnis nur prüfen/);assert.doesNotMatch(html,/state\.memories|knowledgeLoadSequence|previouslyVisible|applyKnowledgeMutations/);
  const script=html.match(/<script>([\s\S]*)<\/script>/)?.[1];assert.ok(script);assert.doesNotThrow(()=>new Function(script));
  const requestStart=script.indexOf("async function knowledgeRequest"),successCheck=script.indexOf("if(!response.ok)",requestStart),storeToken=script.indexOf("localStorage.setItem(OWNER_TOKEN_KEY",requestStart);assert.ok(requestStart>=0&&successCheck>requestStart&&storeToken>successCheck);
  assert.doesNotMatch(html,/console\.(?:log|warn|error)\([^\n]*ownerToken/);
});
