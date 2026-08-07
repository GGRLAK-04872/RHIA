import{readFile,writeFile}from"node:fs/promises";
import{resolve}from"node:path";
import{prepareMigrationManifest}from"../shared/memory-contract.js";

function argument(name){const index=process.argv.indexOf(name);return index>=0?process.argv[index+1]:""}
function has(name){return process.argv.includes(name)}
function usage(){
  console.error("Verwendung: node scripts/prepare-memory-migration.mjs --source EXPORT.json --deletions LOESCHUNGEN.json --source-id ID [--out MANIFEST.json] [--allow-nonempty]");
}

const sourcePath=argument("--source"),deletionsPath=argument("--deletions"),sourceId=argument("--source-id"),outPath=argument("--out");
if(!sourcePath||!sourceId){usage();process.exitCode=2}else{
  const source=JSON.parse(await readFile(resolve(sourcePath),"utf8"));
  const knowledge=source?.knowledge&&typeof source.knowledge==="object"?source.knowledge:source;
  const deletions=deletionsPath?JSON.parse(await readFile(resolve(deletionsPath),"utf8")):[];
  const tombstones=Array.isArray(deletions)?deletions:Array.isArray(deletions?.tombstones)?deletions.tombstones:[];
  const manifest=await prepareMigrationManifest({
    sourceId,
    sourceType:"controlled-central-export",
    sourceUpdatedAt:knowledge?.updatedAt||null,
    requireEmpty:!has("--allow-nonempty"),
    facts:Array.isArray(knowledge?.facts)?knowledge.facts:[],
    tombstones
  });
  const summary={sourceId:manifest.sourceId,checksum:manifest.checksum,facts:manifest.summary.facts,tombstones:manifest.summary.tombstones,skippedFacts:manifest.summary.skippedFacts,requireEmpty:manifest.requireEmpty};
  if(outPath){await writeFile(resolve(outPath),JSON.stringify(manifest,null,2)+"\n",{flag:"wx"});console.log(JSON.stringify({...summary,manifestFile:resolve(outPath)},null,2))}
  else console.log(JSON.stringify(summary,null,2));
}
