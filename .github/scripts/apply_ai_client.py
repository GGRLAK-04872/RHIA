from pathlib import Path

path = Path("index.html")
text = path.read_text(encoding="utf-8")

marker = "function handle(raw){"
ai_code = '''
const AI_ENDPOINT="/api/chat";
let aiRequestRunning=false;

function aiHistory(currentMessage){
  const entries=state.chat.slice(-10);
  if(entries.length&&entries[entries.length-1].type==="user"&&entries[entries.length-1].text===currentMessage){
    entries.pop();
  }
  return entries.slice(-8).map(entry=>({
    role:entry.type==="rhia"?"assistant":"user",
    content:entry.text
  }));
}

function aiMemories(){
  return state.memories.slice(-20).map(memory=>({
    text:memory.content||memory.text||"",
    category:memory.category||"Allgemein",
    world:memory.world||state.settings.world||"Allgemein"
  })).filter(memory=>memory.text);
}

async function askAI(message){
  const clean=String(message||"").trim();
  if(!clean){showReply("Was möchtest du wissen?",false);return}
  if(aiRequestRunning){showReply("Einen Moment bitte, ich bearbeite noch deine vorige Anfrage.",false);return}

  aiRequestRunning=true;
  setVisualState("thinking");
  replyText.textContent="Ich denke nach …";
  command.disabled=true;

  try{
    const response=await fetch(AI_ENDPOINT,{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        message:clean,
        world:state.settings.world||"Allgemein",
        memories:aiMemories(),
        history:aiHistory(clean)
      })
    });

    const payload=await response.json().catch(()=>({}));
    if(!response.ok||!payload.ok){
      throw new Error(payload.error||"KI-Verbindung fehlgeschlagen");
    }

    showReply(payload.reply||"Ich habe gerade keine verwertbare Antwort erhalten.");
  }catch(error){
    console.error("RHIA AI error",error);
    showReply("Meine KI-Verbindung ist gerade nicht erreichbar. Deine lokalen Funktionen bleiben aktiv.",false);
  }finally{
    aiRequestRunning=false;
    command.disabled=false;
    command.focus();
  }
}

'''

if "const AI_ENDPOINT=" not in text:
    if marker not in text:
        raise SystemExit("handle function marker not found")
    text = text.replace(marker, ai_code + marker, 1)

old = '  showReply("Ich verstehe diesen freien Satz noch nicht sicher genug. Ich erfinde deshalb keine Antwort. Formuliere ihn als Aufgabe, Notiz, Idee oder Weltwechsel.",false);'
if old in text:
    text = text.replace(old, '  askAI(cleaned);', 1)
elif '  askAI(cleaned);' not in text:
    raise SystemExit("free sentence fallback not found")

text = text.replace("<title>RHIA Alpha v0.10.0</title>", "<title>RHIA Alpha v0.14.0</title>")
text = text.replace('<div class="version">Alpha v0.10.0</div>', '<div class="version">Alpha v0.14.0</div>')
text = text.replace('const VERSION="0.10.0";', 'const VERSION="0.14.0";')
text = text.replace("Lokale Alpha · Chat läuft im Hintergrund", "Hybrid-Alpha · Lokale Funktionen + sichere KI")

path.write_text(text, encoding="utf-8")
