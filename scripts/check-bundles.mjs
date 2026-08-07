import{mkdir,rm}from"node:fs/promises";
import{tmpdir}from"node:os";
import{dirname,join,resolve}from"node:path";
import{spawnSync}from"node:child_process";
import{fileURLToPath}from"node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const output=join(root,".wrangler","bundle-check"),wrangler=join(root,"node_modules",".bin",process.platform==="win32"?"wrangler.cmd":"wrangler");
const configHome=join(tmpdir(),"rhia-wrangler-bundle-check");
await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});await mkdir(configHome,{recursive:true});

const environment={...process.env,XDG_CONFIG_HOME:configHome,WRANGLER_SEND_METRICS:"false"};
function run(label,args){
  const result=spawnSync(wrangler,args,{cwd:root,env:environment,stdio:"inherit"});
  if(result.status!==0)throw new Error(`${label} fehlgeschlagen (Exit ${result.status??"unbekannt"}).`);
}

run("Pages-Functions-Bundle",["pages","functions","build","functions","--outdir",join(output,"pages-functions"),"--project-directory",root,"--build-output-directory",join(root,"dist")]);
run("Pages-Production-Konfiguration",["types",join(output,"pages-production.d.ts"),"--config","wrangler.pages.jsonc","--env","production"]);
run("Pages-Preview-Konfiguration",["types",join(output,"pages-preview.d.ts"),"--config","wrangler.pages.jsonc","--env","preview"]);
run("Durable-Object-Production-Dry-Run",["deploy","--dry-run","--config","memory-worker/wrangler.jsonc","--env","","--outdir",join(output,"memory-production")]);
run("Durable-Object-Preview-Dry-Run",["deploy","--dry-run","--config","memory-worker/wrangler.jsonc","--env","preview","--outdir",join(output,"memory-preview")]);
console.log("Bundles geprüft: Pages Functions, getrennte Pages-Umgebungen und beide Durable-Object-Worker.");
