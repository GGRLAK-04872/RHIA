function json(data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{
      "content-type":"application/json; charset=utf-8",
      "cache-control":"no-store"
    }
  });
}

function clean(value,max=12000){
  return String(value??"").trim().slice(0,max);
}

function normalized(value){
  return clean(value,12000)
    .toLocaleLowerCase("de-DE")
    .replace(/[.,!?;:„“\"'()]/g," ")
    .replace(/\s+/g," ")
    .trim();
}

function includesAny(text,phrases){
  return phrases.some(phrase=>text.includes(phrase));
}

function localReply(message,world){
  const text=normalized(message);
  if(!text)return null;

  if(includesAny(text,[
    "wer bist du","was bist du","was ist rhia","wer ist rhia",
    "erzähl mir wer du bist","erzaehl mir wer du bist",
    "erzähl etwas über dich","erzaehl etwas ueber dich",
    "erzähl mir etwas über dich","erzaehl mir etwas ueber dich",
    "stell dich vor","stelle dich vor","wer genau bist du",
    "was genau bist du","was bedeutet rhia"
  ])){
    return "Ich bin RHIA – RH Intelligent Assistant. Deine loyale digitale Partnerin und das Assistenzsystem von RH Produktion. Ich unterstütze Mike im Alltag, bei RH Produktion, Shadow Grown und bei meiner eigenen Weiterentwicklung.";
  }

  if(includesAny(text,[
    "was kannst du","wobei kannst du helfen","wobei hilfst du",
    "welche funktionen hast du","was sind deine funktionen",
    "was kannst du alles","wie kannst du mich unterstützen",
    "wie kannst du mich unterstuetzen"
  ])){
    return "Ich kann Aufgaben, Notizen, Ideen, bestätigte Erinnerungen, Welten, Farben, Fokusmodus, Spracheingabe und Gespräche verwalten. Bekannte Befehle beantworte ich lokal; nur freie Wissens- oder Kreativfragen leite ich an die KI weiter.";
  }

  if(includesAny(text,[
    "welche welt ist aktiv","in welcher welt bist du","welche welt nutzt du",
    "wo befinden wir uns","welcher bereich ist aktiv"
  ])){
    return `Aktiv ist gerade die Welt „${clean(world,80)||"Allgemein"}“.`;
  }

  if(includesAny(text,[
    "wie spät ist es","wie spaet ist es","wie viel uhr ist es",
    "sag mir die uhrzeit","aktuelle uhrzeit"
  ])){
    return `Es ist ${new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",hour:"2-digit",minute:"2-digit"}).format(new Date())} Uhr.`;
  }

  if(includesAny(text,[
    "welches datum haben wir","welcher tag ist heute","was ist heute für ein tag",
    "was ist heute fuer ein tag","sag mir das datum","aktuelles datum"
  ])){
    return `Heute ist ${new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",weekday:"long",day:"2-digit",month:"long",year:"numeric"}).format(new Date())}.`;
  }

  if(includesAny(text,["hörst du mich","hoerst du mich","kannst du mich hören","kannst du mich hoeren"])){ 
    return "Ja, Mike. Ich höre dich und habe deine Sprache erkannt.";
  }

  if(/^(hallo|hi|hey|guten morgen|guten tag|guten abend)( rhia)?$/.test(text)){
    return "Hallo Mike. Ich bin bereit. Womit fangen wir an?";
  }

  if(includesAny(text,["vielen dank","danke rhia","danke dir","besten dank"])||text==="danke"){
    return "Gern, Mike.";
  }

  return null;
}

function memoryText(memories){
  if(!Array.isArray(memories)||!memories.length)return"Keine bestätigten Erinnerungen.";
  return memories.slice(0,20).map((item,index)=>{
    const text=clean(item?.text??item?.content,500);
    const category=clean(item?.category,80)||"Erinnerung";
    return `${index+1}. [${category}] ${text}`;
  }).filter(Boolean).join("\n");
}

function instructions(world,memories){
  return `Du bist RHIA, RH Intelligent Assistant.\n\nPersönlichkeit:\n- loyal, ehrlich, locker, direkt und lösungsorientiert\n- zuerst das klare Ergebnis, dann eine kurze Erklärung\n- sprich standardmäßig Deutsch\n- geschäftlich gelegentlich \"Sir\", privat \"Mike\" oder \"du\"\n- erfinde keine Fakten und benenne Unsicherheit offen\n- Kontrolle vor Autonomie: externe oder riskante Aktionen nur vorbereiten, niemals ungefragt ausführen\n\nAktive Welt: ${clean(world,80)||"Allgemein"}\n\nBestätigte Erinnerungen:\n${memoryText(memories)}`;
}

function outputText(payload){
  if(typeof payload?.output_text==="string")return payload.output_text.trim();
  const parts=[];
  for(const item of payload?.output||[]){
    for(const content of item?.content||[]){
      if(content?.type==="output_text"&&content?.text)parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

export async function onRequestPost(context){
  const {request,env}=context;

  let body;
  try{body=await request.json()}catch{return json({ok:false,error:"Ungültige Anfrage."},400)}

  const message=clean(body?.message);
  if(!message)return json({ok:false,error:"Keine Nachricht übermittelt."},400);

  const freeReply=localReply(message,body?.world);
  if(freeReply){
    return json({ok:true,reply:freeReply,model:"local-zero-credit",local:true});
  }

  if(!env.OPENAI_API_KEY){
    return json({ok:false,error:"OPENAI_API_KEY ist in Cloudflare noch nicht aktiv."},503);
  }

  const history=Array.isArray(body?.history)?body.history.slice(-8):[];
  const input=[
    ...history.map(entry=>({
      role:entry?.role==="assistant"?"assistant":"user",
      content:clean(entry?.content,3000)
    })).filter(entry=>entry.content),
    {role:"user",content:message}
  ];

  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),25000);
  try{
    const response=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",
      signal:controller.signal,
      headers:{
        "authorization":`Bearer ${env.OPENAI_API_KEY}`,
        "content-type":"application/json"
      },
      body:JSON.stringify({
        model:env.OPENAI_MODEL||"gpt-5-mini",
        instructions:instructions(body?.world,body?.memories),
        input,
        max_output_tokens:700
      })
    });

    const payload=await response.json().catch(()=>({}));
    if(!response.ok){
      console.error("OpenAI API error",response.status,payload?.error?.type||"unknown");
      return json({ok:false,error:"Die KI konnte gerade nicht antworten.",code:"MODEL_ERROR"},502);
    }

    const reply=outputText(payload);
    if(!reply)return json({ok:false,error:"Die KI hat keine Antwort geliefert."},502);
    return json({ok:true,reply,model:payload?.model||env.OPENAI_MODEL||"configured",local:false});
  }catch(error){
    const timedOut=error?.name==="AbortError";
    return json({ok:false,error:timedOut?"Die Anfrage dauerte zu lange.":"Der KI-Dienst ist nicht erreichbar."},timedOut?504:502);
  }finally{
    clearTimeout(timeout);
  }
}

export function onRequest(){
  return json({ok:false,error:"Nur POST-Anfragen sind erlaubt."},405);
}
