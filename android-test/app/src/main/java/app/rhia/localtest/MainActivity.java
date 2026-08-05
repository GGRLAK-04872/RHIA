package app.rhia.localtest;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RadialGradient;
import android.graphics.Shader;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.Voice;
import android.view.MotionEvent;
import android.view.View;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Locale;

public final class MainActivity extends Activity implements RecognitionListener {
    private static final int MIC_PERMISSION = 41;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private RhiaView view;
    private SpeechRecognizer recognizer;
    private TextToSpeech tts;
    private boolean ttsOfflineReady;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(3, 1, 2));
        getWindow().setNavigationBarColor(Color.rgb(3, 1, 2));
        view = new RhiaView();
        setContentView(view);
        initLocalVoice();
        updateLocalAvailability();
    }

    private void updateLocalAvailability() {
        boolean available = SpeechRecognizer.isOnDeviceRecognitionAvailable(this);
        view.setStatus(available
                ? "LOKAL BEREIT · MIKROFON ANTIPPEN"
                : "LOKALE ERKENNUNG FEHLT · DEUTSCHES SPRACHPAKET INSTALLIEREN",
                available ? Mode.IDLE : Mode.ERROR);
    }

    private void startListening() {
        if (!SpeechRecognizer.isOnDeviceRecognitionAvailable(this)) {
            updateLocalAvailability();
            return;
        }
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, MIC_PERMISSION);
            return;
        }
        if (recognizer != null) recognizer.destroy();
        recognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(this);
        recognizer.setRecognitionListener(this);
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
                .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "de-DE")
                .putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
                .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5)
                .putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
        view.setStatus("ZUHÖREN · SAGE „RHIA“", Mode.LISTENING);
        recognizer.startListening(intent);
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == MIC_PERMISSION && results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) {
            startListening();
        } else {
            view.setStatus("MIKROFONZUGRIFF NICHT ERLAUBT", Mode.ERROR);
        }
    }

    private void initLocalVoice() {
        tts = new TextToSpeech(this, result -> {
            if (result != TextToSpeech.SUCCESS) return;
            tts.setLanguage(Locale.GERMANY);
            Voice offline = tts.getVoices().stream()
                    .filter(v -> !v.isNetworkConnectionRequired())
                    .filter(v -> v.getLocale().getLanguage().equals(Locale.GERMAN.getLanguage()))
                    .min(Comparator.comparing(Voice::getName))
                    .orElse(null);
            if (offline != null) {
                tts.setVoice(offline);
                tts.setSpeechRate(0.92f);
                tts.setPitch(0.88f);
                ttsOfflineReady = true;
            }
        });
    }

    private static boolean isWakeWord(String raw) {
        String text = Normalizer.normalize(raw.toLowerCase(Locale.GERMAN), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^a-z ]", " ")
                .trim();
        return text.matches(".*\\b(rhia|riha|ria|rhea)\\b.*");
    }

    private void handleResults(Bundle results) {
        ArrayList<String> choices = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        String heard = choices == null || choices.isEmpty() ? "" : choices.get(0);
        boolean matched = choices != null && choices.stream().anyMatch(MainActivity::isWakeWord);
        if (matched) {
            view.setStatus("JA, SIR?", Mode.SPEAKING);
            if (ttsOfflineReady) {
                tts.speak("Ja, Sir?", TextToSpeech.QUEUE_FLUSH, null, "rhia-wake");
            }
            handler.postDelayed(() -> view.setStatus("LOKAL BEREIT · MIKROFON ANTIPPEN", Mode.IDLE), 1800);
        } else {
            view.setStatus(heard.isBlank() ? "NICHTS ERKANNT" : "ERKANNT: „" + heard.toUpperCase(Locale.GERMAN) + "“", Mode.ERROR);
            handler.postDelayed(this::updateLocalAvailability, 2300);
        }
    }

    @Override public void onReadyForSpeech(Bundle params) { view.setStatus("ZUHÖREN · SAGE „RHIA“", Mode.LISTENING); }
    @Override public void onBeginningOfSpeech() { view.setStatus("SPRACHE ERKANNT …", Mode.LISTENING); }
    @Override public void onRmsChanged(float rmsdB) { view.setLevel(Math.max(0f, Math.min(1f, (rmsdB + 2f) / 12f))); }
    @Override public void onBufferReceived(byte[] buffer) {}
    @Override public void onEndOfSpeech() { view.setStatus("LOKAL AUSWERTEN …", Mode.THINKING); }
    @Override public void onError(int error) {
        String message = switch (error) {
            case SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "NICHTS ERKANNT · NOCH EINMAL";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "MIKROFONZUGRIFF FEHLT";
            case SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED, SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE -> "DEUTSCHES OFFLINE-SPRACHPAKET FEHLT";
            default -> "LOKALER SPRACHTEST FEHLGESCHLAGEN · CODE " + error;
        };
        view.setStatus(message, Mode.ERROR);
        handler.postDelayed(this::updateLocalAvailability, 2400);
    }
    @Override public void onResults(Bundle results) { handleResults(results); }
    @Override public void onPartialResults(Bundle partialResults) {}
    @Override public void onEvent(int eventType, Bundle params) {}

    @Override protected void onDestroy() {
        if (recognizer != null) recognizer.destroy();
        if (tts != null) tts.shutdown();
        super.onDestroy();
    }

    private enum Mode { IDLE, LISTENING, THINKING, SPEAKING, ERROR }

    private final class RhiaView extends View {
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint text = new Paint(Paint.ANTI_ALIAS_FLAG);
        private String status = "PRÜFE LOKALE ERKENNUNG …";
        private Mode mode = Mode.THINKING;
        private float level;

        RhiaView() {
            super(MainActivity.this);
            setBackgroundColor(Color.rgb(3, 1, 2));
            text.setTextAlign(Paint.Align.CENTER);
            setOnClickListener(v -> startListening());
        }

        void setStatus(String value, Mode next) {
            status = value;
            mode = next;
            invalidate();
        }
        void setLevel(float value) { level = value; invalidate(); }

        @Override protected void onDraw(Canvas canvas) {
            super.onDraw(canvas);
            float w = getWidth(), h = getHeight(), cx = w / 2f, cy = h * 0.42f;
            float base = Math.min(w, h) * 0.245f;
            float pulse = mode == Mode.LISTENING ? level * base * 0.12f : (float)Math.sin(System.nanoTime() / 900_000_000d) * base * 0.018f;
            int bright = mode == Mode.ERROR ? Color.rgb(255, 104, 82) : Color.rgb(255, 109, 136);

            paint.setShader(new RadialGradient(cx, cy, base * 1.65f,
                    new int[]{Color.argb(120, 143, 23, 56), Color.argb(36, 143, 23, 56), Color.TRANSPARENT},
                    new float[]{0f, .47f, 1f}, Shader.TileMode.CLAMP));
            canvas.drawCircle(cx, cy, base * 1.65f, paint);
            paint.setShader(null);

            for (int i = 0; i < 34; i++) {
                double a = i * 2.399 + System.nanoTime() / 8_000_000_000d * (i % 2 == 0 ? 1 : -1);
                float r = base * (.18f + (i % 9) * .085f) + pulse;
                float x = cx + (float)Math.cos(a) * r;
                float y = cy + (float)Math.sin(a) * r * .78f;
                paint.setColor(Color.argb(70 + (i % 4) * 24, 255, 109, 136));
                paint.setStrokeWidth(1f + (i % 3) * .6f);
                canvas.drawLine(cx, cy, x, y, paint);
                canvas.drawCircle(x, y, 1.5f + (i % 3), paint);
            }

            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(2f);
            paint.setColor(Color.argb(150, Color.red(bright), Color.green(bright), Color.blue(bright)));
            canvas.drawCircle(cx, cy, base * .34f + pulse, paint);
            paint.setStyle(Paint.Style.FILL);
            paint.setShader(new RadialGradient(cx - base * .05f, cy - base * .07f, base * .34f,
                    new int[]{Color.argb(235, 255, 210, 220), bright, Color.argb(0, 143, 23, 56)},
                    null, Shader.TileMode.CLAMP));
            canvas.drawCircle(cx, cy, base * .34f + pulse, paint);
            paint.setShader(null);

            float micY = h - Math.max(92f, h * .105f);
            paint.setColor(Color.rgb(74, 10, 30));
            canvas.drawCircle(cx, micY, 42f, paint);
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(1.5f);
            paint.setColor(bright);
            canvas.drawCircle(cx, micY, 42f + (mode == Mode.LISTENING ? level * 12f : 0), paint);
            paint.setStyle(Paint.Style.FILL);
            text.setColor(Color.WHITE);
            text.setTextSize(31f);
            canvas.drawText("●", cx, micY + 10f, text);

            text.setColor(mode == Mode.ERROR ? Color.rgb(255, 121, 95) : Color.rgb(211, 182, 192));
            text.setTextSize(Math.max(12f, Math.min(16f, w / 42f)));
            text.setLetterSpacing(.12f);
            canvas.drawText(status, cx, micY - 67f, text);
            text.setLetterSpacing(0f);
            text.setTextSize(11f);
            text.setColor(Color.rgb(145, 117, 127));
            canvas.drawText("ANDROID LOCAL TEST · V0.1 · KEINE INTERNET-BERECHTIGUNG", cx, h - 22f, text);

            postInvalidateDelayed(33);
        }

        @Override public boolean onTouchEvent(MotionEvent event) {
            if (event.getAction() == MotionEvent.ACTION_UP) {
                float cx = getWidth() / 2f;
                float micY = getHeight() - Math.max(92f, getHeight() * .105f);
                if (Math.hypot(event.getX() - cx, event.getY() - micY) < 70f) {
                    performClick();
                    return true;
                }
            }
            return true;
        }
        @Override public boolean performClick() { super.performClick(); return true; }
    }
}
