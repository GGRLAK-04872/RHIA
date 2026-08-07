import assert from"node:assert/strict";
import{access,readFile,readdir}from"node:fs/promises";
import test from"node:test";

async function filesBelow(path,prefix=""){
  const entries=await readdir(path,{withFileTypes:true}),files=[];
  for(const entry of entries){const relative=prefix?`${prefix}/${entry.name}`:entry.name;if(entry.isDirectory())files.push(...await filesBelow(`${path}/${entry.name}`,relative));else files.push(relative)}
  return files.sort();
}

test("Pages veröffentlicht ausschließlich die freigegebene Oberfläche aus dist",async()=>{
  const config=JSON.parse(await readFile(new URL("../wrangler.pages.jsonc",import.meta.url),"utf8"));
  assert.equal(config.pages_build_output_dir,"./dist");
  const dist=new URL("../dist/",import.meta.url),files=await filesBelow(dist.pathname);
  assert.deepEqual(files,["index.html"]);
  for(const internal of["knowledge/rhia-core.json","RHIA_PROJEKTSTAND.md","package.json","wrangler.pages.jsonc","functions/api/knowledge.js"]){
    assert.equal(files.includes(internal),false,`${internal} darf nicht im Pages-Artefakt liegen.`);
    await assert.rejects(access(new URL(internal,dist)));
  }
});
