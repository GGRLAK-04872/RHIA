package app.rhia.localtest;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.content.Intent;
import android.graphics.Color;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.TextView;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public final class MainActivity extends Activity implements RecognitionListener {
    private static final int MIC_PERMISSION = 41;
    private static final String UI_URL = "https://ggrlak-04872.github.io/RHIA/";
    private static final String UI_FILE = "rhia-ui.html";
    private WebView web;
    private TextView diagnostic;
    private SpeechRecognizer recognizer;
    private boolean recognitionInProgress;
    private boolean diagnosticStartIssued;

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
                web.postDelayed(MainActivity.this::startSingleDiagnostic, 500);
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
        diagnostic.setText("DIAGNOSE " + BuildConfig.VERSION_NAME + " · BEREIT");
        FrameLayout.LayoutParams diagnosticLayout = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM);
        root.addView(diagnostic, diagnosticLayout);
        setContentView(root);
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
                "window.startSpeechRecognition=function(){};window.testBrowserVoice=function(){RHIAAndroid.testLocalVoice();};" +
                "var mic=document.getElementById('mic');if(mic)mic.style.display='none';" +
                "var inputTest=document.getElementById('speechInputTest');if(inputTest){inputTest.disabled=true;inputTest.textContent='Diagnose startet automatisch';}" +
                "var voiceTest=document.getElementById('voiceTest');if(voiceTest)voiceTest.disabled=true;" +
                "var inputStatus=document.getElementById('speechInputStatus');if(inputStatus)inputStatus.textContent='Einmaliger nativer Android-Test · App v" + BuildConfig.VERSION_NAME + "';" +
                "var voiceStatus=document.getElementById('voiceTestStatus');if(voiceStatus)voiceStatus.textContent='Sprachausgabe für Diagnose ausgeschaltet';" +
                "window.rhiaAndroidState=function(mode,text){var s=document.getElementById('stage');if(s)s.className='stage '+mode;var c=document.getElementById('coreState');if(c)c.textContent=text;var t=document.getElementById('topState');if(t)t.textContent=text;};" +
                "})();";
        web.evaluateJavascript(script, null);
    }

    public final class AndroidBridge {}

    private void setDiagnostic(String message) {
        if (diagnostic != null) diagnostic.setText("DIAGNOSE " + BuildConfig.VERSION_NAME + " · " + message);
    }

    private void setState(String mode, String message) {
        String safe = message.replace("\\", "\\\\").replace("'", "\\'");
        web.evaluateJavascript("window.rhiaAndroidState&&window.rhiaAndroidState('" + mode + "','" + safe + "')", null);
    }

    private void startSingleDiagnostic() {
        if (diagnosticStartIssued) return;
        diagnosticStartIssued = true;
        setDiagnostic("01 · EINMALIGER START");
        startListening();
    }

    private void startListening() {
        if (recognitionInProgress) {
            setDiagnostic("ABBRUCH · INTERN BEREITS AKTIV");
            return;
        }
        setDiagnostic("02 · VERFÜGBARKEIT PRÜFEN");
        setState("thinking", "EINMALIGER SPRACHTEST");
        if (!SpeechRecognizer.isOnDeviceRecognitionAvailable(this)) {
            setDiagnostic("FEHLER · ON-DEVICE-DIENST NICHT VERFÜGBAR");
            setState("error", "DEUTSCHES OFFLINE-SPRACHPAKET FEHLT");
            return;
        }
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            setDiagnostic("03 · MIKROFON-BERECHTIGUNG");
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, MIC_PERMISSION);
            return;
        }
        setDiagnostic("04 · ERKENNER ERSTELLEN");
        recognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(this);
        recognizer.setRecognitionListener(this);
        recognitionInProgress = true;
        setDiagnostic("05 · STARTLISTENING EINMAL");
        setState("listening", "JETZT SPRECHEN");
        recognizer.startListening(germanRecognitionIntent());
    }

    private Intent germanRecognitionIntent() {
        return new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
                .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "de-DE")
                .putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
                .putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5);
    }

    private void releaseRecognizer() {
        if (recognizer == null) return;
        recognizer.cancel();
        recognizer.destroy();
        recognizer = null;
    }

    @Override public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(code, permissions, results);
        if (code == MIC_PERMISSION && results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) {
            setDiagnostic("03 · BERECHTIGUNG ERTEILT");
            startListening();
        } else {
            setDiagnostic("FEHLER · MIKROFONZUGRIFF FEHLT");
            setState("error", "MIKROFONZUGRIFF FEHLT");
        }
    }

    @Override public void onResults(Bundle bundle) {
        recognitionInProgress = false;
        setDiagnostic("ERGEBNIS EMPFANGEN · TEST BEENDET");
        setState("", "DIAGNOSE BEENDET");
    }

    @Override public void onError(int error) {
        recognitionInProgress = false;
        setDiagnostic("FEHLER · CODE " + error + " · TEST BEENDET");
        setState("error", "ANDROID-FEHLER · CODE " + error);
    }

    @Override public void onReadyForSpeech(Bundle params) {
        setDiagnostic("06 · BEREIT ZUM SPRECHEN");
        setState("listening", "JETZT SPRECHEN");
    }

    @Override public void onBeginningOfSpeech() {
        setDiagnostic("07 · SPRACHBEGINN ERKANNT");
        setState("listening", "SPRACHE ERKANNT");
    }

    @Override public void onEndOfSpeech() {
        setDiagnostic("08 · SPRACHENDE ERKANNT");
        setState("thinking", "LOKAL AUSWERTEN");
    }

    @Override public void onRmsChanged(float rmsdB) {}
    @Override public void onBufferReceived(byte[] buffer) {}
    @Override public void onPartialResults(Bundle partialResults) {
        setDiagnostic("07 · TEILERGEBNIS EMPFANGEN");
    }
    @Override public void onEvent(int eventType, Bundle params) {}

    @Override protected void onDestroy() {
        releaseRecognizer();
        web.removeJavascriptInterface("RHIAAndroid");
        web.destroy();
        super.onDestroy();
    }
}
