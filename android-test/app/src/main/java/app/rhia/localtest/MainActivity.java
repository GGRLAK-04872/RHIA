package app.rhia.localtest;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.Voice;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.content.Intent;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Locale;

public final class MainActivity extends Activity implements RecognitionListener {
    private static final int MIC_PERMISSION = 41;
    private static final String UI_URL = "https://ggrlak-04872.github.io/RHIA/";
    private static final String UI_FILE = "rhia-ui.html";
    private WebView web;
    private SpeechRecognizer recognizer;
    private TextToSpeech tts;
    private boolean ttsOfflineReady;
    private boolean reconnectAttempted;
    private boolean recognitionInProgress;
    private boolean listeningRequested;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(0xff030102);
        getWindow().setNavigationBarColor(0xff030102);
        web = new WebView(this);
        web.setBackgroundColor(0xff030102);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.addJavascriptInterface(new AndroidBridge(), "RHIAAndroid");
        web.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView view, String url) { installNativeBridge(); }
        });
        setContentView(web);
        initLocalVoice();
        loadLatestApprovedUi();
    }

    private void loadLatestApprovedUi() {
        File cached = new File(getFilesDir(), UI_FILE);
        if (cached.isFile()) loadUi(cached);
        new Thread(() -> {
            try {
                HttpURLConnection connection = (HttpURLConnection) new URL(UI_URL + "?android-ui=" + System.currentTimeMillis()).openConnection();
                connection.setConnectTimeout(6000);
                connection.setReadTimeout(9000);
                connection.setRequestProperty("Accept", "text/html");
                if (connection.getResponseCode() != 200) throw new IllegalStateException("HTTP " + connection.getResponseCode());
                byte[] bytes;
                try (InputStream input = connection.getInputStream()) { bytes = input.readAllBytes(); }
                String html = new String(bytes, StandardCharsets.UTF_8);
                if (!html.contains("RH INTELLIGENT ASSISTANT") || !html.contains("id=\"canvas\"")) {
                    throw new IllegalStateException("Ungültige RHIA-Oberfläche");
                }
                File temporary = new File(getFilesDir(), UI_FILE + ".new");
                try (FileOutputStream output = new FileOutputStream(temporary)) { output.write(bytes); }
                if (!temporary.renameTo(cached)) throw new IllegalStateException("Oberfläche konnte nicht gespeichert werden");
                runOnUiThread(() -> loadUi(cached));
            } catch (Exception ignored) {
                if (!cached.isFile()) runOnUiThread(() -> web.loadUrl(UI_URL));
            }
        }, "rhia-ui-sync").start();
    }

    private void loadUi(File file) {
        try {
            String html = new String(java.nio.file.Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8);
            web.loadDataWithBaseURL(UI_URL, html, "text/html", "UTF-8", UI_URL);
        } catch (Exception ignored) { web.loadUrl(UI_URL); }
    }

    private void installNativeBridge() {
        String script = "javascript:(function(){" +
                "try{if(typeof speechRecognizer!=='undefined'&&speechRecognizer){speechRecognizer.abort();speechRecognizer=null;}if(typeof recognitionActive!=='undefined')recognitionActive=false;}catch(ignore){}" +
                "function bindNativeButton(id,action){var oldButton=document.getElementById(id);if(!oldButton||!oldButton.parentNode)return null;var button=oldButton.cloneNode(true);oldButton.parentNode.replaceChild(button,oldButton);button.disabled=false;button.removeAttribute('disabled');button.style.touchAction='manipulation';button.addEventListener('click',function(event){event.preventDefault();event.stopPropagation();action();},false);return button;}" +
                "window.startSpeechRecognition=function(){RHIAAndroid.startLocalListening();};window.testBrowserVoice=function(){RHIAAndroid.testLocalVoice();};" +
                "bindNativeButton('mic',function(){RHIAAndroid.startLocalListening();});" +
                "bindNativeButton('speechInputTest',function(){RHIAAndroid.startLocalListening();});" +
                "bindNativeButton('voiceTest',function(){RHIAAndroid.testLocalVoice();});" +
                "var inputStatus=document.getElementById('speechInputStatus');if(inputStatus)inputStatus.textContent='Lokale Android-Spracherkennung bereit · App v" + BuildConfig.VERSION_NAME + "';" +
                "var voiceStatus=document.getElementById('voiceTestStatus');if(voiceStatus)voiceStatus.textContent='Lokale Android-Stimme bereit zum Test';" +
                "window.rhiaAndroidState=function(mode,text){var s=document.getElementById('stage');if(s)s.className='stage '+mode;var c=document.getElementById('coreState');if(c)c.textContent=text;var t=document.getElementById('topState');if(t)t.textContent=text;};" +
                "})();";
        web.evaluateJavascript(script, null);
    }

    public final class AndroidBridge {
        @JavascriptInterface public void startLocalListening() { runOnUiThread(MainActivity.this::startListening); }
        @JavascriptInterface public void testLocalVoice() { runOnUiThread(MainActivity.this::testLocalVoice); }
    }

    private void setState(String mode, String message) {
        String safe = message.replace("\\", "\\\\").replace("'", "\\'");
        web.evaluateJavascript("window.rhiaAndroidState&&window.rhiaAndroidState('" + mode + "','" + safe + "')", null);
    }

    private void startListening() {
        if (recognitionInProgress) return;
        listeningRequested = true;
        recognitionInProgress = true;
        setState("thinking", "MIKROFON WIRD GESTARTET");
        if (!SpeechRecognizer.isOnDeviceRecognitionAvailable(this)) {
            recognitionInProgress = false;
            setState("error", "DEUTSCHES OFFLINE-SPRACHPAKET FEHLT");
            return;
        }
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            recognitionInProgress = false;
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, MIC_PERMISSION);
            return;
        }
        reconnectAttempted = false;
        recreateRecognizer();
        beginLocalRecognition();
    }

    private Intent germanRecognitionIntent() {
        return new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
                .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "de-DE")
                .putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
                .putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5);
    }

    private void recreateRecognizer() {
        if (recognizer != null) recognizer.destroy();
        recognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(this);
        recognizer.setRecognitionListener(this);
    }

    private void beginLocalRecognition() {
        if (!listeningRequested) return;
        recognitionInProgress = true;
        setState("listening", "ZUHÖREN");
        recognizer.startListening(germanRecognitionIntent());
    }

    private void continueListening(long delayMillis) {
        recognitionInProgress = false;
        if (!listeningRequested) return;
        web.postDelayed(() -> {
            if (!listeningRequested) return;
            recreateRecognizer();
            beginLocalRecognition();
        }, delayMillis);
    }

    @Override public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(code, permissions, results);
        recognitionInProgress = false;
        if (code == MIC_PERMISSION && results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) startListening();
        else setState("error", "MIKROFONZUGRIFF FEHLT");
    }

    private void initLocalVoice() {
        tts = new TextToSpeech(this, result -> {
            if (result != TextToSpeech.SUCCESS) return;
            tts.setLanguage(Locale.GERMANY);
            Voice offline = tts.getVoices().stream().filter(v -> !v.isNetworkConnectionRequired())
                    .filter(v -> v.getLocale().getLanguage().equals(Locale.GERMAN.getLanguage()))
                    .min(Comparator.comparing(Voice::getName)).orElse(null);
            if (offline != null) { tts.setVoice(offline); tts.setSpeechRate(.92f); tts.setPitch(.88f); ttsOfflineReady = true; }
        });
    }

    private void testLocalVoice() {
        if (!ttsOfflineReady) {
            setState("error", "LOKALE DEUTSCHE STIMME FEHLT");
            return;
        }
        setState("speaking", "SPRACHAUSGABE LÄUFT");
        tts.speak("Sprachausgabe funktioniert, Sir.", TextToSpeech.QUEUE_FLUSH, null, "rhia-voice-test");
        web.postDelayed(() -> setState("", "BEREIT"), 2400);
    }

    private static boolean isWakeWord(String raw) {
        String text = Normalizer.normalize(raw.toLowerCase(Locale.GERMAN), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").replaceAll("[^a-z ]", " ").trim();
        return text.matches(".*\\b(rhia|riha|ria|rhea)\\b.*");
    }

    @Override public void onResults(Bundle bundle) {
        recognitionInProgress = false;
        ArrayList<String> choices = bundle.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        boolean matched = choices != null && choices.stream().anyMatch(MainActivity::isWakeWord);
        if (matched) {
            setState("speaking", "JA, SIR?");
            if (ttsOfflineReady) tts.speak("Ja, Sir?", TextToSpeech.QUEUE_FLUSH, null, "rhia-wake");
            web.postDelayed(() -> {
                setState("listening", "ZUHÖREN");
                continueListening(0);
            }, 1800);
        } else {
            setState("listening", "WEITER ZUHÖREN");
            continueListening(250);
        }
    }

    @Override public void onError(int error) {
        if (error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT) {
            setState("listening", "WEITER ZUHÖREN");
            continueListening(250);
            return;
        }
        if (error == SpeechRecognizer.ERROR_SERVER_DISCONNECTED && !reconnectAttempted) {
            reconnectAttempted = true;
            setState("thinking", "LOKALEN SPRACHDIENST NEU VERBINDEN");
            continueListening(600);
            return;
        }
        recognitionInProgress = false;
        listeningRequested = false;
        String message = switch (error) {
            case SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "NICHTS ERKANNT";
            case SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED, SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE -> "DEUTSCHES OFFLINE-SPRACHPAKET FEHLT";
            case SpeechRecognizer.ERROR_SERVER_DISCONNECTED -> "LOKALER SPRACHDIENST GETRENNT · ERNEUT TIPPEN";
            default -> "LOKALER SPRACHTEST FEHLGESCHLAGEN · CODE " + error;
        };
        setState("error", message);
    }
    @Override public void onReadyForSpeech(Bundle params) { setState("listening", "JETZT SPRECHEN"); }
    @Override public void onBeginningOfSpeech() { setState("listening", "SPRACHE ERKANNT"); }
    @Override public void onEndOfSpeech() { setState("thinking", "LOKAL AUSWERTEN"); }
    @Override public void onRmsChanged(float rmsdB) {}
    @Override public void onBufferReceived(byte[] buffer) {}
    @Override public void onPartialResults(Bundle partialResults) {
        ArrayList<String> choices = partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (choices != null && !choices.isEmpty()) setState("listening", "SPRACHE WIRD ERKANNT");
    }
    @Override public void onEvent(int eventType, Bundle params) {}

    @Override protected void onDestroy() {
        listeningRequested = false;
        if (recognizer != null) recognizer.destroy();
        if (tts != null) tts.shutdown();
        web.removeJavascriptInterface("RHIAAndroid");
        web.destroy();
        super.onDestroy();
    }
}
