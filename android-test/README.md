# RHIA Android Hybrid Test v0.2

Der erste native Android-Test für RHIA prüft ausschließlich das lokale Sprachzentrum.

## Was der Test beweist

- Die lokale Spracherkennung bleibt strikt auf Androids On-Device-Erkennung begrenzt.
- Die App lädt die freigegebene RHIA-Oberfläche von GitHub Pages und speichert sie lokal.
- Nach einer erfolgreichen Synchronisierung bleibt die Oberfläche offline verfügbar.
- Spätere reine Optikänderungen werden beim nächsten App-Start automatisch übernommen.
- Sie verwendet ab Android 12 ausschließlich `createOnDeviceSpeechRecognizer`.
- Wenn keine lokale deutsche Erkennung vorhanden ist, bricht sie sichtbar ab, statt online auszuweichen.
- Bei erkanntem „Rhia“ antwortet sie mit „Ja, Sir?“.
- Für die Ausgabe wird nur eine installierte TTS-Stimme akzeptiert, die keine Netzwerkverbindung benötigt.

## Testablauf

1. APK installieren und Mikrofon erlauben.
2. Mikrofonpunkt antippen und „Rhia“ sagen.
3. Zehn Versuche in Ruhe zählen.
4. Flugmodus einschalten und dieselben zehn Versuche wiederholen.
5. Danach mit normalen Hintergrundgeräuschen testen.

Falls das deutsche Offline-Sprachpaket fehlt: Android-Einstellungen öffnen, nach „Offline-Spracherkennung“ oder „Sprachpakete“ suchen und Deutsch herunterladen.

Die Internetberechtigung wird nur für die sichtbare Web-/KI-Funktion und die Synchronisierung der freigegebenen Oberfläche verwendet. Die Spracherkennung weicht dadurch nicht auf einen Online-Dienst aus.
