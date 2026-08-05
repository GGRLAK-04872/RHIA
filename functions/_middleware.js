class BodyInjector {
  element(element) {
    element.append(`
<style>
#rhiaVoiceTestButton{
  position:fixed;
  left:18px;
  bottom:58px;
  z-index:9999;
  border:1px solid rgba(255,109,136,.45);
  border-radius:999px;
  padding:10px 14px;
  background:rgba(35,5,14,.92);
  color:#fff7fa;
  font:600 13px Arial,sans-serif;
  box-shadow:0 0 24px rgba(143,23,56,.22);
}
#rhiaVoiceTestStatus{
  position:fixed;
  left:18px;
  bottom:24px;
  z-index:9999;
  color:#d9b8c3;
  font:12px Arial,sans-serif;
  background:rgba(5,1,3,.82);
  padding:6px 9px;
  border-radius:8px;
  max-width:70vw;
}
</style>
<button id="rhiaVoiceTestButton" type="button">🔊 Stimme testen</button>
<div id="rhiaVoiceTestStatus">Bereit für Sprachtest</div>
<script>
(() => {
  const button = document.getElementById("rhiaVoiceTestButton");
  const status = document.getElementById("rhiaVoiceTestStatus");

  if (!button || !status) return;

  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    status.textContent = "Sprachausgabe wird von diesem Browser nicht unterstützt";
    button.disabled = true;
    return;
  }

  const synth = window.speechSynthesis;
  let lastSpoken = "";
  let speakTimer = null;
  let speakingToken = 0;

  function voiceEnabled() {
    try {
      const settings = JSON.parse(localStorage.getItem("rhia_settings_v010") || "{}");
      return settings.browserVoice === true;
    } catch {
      return false;
    }
  }

  function chooseGermanVoice() {
    const voices = synth.getVoices() || [];
    return voices.find(v => /^de(-|_)/i.test(v.lang) && /google|samsung|microsoft/i.test(v.name))
      || voices.find(v => /^de(-|_)/i.test(v.lang))
      || voices[0]
      || null;
  }

  function speakDirect(text, force = false, attempt = 0) {
    const cleanText = String(text || "").replace("RHIA_KOSTENFREIGABE", "").trim();
    if (!cleanText || (!force && !voiceEnabled())) return;

    const token = ++speakingToken;
    synth.cancel();
    synth.resume();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "de-DE";
    utterance.rate = 0.96;
    utterance.pitch = 0.92;
    utterance.volume = 1;

    const voice = chooseGermanVoice();
    if (voice) utterance.voice = voice;

    status.textContent = voice
      ? "Starte Stimme: " + voice.name
      : "Starte Standardstimme";

    utterance.onstart = () => {
      status.textContent = "Sprachausgabe läuft";
    };

    utterance.onend = () => {
      status.textContent = "Sprachausgabe beendet";
    };

    utterance.onerror = event => {
      status.textContent = "Sprachfehler: " + (event.error || "unbekannt");
      if (token === speakingToken && attempt < 2) {
        setTimeout(() => speakDirect(cleanText, force, attempt + 1), 500);
      }
    };

    setTimeout(() => {
      if (token === speakingToken) synth.speak(utterance);
    }, attempt === 0 ? 100 : 350);
  }

  function scheduleSpeech(text) {
    const cleanText = String(text || "").trim();
    if (!cleanText || cleanText === lastSpoken) return;
    lastSpoken = cleanText;
    clearTimeout(speakTimer);
    speakTimer = setTimeout(() => speakDirect(cleanText, false), 900);
  }

  function installObserver() {
    const target = document.getElementById("answerText");
    if (!target || target.dataset.rhiaSpeechObserved === "1") return;

    target.dataset.rhiaSpeechObserved = "1";
    const observer = new MutationObserver(() => scheduleSpeech(target.textContent));
    observer.observe(target, { childList: true, characterData: true, subtree: true });
  }

  button.addEventListener("click", () => {
    status.textContent = "Sprachtest wird gestartet";
    speakDirect("Sprachausgabe funktioniert, Sir.", true);
  });

  document.addEventListener("click", () => synth.resume(), { capture: true });
  document.addEventListener("touchstart", () => synth.resume(), { capture: true, passive: true });
  synth.addEventListener?.("voiceschanged", installObserver);

  installObserver();
  setTimeout(installObserver, 200);
  setTimeout(installObserver, 900);
})();
</script>
`, { html: true });
  }
}

export async function onRequest(context) {
  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("text/html")) return response;

  return new HTMLRewriter()
    .on("body", new BodyInjector())
    .transform(response);
}
