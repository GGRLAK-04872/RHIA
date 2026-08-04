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
  if(!env.OPENAI_API_KEY){
    return json({ok:false,error:"OPENAI_API_KEY ist in Cloudflare noch nicht aktiv."},503);
  }

  let body;
  try{body=await request.json()}catch{return json({ok:false,error:"Ungültige Anfrage."},400)}

  const message=clean(body?.message);
  if(!message)return json({ok:false,error:"Keine Nachricht übermittelt."},400);

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
    return json({ok:true,reply,model:payload?.model||env.OPENAI_MODEL||"configured"});
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
