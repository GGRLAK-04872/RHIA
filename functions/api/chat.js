import{MemoryStoreError,readCentralMemory}from"../lib/memory-store.js";
import{ownerAuthorized}from"./knowledge.js";
import{normalizedMemoryText}from"../../shared/memory-contract.js";

const ALLOWED_ORIGINS=new Set(["https://ggrlak-04872.github.io","https://rhia.pages.dev"]);
function corsHeaders(request){
  const origin=request?.headers?.get("origin")||"";
  return{
    ...(ALLOWED_ORIGINS.has(origin)?{"access-control-allow-origin":origin}:{}),
    "access-control-allow-methods":"POST, OPTIONS",
    "access-control-allow-headers":"content-type,x-rhia-owner-token",
    "access-control-max-age":"86400",
    "vary":"Origin"
  };
}
function json(data,status=200,request){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...corsHeaders(request)}})}
function clean(value,max=12000){return String(value??"").trim().slice(0,max)}
function normalized(value){return normalizedMemoryText(clean(value,12000))}
function includesAny(text,phrases){return phrases.some(phrase=>text.includes(phrase))}

function localReply(message,world){
  const text=normalized(message);if(!text)return null;
  if(includesAny(text,["wer bist du","was bist du","was ist rhia","wer ist rhia","erzähl mir wer du bist","erzaehl mir wer du bist","erzähl etwas über dich","erzaehl etwas ueber dich","erzähl mir etwas über dich","erzaehl mir etwas ueber dich","stell dich vor","stelle dich vor","wer genau bist du","was genau bist du","was bedeutet rhia"]))return"Ich bin RHIA – RH Intelligent Assistant. Ihre loyale digitale Partnerin und das Assistenzsystem von RH Produktion, Sir.";
  if(includesAny(text,["wie geht es dir","wie gehts dir","wie geht's dir","wie fühlst du dich","wie fuehlst du dich","alles gut bei dir"]))return"Mir geht es gut, Sir. Ich bin bereit – was machen wir heute?";
  if(includesAny(text,["was kannst du","wobei kannst du helfen","wobei hilfst du","welche funktionen hast du","was sind deine funktionen","was kannst du alles","wie kannst du mich unterstützen","wie kannst du mich unterstuetzen"]))return"Ich kann Aufgaben, Notizen, Ideen, Welten, Farben, Spracheingabe und bestätigte zentrale Erinnerungen verwalten, Sir. Bekannte Befehle beantworte ich lokal; freie Wissens- oder Kreativfragen gehen erst nach Ihrer Kostenbestätigung an die Online-KI.";
  if(includesAny(text,["welche welt ist aktiv","in welcher welt bist du","welche welt nutzt du","wo befinden wir uns","welcher bereich ist aktiv"]))return`Aktiv ist gerade die Welt „${clean(world,80)||"Allgemein"}“, Sir.`;
  if(includesAny(text,["wie spät ist es","wie spaet ist es","wie viel uhr ist es","sag mir die uhrzeit","aktuelle uhrzeit"]))return`Es ist ${new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",hour:"2-digit",minute:"2-digit"}).format(new Date())} Uhr, Sir.`;
  if(includesAny(text,["welches datum haben wir","welcher tag ist heute","was ist heute für ein tag","was ist heute fuer ein tag","sag mir das datum","aktuelles datum"]))return`Heute ist ${new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",weekday:"long",day:"2-digit",month:"long",year:"numeric"}).format(new Date())}, Sir.`;
  if(includesAny(text,["hörst du mich","hoerst du mich","kannst du mich hören","kannst du mich hoeren"]))return"Ja, Sir. Ich höre Sie und habe Ihre Sprache erkannt.";
  if(/^(hallo|hi|hey|guten morgen|guten tag|guten abend)( rhia)?$/.test(text))return"Guten Tag, Sir. Ich bin bereit. Womit beginnen wir?";
  if(includesAny(text,["vielen dank","danke rhia","danke dir","besten dank"])||text==="danke")return"Sehr gern, Sir.";
  return null;
}

