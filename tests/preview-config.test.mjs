import assert from"node:assert/strict";
import{readFile}from"node:fs/promises";
import test from"node:test";

test("Preview und Produktion besitzen getrennte Durable-Object-Bindings und keine eingecheckten Geheimnisse",async()=>{
  const pagesText=await readFile(new URL("../wrangler.pages.jsonc",import.meta.url),"utf8"),pages=JSON.parse(pagesText);
  const production=pages.env.production,preview=pages.env.preview;
  assert.equal(production.durable_objects.bindings[0].script_name,"rhia-memory-store");
  assert.equal(preview.durable_objects.bindings[0].script_name,"rhia-memory-store-preview");
  assert.notEqual(preview.durable_objects.bindings[0].script_name,production.durable_objects.bindings[0].script_name);
  assert.deepEqual(production.vars,{RHIA_DEPLOYMENT_ENV:"production",RHIA_MIGRATION_ENABLED:"false"});
  assert.deepEqual(preview.vars,{RHIA_DEPLOYMENT_ENV:"preview",RHIA_MIGRATION_ENABLED:"false"});
  assert.doesNotMatch(pagesText,/RHIA_(?:PREVIEW_)?OWNER_TOKEN|OPENAI_API_KEY/);

  const worker=JSON.parse(await readFile(new URL("../memory-worker/wrangler.jsonc",import.meta.url),"utf8"));
  assert.equal(worker.name,"rhia-memory-store");assert.equal(worker.env.preview.name,"rhia-memory-store-preview");assert.notEqual(worker.name,worker.env.preview.name);
  assert.equal(worker.exports.RhiaMemoryStore.storage,"sqlite");assert.equal(worker.env.preview.exports.RhiaMemoryStore.storage,"sqlite");
});

test("Browser nutzt für alle APIs ausschließlich same-origin-Adressen",async()=>{
  const html=await readFile(new URL("../index.html",import.meta.url),"utf8");
  assert.match(html,/API="\/api\/chat",KNOWLEDGE_API="\/api\/knowledge",MIGRATION_API="\/api\/memory-migration"/);
  assert.doesNotMatch(html,/https:\/\/rhia\.pages\.dev\/api\//);
});
