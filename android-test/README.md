# RHIA Android Local Test v0.1

Der erste native Android-Test für RHIA prüft ausschließlich das lokale Sprachzentrum.

## Was der Test beweist

- Die App besitzt keine Internet-Berechtigung.
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