const COST_MARKER="RHIA_KOSTENFREIGABE";
function isYes(value){return["ja","ja bitte","mach das","mache das","weiter","fortfahren","bestätigen","bestaetigen","kosten bestätigen","kosten bestaetigen"].includes(normalized(value))}
function isNo(value){return["nein","nein danke","abbrechen","abbruch","nicht machen","stopp","stop"].includes(normalized(value))}
function findPendingQuestion(history){if(!Array.isArray(history)||history.length<2)return null;for(let i=history.length-1;i>=0;i--){const entry=history[i];if(entry?.role==="assistant"&&String(entry?.content||"").includes(COST_MARKER)){for(let j=i-1;j>=0;j--)if(history[j]?.role==="user")return clean(history[j].content,12000);return null}}return null}
function estimateCost(message,history){const historyChars=(Array.isArray(history)?history:[]).reduce((sum,item)=>sum+clean(item?.content,3000).length,0);const inputTokens=Math.max(180,Math.ceil((clean(message).length+historyChars+1800)/3.5));const inputCostCent=(inputTokens/1_000_000)*.25*100;return{lowCent:inputCostCent+(220/1_000_000)*2*100,highCent:inputCostCent+(700/1_000_000)*2*100}}
function formatCent(value){return value.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})+" Cent"}
function costWarning(message,history){const estimate=estimateCost(message,history);return`${COST_MARKER}\nSir, diese Anfrage nutzt die Online-KI. Die geschätzten Kosten liegen ungefähr zwischen ${formatCent(estimate.lowCent)} und ${formatCent(estimate.highCent)}. Der genaue Betrag hängt vor allem von der Antwortlänge und dem Gesprächskontext ab. Soll ich fortfahren? Bitte antworten Sie mit Ja oder Nein.`}

function knowledgeText(knowledge){
  const facts=Array.isArray(knowledge?.facts)?knowledge.facts:[];
  const confirmed=facts.filter(item=>item?.status==="confirmed"&&item?.statement).slice(0,50);
  return confirmed.length?confirmed.map((item,index)=>`${index+1}. [${clean(item.subject,100)||"Fakt"}] ${clean(item.statement,700)} (bestätigt von ${clean(item.confirmedBy,80)||"unbekannt"})`).join("\n"):"Keine zentral bestätigten Fakten verfügbar.";
}
function instructions(world,knowledge){return`Du bist RHIA, RH Intelligent Assistant.\n\nPersönlichkeit:\n- loyal, ehrlich, elegant, ruhig, direkt und lösungsorientiert\n- beantworte immer zuerst die konkrete letzte Frage; stelle dich nur vor, wenn ausdrücklich nach deiner Identität gefragt wird\n- antworte natürlich und situationsgerecht statt einen allgemeinen Standardsatz zu wiederholen\n- zuerst das klare Ergebnis, dann eine kurze Erklärung\n- sprich standardmäßig Deutsch\n- sprich den Nutzer vorerst ausschließlich mit \"Sir\" an\n- zentrale bestätigte Fakten sind verbindlich; erfinde keine Identitätszuordnungen\n- behandle Mike und Shadow Grown niemals als dieselbe Person, solange dies nicht ausdrücklich zentral bestätigt wurde\n- erfinde keine Fakten und benenne Unsicherheit offen\n- Kontrolle vor Autonomie: externe oder riskante Aktionen nur vorbereiten, niemals ungefragt ausführen\n\nAktive Welt: ${clean(world,80)||"Allgemein"}\n\nZentral bestätigtes RHIA-Wissen:\n${knowledgeText(knowledge)}`}
function outputText(payload){if(typeof payload?.output_text==="string")return payload.output_text.trim();const parts=[];for(const item of payload?.output||[])for(const content of item?.content||[])if(content?.type==="output_text"&&content?.text)parts.push(content.text);return parts.join("\n").trim()}

function containsTombstonedStatement(content,tombstones){
  const text=normalized(content);if(!text)return false;
  return(Array.isArray(tombstones)?tombstones:[]).some(item=>{
    const deleted=normalized(item?.statement),subject=normalized(item?.subject),fragments=[deleted];
    if(subject&&deleted.startsWith(subject+" "))fragments.push(deleted.slice(subject.length).trim());
    const value=deleted.split(/\b(?:ist|sind|lautet|heißt|heisst|hat|beträgt|betraegt)\b/).at(-1)?.trim();if(value&&value!==deleted)fragments.push(value);
    return fragments.some(fragment=>fragment.length>=4&&(text.includes(fragment)||fragment.length>=10&&fragment.includes(text)));
  });
}

