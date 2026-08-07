import{copyFile,mkdir,rm}from"node:fs/promises";
import{dirname,join,resolve}from"node:path";
import{fileURLToPath}from"node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const output=join(root,"dist");
if(dirname(output)!==root||output===root)throw new Error("Unsicheres Pages-Ausgabeverzeichnis.");

await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
await copyFile(join(root,"index.html"),join(output,"index.html"));
console.log("Öffentliches Pages-Artefakt erstellt: dist/index.html");
