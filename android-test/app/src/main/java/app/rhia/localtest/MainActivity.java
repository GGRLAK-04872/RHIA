package app.rhia.localtest;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.MediaPlayer;
import android.media.MediaRecorder;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
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

public final class MainActivity extends Activity {
    private static final int MIC_PERMISSION = 41;
    private static final long MAX_RECORDING_MS = 10_000L;
    private static final String UI_URL = "https://ggrlak-04872.github.io/RHIA/";
    private static final String UI_FILE = "rhia-ui.html";

    private WebView web;
    private TextView diagnostic;
    private MediaRecorder recorder;
    private MediaPlayer player;
    private File recordingFile;
    private boolean recording;
    private boolean recordAfterPermission;

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
        diagnostic.setText("AUFNAHMETEST " + BuildConfig.VERSION_NAME + " · RHIA ANTIPPEN");
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
                "var stage=document.getElementById('stage');if(stage&&!stage.dataset.rhiaRecorder){stage.dataset.rhiaRecorder='1';stage.style.touchAction='manipulation';stage.addEventListener('click',function(event){if(event.target.closest&&event.target.closest('button'))return;RHIAAndroid.toggleRecording();},false);}" +
                "var oldButton=document.getElementById('speechInputTest');if(oldButton&&oldButton.parentNode){var button=oldButton.cloneNode(true);oldButton.parentNode.replaceChild(button,oldButton);button.disabled=false;button.textContent='Audioaufnahme testen';button.addEventListener('click',function(event){event.preventDefault();event.stopPropagation();RHIAAndroid.toggleRecording();},false);}" +
                "var voiceTest=document.getElementById('voiceTest');if(voiceTest)voiceTest.disabled=true;" +
                "var inputStatus=document.getElementById('speechInputStatus');if(inputStatus)inputStatus.textContent='Direkte Audioaufnahme ohne Android-Spracherkennung · App v" + BuildConfig.VERSION_NAME + "';" +
                "var voiceStatus=document.getElementById('voiceTestStatus');if(voiceStatus)voiceStatus.textContent='Transkription folgt nach erfolgreichem Aufnahmetest';" +
                "window.rhiaAndroidState=function(mode,text){var s=document.getElementById('stage');if(s)s.className='stage '+mode;var c=document.getElementById('coreState');if(c)c.textContent=text;var t=document.getElementById('topState');if(t)t.textContent=text;};" +
                "})();";
        web.evaluateJavascript(script, null);
    }

    public final class AndroidBridge {
        @JavascriptInterface public void toggleRecording() {
            runOnUiThread(MainActivity.this::toggleRecording);
        }
    }

    private void setDiagnostic(String message) {
        if (diagnostic != null) {
            diagnostic.setText("AUFNAHMETEST " + BuildConfig.VERSION_NAME + " · " + message);
        }
    }

    private void setState(String mode, String message) {
        String safe = message.replace("\\", "\\\\").replace("'", "\\'");
        web.evaluateJavascript(
                "window.rhiaAndroidState&&window.rhiaAndroidState('" + mode + "','" + safe + "')",
                null);
    }

    private void toggleRecording() {
        if (recording) {
            stopRecordingAndPlay();
        } else {
            startRecording();
        }
    }

    private void startRecording() {
        stopPlayback();
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            recordAfterPermission = true;
            setDiagnostic("MIKROFON-BERECHTIGUNG");
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, MIC_PERMISSION);
            return;
        }

        try {
            recordingFile = new File(getCacheDir(), "rhia-recording.m4a");
            if (recordingFile.exists() && !recordingFile.delete()) {
                throw new IllegalStateException("Alte Aufnahme konnte nicht ersetzt werden");
            }

            recorder = new MediaRecorder();
            recorder.setAudioSource(MediaRecorder.AudioSource.MIC);
            recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
            recorder.setAudioEncodingBitRate(96_000);
            recorder.setAudioSamplingRate(44_100);
            recorder.setOutputFile(recordingFile.getAbsolutePath());
            recorder.prepare();
            recorder.start();
            recording = true;

            setDiagnostic("AUFNAHME LÄUFT · NOCHMAL TIPPEN ZUM STOPPEN");
            setState("listening", "AUFNAHME LÄUFT");
            web.postDelayed(() -> {
                if (recording) stopRecordingAndPlay();
            }, MAX_RECORDING_MS);
        } catch (Exception error) {
            releaseRecorder();
            setDiagnostic("FEHLER BEIM AUFNAHMESTART");
            setState("error", "AUFNAHME KONNTE NICHT STARTEN");
        }
    }

    private void stopRecordingAndPlay() {
        if (!recording || recorder == null) return;

        try {
            recorder.stop();
            long bytes = recordingFile != null && recordingFile.isFile()
                    ? recordingFile.length() : 0L;
            releaseRecorder();

            if (bytes < 1000L) {
                setDiagnostic("AUFNAHME ZU KURZ · ERNEUT VERSUCHEN");
                setState("error", "AUFNAHME ZU KURZ");
                return;
            }

            setDiagnostic("GESPEICHERT · " + (bytes / 1024L) + " KB · WIEDERGABE");
            setState("speaking", "AUFNAHME WIRD ABGESPIELT");
            playRecording();
        } catch (RuntimeException error) {
            releaseRecorder();
            setDiagnostic("AUFNAHME ZU KURZ ODER UNGÜLTIG");
            setState("error", "BITTE ETWAS LÄNGER SPRECHEN");
        }
    }

    private void playRecording() {
        stopPlayback();
        try {
            player = new MediaPlayer();
            player.setDataSource(recordingFile.getAbsolutePath());
            player.setOnCompletionListener(completed -> {
                stopPlayback();
                setDiagnostic("ERFOLG · RHIA ANTIPPEN FÜR NEUEN TEST");
                setState("", "AUFNAHME FUNKTIONIERT");
            });
            player.setOnErrorListener((failed, what, extra) -> {
                stopPlayback();
                setDiagnostic("AUFNAHME GESPEICHERT · WIEDERGABE FEHLGESCHLAGEN");
                setState("error", "WIEDERGABE FEHLGESCHLAGEN");
                return true;
            });
            player.prepare();
            player.start();
        } catch (Exception error) {
            stopPlayback();
            setDiagnostic("AUFNAHME GESPEICHERT · WIEDERGABE FEHLGESCHLAGEN");
            setState("error", "WIEDERGABE FEHLGESCHLAGEN");
        }
    }

    private void releaseRecorder() {
        recording = false;
        if (recorder == null) return;
        try {
            recorder.reset();
        } catch (RuntimeException ignored) {}
        recorder.release();
        recorder = null;
    }

    private void stopPlayback() {
        if (player == null) return;
        try {
            if (player.isPlaying()) player.stop();
        } catch (IllegalStateException ignored) {}
        player.release();
        player = null;
    }

    @Override public void onRequestPermissionsResult(
            int code, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(code, permissions, results);
        if (code != MIC_PERMISSION) return;

        boolean granted = results.length > 0
                && results[0] == PackageManager.PERMISSION_GRANTED;
        if (granted && recordAfterPermission) {
            recordAfterPermission = false;
            startRecording();
        } else {
            recordAfterPermission = false;
            setDiagnostic("MIKROFONZUGRIFF FEHLT");
            setState("error", "MIKROFONZUGRIFF FEHLT");
        }
    }

    @Override protected void onPause() {
        if (recording) {
            try {
                recorder.stop();
            } catch (RuntimeException ignored) {}
            releaseRecorder();
        }
        stopPlayback();
        super.onPause();
    }

    @Override protected void onDestroy() {
        releaseRecorder();
        stopPlayback();
        web.removeJavascriptInterface("RHIAAndroid");
        web.destroy();
        super.onDestroy();
    }
}
