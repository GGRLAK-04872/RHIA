package app.rhia.localtest;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.TextView;

import org.vosk.Model;
import org.vosk.Recognizer;
import org.vosk.android.RecognitionListener;
import org.vosk.android.SpeechService;
import org.vosk.android.StorageService;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

public final class MainActivity extends Activity implements RecognitionListener {
    private static final int MIC_PERMISSION = 41;
    private static final long MAX_LISTENING_MS = 10_000L;
    private static final String UI_URL = "https://ggrlak-04872.github.io/RHIA/";
    private static final String UI_FILE = "rhia-ui.html";
    private WebView web;
    private TextView diagnostic;
    private Model model;
    private SpeechService speechService;
    private boolean listening;
    private boolean listenAfterPermission;
    private boolean modelLoading = true;

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
            @Override public void onPageFinished(WebView view, String url) {
                installNativeBridge();
            }
        });

        FrameLayout root = new FrameLayout(this);
        root.addView(web, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        diagnostic = new TextView(this);
        diagnostic.setTextColor(Color.WHITE);
        diagnostic.setBackgroundColor(0xdd5b1025);
        diagnostic.setTextSize(13);
        diagnostic.setGravity(Gravity.CENTER);
        diagnostic.setPadding(16, 10, 16, 10);
        diagnostic.setText("OFFLINE-SPRACHTEST " + BuildConfig.VERSION_NAME + " · MODELL WIRD GELADEN");
        FrameLayout.LayoutParams diagnosticLayout = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM);
        root.addView(diagnostic, diagnosticLayout);

        setContentView(root);
        loadLatestApprovedUi();
        prepareOfflineModel();
    }

    private void prepareOfflineModel() {
        setDiagnostic("DEUTSCHES MODELL WIRD VORBEREITET");
        StorageService.unpack(
                this,
                "model-de",
                "model-de",
                unpacked -> runOnUiThread(() -> {
                    model = unpacked;
                    modelLoading = false;
                    setDiagnostic("BEREIT · RHIA ANTIPPEN");
                    setState("", "OFFLINE BEREIT");
                }),
                error -> runOnUiThread(() -> {
                    modelLoading = false;
                    setDiagnostic("MODELLFEHLER · " + shortError(error));
                    setState("error", "OFFLINE-MODELL FEHLER");
                }));
    }

    private void loadLatestApprovedUi() {
        File cached = new File(getFilesDir(), UI_FILE);
        if (cached.isFile()) loadUi(cached);
        new Thread(() -> {
            try {
                HttpURLConnection connection = (HttpURLConnection) new URL(
                        UI_URL + "?android-ui=" + System.currentTimeMillis()).openConnection();
                connection.setConnectTimeout(6000);
                connection.setReadTimeout(9000);
                connection.setRequestProperty("Accept", "text/html");
                if (connection.getResponseCode() != 200) {
                    throw new IllegalStateException("HTTP " + connection.getResponseCode());
                }
                byte[] bytes;
                try (InputStream input = connection.getInputStream()) {
                    bytes = input.readAllBytes();
                }
                String html = new String(bytes, StandardCharsets.UTF_8);
                if (!html.contains("RH INTELLIGENT ASSISTANT") || !html.contains("id=\"canvas\"")) {
                    throw new IllegalStateException("Ungültige RHIA-Oberfläche");
                }
                File temporary = new File(getFilesDir(), UI_FILE + ".new");
                try (FileOutputStream output = new FileOutputStream(temporary)) {
                    output.write(bytes);
                }
                if (!temporary.renameTo(cached)) {
                    throw new IllegalStateException("Oberfläche konnte nicht gespeichert werden");
                }
                runOnUiThread(() -> loadUi(cached));
            } catch (Exception ignored) {
                if (!cached.isFile()) runOnUiThread(() -> web.loadUrl(UI_URL));
            }
        }, "rhia-ui-sync").start();
    }

    private void loadUi(File file) {
        try {
            String html = new String(
                    java.nio.file.Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8);
            web.loadDataWithBaseURL(UI_URL, html, "text/html", "UTF-8", UI_URL);
        } catch (Exception ignored) {
            web.loadUrl(UI_URL);
        }
    }

    private void installNativeBridge() {
        String script = "javascript:(function(){" +
                "try{if(typeof speechRecognizer!=='undefined'&&speechRecognizer){speechRecognizer.abort();speechRecognizer=null;}if(typeof recognitionActive!=='undefined')recognitionActive=false;}catch(ignore){}" +
                "window.startSpeechRecognition=function(){};" +
                "var mic=document.getElementById('mic');if(mic)mic.style.display='none';" +
                "var stage=document.getElementById('stage');if(stage&&!stage.dataset.rhiaOffline){stage.dataset.rhiaOffline='1';stage.style.touchAction='manipulation';stage.addEventListener('click',function(event){if(event.target.closest&&event.target.closest('button'))return;RHIAAndroid.toggleOfflineListening();},false);}" +
                "var oldButton=document.getElementById('speechInputTest');if(oldButton&&oldButton.parentNode){var button=oldButton.cloneNode(true);oldButton.parentNode.replaceChild(button,oldButton);button.disabled=false;button.textContent='Offline-Sprache testen';button.addEventListener('click',function(event){event.preventDefault();event.stopPropagation();RHIAAndroid.toggleOfflineListening();},false);}" +
                "var inputStatus=document.getElementById('speechInputStatus');if(inputStatus)inputStatus.textContent='Lokale deutsche Spracherkennung · App v" + BuildConfig.VERSION_NAME + "';" +
                "var voiceStatus=document.getElementById('voiceTestStatus');if(voiceStatus)voiceStatus.textContent='Keine Aufnahme wird hochgeladen';" +
                "window.rhiaAndroidState=function(mode,text){var s=document.getElementById('stage');if(s)s.className='stage '+mode;var c=document.getElementById('coreState');if(c)c.textContent=text;var t=document.getElementById('topState');if(t)t.textContent=text;};" +
                "})();";
        web.evaluateJavascript(script, null);
    }

    public final class AndroidBridge {
        @JavascriptInterface public void toggleOfflineListening() {
            runOnUiThread(MainActivity.this::toggleOfflineListening);
        }
    }

    private void toggleOfflineListening() {
        if (listening) {
            stopOfflineListening();
        } else {
            startOfflineListening();
        }
    }

    private void startOfflineListening() {
        if (modelLoading) {
            setDiagnostic("BITTE WARTEN · MODELL WIRD NOCH GELADEN");
            return;
        }
        if (model == null) {
            setDiagnostic("OFFLINE-MODELL NICHT BEREIT");
            setState("error", "MODELL NICHT BEREIT");
            return;
        }
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            listenAfterPermission = true;
            setDiagnostic("MIKROFON-BERECHTIGUNG");
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, MIC_PERMISSION);
            return;
        }

        stopSpeechService();
        try {
            Recognizer recognizer = new Recognizer(model, 16_000.0f);
            speechService = new SpeechService(recognizer, 16_000.0f);
            listening = true;
            speechService.startListening(this);
            setDiagnostic("HÖRT OFFLINE ZU · NOCHMAL TIPPEN ZUM STOPPEN");
            setState("listening", "JETZT SPRECHEN");
            web.postDelayed(() -> {
                if (listening) stopOfflineListening();
            }, MAX_LISTENING_MS);
        } catch (Exception error) {
            stopSpeechService();
            setDiagnostic("STARTFEHLER · " + shortError(error));
            setState("error", "OFFLINE-ERKENNUNG KONNTE NICHT STARTEN");
        }
    }

    private void stopOfflineListening() {
        if (!listening) return;
        listening = false;
        setDiagnostic("WIRD LOKAL AUSGEWERTET");
        setState("thinking", "LOKAL AUSWERTEN");
        if (speechService != null) speechService.stop();
    }

    private void stopSpeechService() {
        listening = false;
        if (speechService == null) return;
        speechService.stop();
        speechService.shutdown();
        speechService = null;
    }

    @Override public void onPartialResult(String hypothesis) {
        String text = extractText(hypothesis);
        if (!text.isBlank()) {
            runOnUiThread(() -> setDiagnostic("ERKANNT · " + text));
        }
    }

    @Override public void onResult(String hypothesis) {
        showFinalText(hypothesis);
    }

    @Override public void onFinalResult(String hypothesis) {
        showFinalText(hypothesis);
        runOnUiThread(this::stopSpeechService);
    }

    private void showFinalText(String hypothesis) {
        String text = extractText(hypothesis);
        runOnUiThread(() -> {
            if (text.isBlank()) {
                setDiagnostic("NICHTS VERSTANDEN · ERNEUT VERSUCHEN");
                setState("error", "NICHTS VERSTANDEN");
            } else {
                setDiagnostic("TEXT · " + text);
                setState("", "VERSTANDEN: " + text);
            }
        });
    }

    @Override public void onError(Exception error) {
        runOnUiThread(() -> {
            stopSpeechService();
            setDiagnostic("ERKENNUNGSFEHLER · " + shortError(error));
            setState("error", "OFFLINE-ERKENNUNG FEHLGESCHLAGEN");
        });
    }

    @Override public void onTimeout() {
        runOnUiThread(() -> {
            stopSpeechService();
            setDiagnostic("ZEIT ABGELAUFEN · ERNEUT VERSUCHEN");
            setState("", "OFFLINE BEREIT");
        });
    }

    private String extractText(String json) {
        if (json == null) return "";
        try {
            return new JSONObject(json).optString("text", "").trim();
        } catch (Exception ignored) {
            return "";
        }
    }

    private String shortError(Exception error) {
        String message = error == null ? null : error.getMessage();
        if (message == null || message.isBlank()) return "UNBEKANNT";
        return message.length() > 80 ? message.substring(0, 80) : message;
    }

    private void setDiagnostic(String message) {
        if (diagnostic != null) {
            diagnostic.setText("OFFLINE-SPRACHTEST " + BuildConfig.VERSION_NAME + " · " + message);
        }
    }

    private void setState(String mode, String message) {
        String safe = message.replace("\\", "\\\\").replace("'", "\\'");
        web.evaluateJavascript(
                "window.rhiaAndroidState&&window.rhiaAndroidState('" + mode + "','" + safe + "')",
                null);
    }

    @Override public void onRequestPermissionsResult(
            int code, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(code, permissions, results);
        if (code != MIC_PERMISSION) return;

        boolean granted = results.length > 0
                && results[0] == PackageManager.PERMISSION_GRANTED;
        if (granted && listenAfterPermission) {
            listenAfterPermission = false;
            startOfflineListening();
        } else {
            listenAfterPermission = false;
            setDiagnostic("MIKROFONZUGRIFF FEHLT");
            setState("error", "MIKROFONZUGRIFF FEHLT");
        }
    }

    @Override protected void onPause() {
        stopSpeechService();
        super.onPause();
    }

    @Override protected void onDestroy() {
        stopSpeechService();
        if (model != null) {
            model.close();
            model = null;
        }
        web.removeJavascriptInterface("RHIAAndroid");
        web.destroy();
        super.onDestroy();
    }
}
