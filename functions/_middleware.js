class BodyInjector {
  element(element) {
    element.append(`
<script>
(() => {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;

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

  function speakReliable(text, attempt = 0) {
    const cleanText = String(text || "").replace("RHIA_KOSTENFREIGABE", "").trim();
    if (!cleanText || !voiceEnabled()) return;

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

    utterance.onerror = () => {
      if (token !== speakingToken) return;
      if (attempt < 2) setTimeout(() => speakReliable(cleanText, attempt + 1), 500);
    };

    setTimeout(() => {
      if (token === speakingToken) synth.speak(utterance);
    }, attempt === 0 ? 150 : 350);
  }

  function scheduleSpeech(text) {
    const cleanText = String(text || "").trim();
    if (!cleanText || cleanText === lastSpoken) return;
    lastSpoken = cleanText;
    clearTimeout(speakTimer);

    // Android beendet die Spracheingabe oft erst kurz nach der Texterkennung.
    // Deshalb startet die Ausgabe bewusst verzögert.
    speakTimer = setTimeout(() => speakReliable(cleanText), 900);
  }

  function installObserver() {
    const target = document.getElementById("answerText");
    if (!target || target.dataset.rhiaSpeechObserved === "1") return;

    target.dataset.rhiaSpeechObserved = "1";
    const observer = new MutationObserver(() => scheduleSpeech(target.textContent));
    observer.observe(target, { childList: true, characterData: true, subtree: true });
  }

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
