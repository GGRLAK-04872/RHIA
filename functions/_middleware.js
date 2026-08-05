class BodyInjector {
  element(element) {
    element.append(`
<script>
(() => {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;

  const synth = window.speechSynthesis;
  let speakingToken = 0;

  function chooseGermanVoice() {
    const voices = synth.getVoices() || [];
    return voices.find(v => /^de(-|_)/i.test(v.lang) && /google|samsung|microsoft/i.test(v.name))
      || voices.find(v => /^de(-|_)/i.test(v.lang))
      || voices[0]
      || null;
  }

  function speakReliable(text, attempt = 0) {
    const cleanText = String(text || "").replace("RHIA_KOSTENFREIGABE", "").trim();
    if (!cleanText) return;

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

    utterance.onend = () => {
      if (token === speakingToken && typeof window.setMode === "function") window.setMode("idle");
    };

    utterance.onerror = () => {
      if (token !== speakingToken) return;
      if (attempt < 2) {
        setTimeout(() => speakReliable(cleanText, attempt + 1), 250);
      } else if (typeof window.setMode === "function") {
        window.setMode("idle");
      }
    };

    setTimeout(() => {
      if (token === speakingToken) synth.speak(utterance);
    }, attempt === 0 ? 80 : 220);
  }

  const install = () => {
    if (typeof window.say !== "function" || window.say.__rhiaSpeechPatched) return;

    const originalSay = window.say;
    const patchedSay = function(text) {
      originalSay(text, false);
      speakReliable(text);
    };
    patchedSay.__rhiaSpeechPatched = true;
    window.say = patchedSay;
  };

  synth.addEventListener?.("voiceschanged", install);
  document.addEventListener("click", () => synth.resume(), { once: true, capture: true });
  document.addEventListener("touchstart", () => synth.resume(), { once: true, capture: true, passive: true });

  install();
  setTimeout(install, 150);
  setTimeout(install, 700);
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