function safeHistory(history,tombstones,message){
  return(Array.isArray(history)?history:[])
    .filter(entry=>!String(entry?.content||"").includes(COST_MARKER))
    .filter(entry=>!containsTombstonedStatement(entry?.content,tombstones))
    .map(entry=>({role:entry?.role==="assistant"?"assistant":"user",content:clean(entry?.content,3000)}))
    .filter(entry=>entry.content&&entry.content!==message);
}

export async function onRequestPost({request,env}){
  let body;try{body=await request.json()}catch{return json({ok:false,error:"Ungültige Anfrage."},400,request)}
  const incomingMessage=clean(body?.message);if(!incomingMessage)return json({ok:false,error:"Keine Nachricht übermittelt."},400,request);
  const history=Array.isArray(body?.history)?body.history.slice(-8):[],pendingQuestion=findPendingQuestion(history);
  if(pendingQuestion&&isNo(incomingMessage))return json({ok:true,reply:"Abgebrochen, Sir. Es wurden keine OpenAI-Credits verwendet.",model:"local-zero-credit",local:true,cancelled:true},200,request);
  let message=incomingMessage,approved=false;if(pendingQuestion&&isYes(incomingMessage)){message=pendingQuestion;approved=true}
  if(!approved){const freeReply=localReply(message,body?.world);if(freeReply)return json({ok:true,reply:freeReply,model:"local-zero-credit",local:true},200,request);if(pendingQuestion)return json({ok:true,reply:"Bitte antworten Sie mit Ja, um die angekündigte kostenpflichtige Anfrage auszuführen, oder mit Nein, um sie abzubrechen, Sir.",model:"local-zero-credit",local:true},200,request);return json({ok:true,reply:costWarning(message,history),model:"local-cost-check",local:true,requiresConfirmation:true},200,request)}
  if(!env.RHIA_OWNER_TOKEN)return json({ok:false,error:"Der Besitzerzugang ist serverseitig noch nicht eingerichtet.",code:"OWNER_AUTH_NOT_CONFIGURED"},503,request);
  if(!ownerAuthorized(request,env))return json({ok:false,error:"Bitte bestätigen Sie zuerst Ihren RHIA-Besitzerschlüssel.",code:"OWNER_AUTH_REQUIRED"},401,request);
  if(!env.OPENAI_API_KEY)return json({ok:false,error:"OPENAI_API_KEY ist in Cloudflare noch nicht aktiv."},503,request);
  let knowledge;
  try{knowledge=await readCentralMemory(env,{includeTombstones:true})}
  catch(error){const known=error instanceof MemoryStoreError;return json({ok:false,error:known?error.message:"Das zentrale Gedächtnis ist gerade nicht erreichbar.",code:known?error.code:"MEMORY_STORE_UNAVAILABLE"},known?error.status:503,request)}
  const input=[...safeHistory(history,knowledge.tombstones,message),{role:"user",content:message}];
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000);
  try{
    const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",signal:controller.signal,headers:{authorization:`Bearer ${env.OPENAI_API_KEY}`,"content-type":"application/json"},body:JSON.stringify({model:env.OPENAI_MODEL||"gpt-5-mini",instructions:instructions(body?.world,knowledge),input,max_output_tokens:700,store:false})});
    const payload=await response.json().catch(()=>({}));if(!response.ok){console.error("OpenAI API error",response.status,payload?.error?.type||"unknown");return json({ok:false,error:"Die KI konnte gerade nicht antworten.",code:"MODEL_ERROR"},502,request)}
    const reply=outputText(payload);if(!reply)return json({ok:false,error:"Die KI hat keine Antwort geliefert."},502,request);
    return json({ok:true,reply,model:payload?.model||env.OPENAI_MODEL||"configured",local:false,approved:true,memory:{storeId:knowledge.storeId,revision:knowledge.revision}},200,request);
  }catch(error){const timedOut=error?.name==="AbortError";return json({ok:false,error:timedOut?"Die Anfrage dauerte zu lange.":"Der KI-Dienst ist nicht erreichbar."},timedOut?504:502,request)}finally{clearTimeout(timeout)}
}

export function onRequestOptions({request}){return new Response(null,{status:204,headers:corsHeaders(request)})}
export function onRequest({request}){return json({ok:false,error:"Nur POST-Anfragen sind erlaubt."},405,request)}
