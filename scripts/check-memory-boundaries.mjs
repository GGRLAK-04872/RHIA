import assert from"node:assert/strict";
import{access,readFile}from"node:fs/promises";

const productFiles=[
  "index.html",
  "functions/api/knowledge.js",
  "functions/api/chat.js",
  "functions/api/memory-migration.js",
  "functions/lib/memory-store.js",
  "memory-worker/src/index.js"
];
const entries=await Promise.all(productFiles.map(async path=>[path,await readFile(new URL(`../${path}`,import.meta.url),"utf8")]));
const combined=entries.map(([path,text])=>`\n/* ${path} */\n${text}`).join("\n");
const forbidden=[
  /RHIA_KNOWLEDGE/,
  /KNOWLEDGE_KEY/,
  /export\s+const\s+SEED/,
  /\|\|\s*SEED/,
  /state\.memories/,
  /body\?*\.memories/,
  /memoryText\s*\(/,
  /knowledgeLoadSequence/,
  /previouslyVisible/,
  /applyKnowledgeMutations/,
  /recordKnowledgeMutation/,
  /knowledge\/rhia-core\.json/,
  /backend\/worker\.js/
];
for(const pattern of forbidden)assert.doesNotMatch(combined,pattern,`Verbotener alter Gedächtnispfad: ${pattern}`);

const html=entries.find(([path])=>path==="index.html")[1];
for(const key of["rhia_knowledge_mutations_v1","rhia_memories_v011","rhia_chat_v04"]){
  assert.equal(html.split(key).length-1,1,`${key} darf ausschließlich einmal als Bereinigungsschlüssel vorkommen.`);
}
assert.match(html,/function legacyMemoryInventory/);assert.match(html,/function clearVerifiedLegacyMemory/);assert.match(html,/function verifyLegacyMigrationContent/);assert.match(html,/crypto\.subtle\.digest\("SHA-256"/);assert.match(html,/rawValuesEqual/);assert.match(html,/legacyChatSnapshot/);assert.match(html,/legacyChatDeleteArmed/);assert.match(html,/acceptCentralKnowledge/);assert.match(html,/expectedRevision/);
assert.match(html,/API="\/api\/chat",KNOWLEDGE_API="\/api\/knowledge",MIGRATION_API="\/api\/memory-migration"/);
assert.match(combined,/RHIA_MEMORY/);assert.match(combined,/MEMORY_REVISION_CONFLICT/);assert.match(combined,/tombstones/);

for(const removed of["../backend/worker.js","../wrangler.jsonc","../.github/scripts/apply_ai_client.py"]){
  await assert.rejects(access(new URL(removed,import.meta.url)),undefined,`${removed} muss aus dem aktuellen Produktstand entfernt sein.`);
}

console.log("Gedächtnisgrenzen geprüft: eine Durable-Object-Quelle, kein KV-, Seed- oder Browser-Rückfall.");
