const JSON_HEADERS={"content-type":"application/json; charset=utf-8"};

function corsHeaders(origin,allowedOrigin){
  const allowed=origin===allowedOrigin?origin:"";
  return {
    "access-control-allow-origin":allowed,
    "access-control-allow-methods":"POST,OPTIONS",
    "access-control-allow-headers":"content-type,x-rhia-client",
    "access-control-max-age":"86400",
    "vary":"Origin"
  };
}

function json(data,status=200,headers={}){
  return new Response(JSON.stringify(data),{status,headers:{...JSON_HEADERS,...headers}});
}

function cleanText(value,max=12000){
  return String(value??"").trim().slice(0,max);
}

function cleanMemories(value){
  if(!Array.isArray(value))return[];
  return value.slice(0,20).map(item=>({
    text:cleanText(item?.text??item?.content,500),
    category:cleanText(item?.category,80),
    world:cleanText(item?.world,80)
  })).filter(item=>item.text);
}

function buildInstructions(world,memories){
  const memoryText=memories.length
    ?memories.map((m,i)=>`${i+1}. [${m.category||m.world||"Erinnerung"}] ${m.text}`).join("\n")
    :"Keine bestätigten Erinnerungen für diese Anfrage.";

  return `Du bist RHIA, RH Intelligent Assistant.\n\nPersönlichkeit:\n- loyal, ehrlich, locker, direkt und lösungsorientiert\n- zuerst klares Ergebnis, danach kurze Erklärung\n- geschäftlich gelegentlich \"Sir\", privat \"Mike\" oder \"du\"\n- keine erfundenen Fakten; Unsicherheit klar benennen\n- Kontrolle vor Autonomie: externe oder riskante Aktionen nur vorbereiten, niemals ungefragt ausführen\n\nAktive Welt: ${world||"Allgemein"}\n\nBestätigte passende Erinnerungen:\n${memoryText}\n\nAntworte standardmäßig auf Deutsch.`;
}

function extractOutputText(payload){
  if(typeof payload?.output_text==="string")return payload.output_text.trim();
  const parts=[];
  for(const item of payload?.output||[]){
    for(const content of item?.content||[]){
      if(content?.type==="output_text"&&content?.text)parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

export default{
  async fetch(request,env){
    const origin=request.headers.get("origin")||"";
    const allowedOrigin=env.RHIA_ALLOWED_ORIGIN||"https://ggrlak-04872.github.io";
    const cors=corsHeaders(origin,allowedOrigin);

    if(request.method==="OPTIONS"){
      if(origin!==allowedOrigin)return new Response(null,{status:403});
      return new Response(null,{status:204,headers:cors});
    }

    const url=new URL(request.url);
    if(url.pathname==="/health"){
      return json({ok:true,service:"rhia-ai-gateway",model:env.OPENAI_MODEL||"configured-server-side"},200,cors);
    }

    if(url.pathname!=="/api/chat"||request.method!=="POST"){
      return json({ok:false,error:"Not found"},404,cors);
    }

    if(origin!==allowedOrigin){
      return json({ok:false,error:"Origin nicht erlaubt."},403,cors);
    }

    if(!env.OPENAI_API_KEY){
      return json({ok:false,error:"Der KI-Dienst ist noch nicht konfiguriert."},503,cors);
    }

    let body;
    try{body=await request.json()}catch{return json({ok:false,error:"Ungültige Anfrage."},400,cors)}

    const message=cleanText(body?.message);
    if(!message)return json({ok:false,error:"Keine Nachricht übermittelt."},400,cors);

    const memories=cleanMemories(body?.memories);
    const world=cleanText(body?.world,80)||"Allgemein";
    const history=Array.isArray(body?.history)?body.history.slice(-8):[];
    const input=[
      ...history.map(entry=>({
        role:entry?.role==="assistant"?"assistant":"user",
        content:cleanText(entry?.content,3000)
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
          instructions:buildInstructions(world,memories),
          input,
          max_output_tokens:700
        })
      });

      const payload=await response.json().catch(()=>({}));
      if(!response.ok){
        console.error("OpenAI error",response.status,payload?.error?.type||"unknown");
        return json({ok:false,error:"Die KI konnte gerade nicht antworten.",code:"MODEL_ERROR"},502,cors);
      }

      const reply=extractOutputText(payload);
      if(!reply)return json({ok:false,error:"Die KI hat keine verwertbare Antwort geliefert."},502,cors);

      return json({ok:true,reply,provider:"OpenAI",model:payload?.model||env.OPENAI_MODEL||"configured"},200,cors);
    }catch(error){
      const timedOut=error?.name==="AbortError";
      return json({ok:false,error:timedOut?"Die KI-Anfrage hat zu lange gedauert.":"Der KI-Dienst ist nicht erreichbar.",code:timedOut?"TIMEOUT":"NETWORK_ERROR"},504,cors);
    }finally{
      clearTimeout(timeout);
    }
  }
};
