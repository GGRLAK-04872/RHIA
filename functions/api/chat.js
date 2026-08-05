function json(data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{
      "content-type":"application/json; charset=utf-8",
      "cache-control":"no-store"
    }
  });
}
function clean(value,max=12000){return String(value??"").trim().slice(0,max)}
function normalized(value){return clean(value,12000).toLocaleLowerCase("de-DE").replace(/[.,!?;:„“\"'()]/g," ").replace(/\s+/g," ").trim()}
function includesAny(text,phrases){return phrases.some(phrase=>text.includes(phrase))}
function localReply(message,world){
  const text=normalized(message);if(!text)return null;
  if(includesAny(text,["wer bist du","was bist du","was ist rhia","wer ist rhia","erzähl mir wer du bist","erzaehl mir wer du bist","erzähl etwas über dich","erzaehl etwas ueber dich","erzähl mir etwas über dich","erzaehl mir etwas ueber dich","stell dich vor","stelle dich vor","wer genau bist du","was genau bist du","was bedeutet rhia"]))return"Ich bin RHIA – RH Intelligent Assistant. Ihre loyale digitale Partnerin und das Assistenzsystem von RH Produktion, Sir. Ich unterstütze Sie im Alltag, bei RH Produktion, Shadow Grown und bei meiner eigenen Weiterentwicklung.";
  if(includesAny(text,["wie geht es dir","wie gehts dir","wie geht's dir","wie fühlst du dich","wie fuehlst du dich","alles gut bei dir"]))return"Mir geht es gut, Sir. Ich bin bereit – was machen wir heute?";
  if(includesAny(text,["was kannst du","wobei kannst du helfen","wobei hilfst du","welche funktionen hast du","was sind deine funktionen","was kannst du alles","wie kannst du mich unterstützen","wie kannst du mich unterstuetzen"]))return"Ich kann Aufgaben, Notizen, Ideen, bestätigte Erinnerungen, Welten, Farben, Fokusmodus, Spracheingabe und Gespräche verwalten, Sir. Bekannte Befehle beantworte ich lokal; nur freie Wissens- oder Kreativfragen leite ich nach Ihrer Kostenbestätigung an die KI weiter.";
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
function estimateCost(message,history){
  const historyChars=(Array.isArray(history)?history:[]).reduce((sum,item)=>sum+clean(item?.content,3000).length,0);
  const inputTokens=Math.max(180,Math.ceil((clean(message).length+historyChars+1800)/3.5));
  const inputCostCent=(inputTokens/1_000_000)*.25*100;
  const lowCent=inputCostCent+(220/1_000_000)*2*100;
  const highCent=inputCostCent+(700/1_000_000)*2*100;
  return{lowCent,highCent};
}
function formatCent(value){return value.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})+" Cent"}
function costWarning(message,history){
  const estimate=estimateCost(message,history);
  return`${COST_MARKER}\nSir, diese Anfrage nutzt die Online-KI. Die geschätzten Kosten liegen ungefähr zwischen ${formatCent(estimate.lowCent)} und ${formatCent(estimate.highCent)}. Der genaue Betrag hängt vor allem von der Antwortlänge und dem Gesprächskontext ab. Soll ich fortfahren? Bitte antworten Sie mit Ja oder Nein.`;
}
function memoryText(memories){if(!Array.isArray(memories)||!memories.length)return"Keine bestätigten Erinnerungen.";return memories.slice(0,20).map((item,index)=>{const text=clean(item?.text??item?.content,500);const category=clean(item?.category,80)||"Erinnerung";return`${index+1}. [${category}] ${text}`}).filter(Boolean).join("\n")}
function instructions(world,memories){return`Du bist RHIA, RH Intelligent Assistant.\n\nPersönlichkeit:\n- loyal, ehrlich, elegant, ruhig, direkt und lösungsorientiert\n- beantworte immer zuerst die konkrete letzte Frage; stelle dich nur vor, wenn ausdrücklich nach deiner Identität gefragt wird\n- antworte natürlich und situationsgerecht statt einen allgemeinen Standardsatz zu wiederholen\n- zuerst das klare Ergebnis, dann eine kurze Erklärung\n- sprich standardmäßig Deutsch\n- sprich den Nutzer vorerst ausschließlich mit \"Sir\" an; verwende niemals den Namen Mike\n- verwende gelegentlich natürliche Einleitungen wie \"Natürlich, Sir.\", \"Jawohl, Sir.\" oder \"Einen Moment, Sir.\", aber nicht in jeder Antwort\n- erfinde keine Fakten und benenne Unsicherheit offen\n- Kontrolle vor Autonomie: externe oder riskante Aktionen nur vorbereiten, niemals ungefragt ausführen\n\nAktive Welt: ${clean(world,80)||"Allgemein"}\n\nBestätigte Erinnerungen:\n${memoryText(memories)}`}
function outputText(payload){if(typeof payload?.output_text==="string")return payload.output_text.trim();const parts=[];for(const item of payload?.output||[])for(const content of item?.content||[])if(content?.type==="output_text"&&content?.text)parts.push(content.text);return parts.join("\n").trim()}
export async function onRequestPost(context){
  const{request,env}=context;let body;try{body=await request.json()}catch{return json({ok:false,error:"Ungültige Anfrage."},400)}
  const incomingMessage=clean(body?.message);if(!incomingMessage)return json({ok:false,error:"Keine Nachricht übermittelt."},400);
  const history=Array.isArray(body?.history)?body.history.slice(-8):[],pendingQuestion=findPendingQuestion(history);
  if(pendingQuestion&&isNo(incomingMessage))return json({ok:true,reply:"Abgebrochen, Sir. Es wurden keine OpenAI-Credits verwendet.",model:"local-zero-credit",local:true,cancelled:true});
  let message=incomingMessage,approved=false;if(pendingQuestion&&isYes(incomingMessage)){message=pendingQuestion;approved=true}
  if(!approved){const freeReply=localReply(message,body?.world);if(freeReply)return json({ok:true,reply:freeReply,model:"local-zero-credit",local:true});if(pendingQuestion)return json({ok:true,reply:"Bitte antworten Sie mit Ja, um die angekündigte kostenpflichtige Anfrage auszuführen, oder mit Nein, um sie abzubrechen, Sir.",model:"local-zero-credit",local:true});return json({ok:true,reply:costWarning(message,history),model:"local-cost-check",local:true,requiresConfirmation:true})}
  if(!env.OPENAI_API_KEY)return json({ok:false,error:"OPENAI_API_KEY ist in Cloudflare noch nicht aktiv."},503);
  const usableHistory=history.filter(entry=>!String(entry?.content||"").includes(COST_MARKER));
  const input=[...usableHistory.map(entry=>({role:entry?.role==="assistant"?"assistant":"user",content:clean(entry?.content,3000)})).filter(entry=>entry.content&&entry.content!==message),{role:"user",content:message}];
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000);
  try{
    const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",signal:controller.signal,headers:{authorization:`Bearer ${env.OPENAI_API_KEY}`,"content-type":"application/json"},body:JSON.stringify({model:env.OPENAI_MODEL||"gpt-5-mini",instructions:instructions(body?.world,body?.memories),input,max_output_tokens:700})});
    const payload=await response.json().catch(()=>({}));if(!response.ok){console.error("OpenAI API error",response.status,payload?.error?.type||"unknown");return json({ok:false,error:"Die KI konnte gerade nicht antworten.",code:"MODEL_ERROR"},502)}
    const reply=outputText(payload);if(!reply)return json({ok:false,error:"Die KI hat keine Antwort geliefert."},502);return json({ok:true,reply,model:payload?.model||env.OPENAI_MODEL||"configured",local:false,approved:true});
  }catch(error){const timedOut=error?.name==="AbortError";return json({ok:false,error:timedOut?"Die Anfrage dauerte zu lange.":"Der KI-Dienst ist nicht erreichbar."},timedOut?504:502)}finally{clearTimeout(timeout)}
}
export function onRequest(){return json({ok:false,error:"Nur POST-Anfragen sind erlaubt."},405)}
