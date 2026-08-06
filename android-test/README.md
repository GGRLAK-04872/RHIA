# RHIA Android Hybrid Test v0.24

Der erste native Android-Test für RHIA prüft ausschließlich das lokale Sprachzentrum.

## Was der Test beweist

- Die lokale Spracherkennung bleibt strikt auf Androids On-Device-Erkennung begrenzt.
- Die App lädt die freigegebene RHIA-Oberfläche von GitHub Pages und speichert sie lokal.
- Nach einer erfolgreichen Synchronisierung bleibt die Oberfläche offline verfügbar.
- Spätere reine Optikänderungen werden beim nächsten App-Start automatisch übernommen.
- Sie verwendet ab Android 12 ausschließlich `createOnDeviceSpeechRecognizer`.
- Wenn keine lokale deutsche Erkennung vorhanden ist, bricht sie sichtbar ab, statt online auszuweichen.
- Ab Android 13 prüft sie, ob das deutsche On-Device-Modell installiert ist, und stößt bei Bedarf dessen lokalen Modelldownload an.
- Android-Fehler 11 wird als getrennter lokaler Sprachdienst erkannt; RHIA verbindet den Dienst einmal automatisch neu.
- Mikrofontaste und Stimmtest werden in der App ausschließlich an Android weitergeleitet; Browser-Sprachfunktionen werden dort nicht mehr ausgelöst.
- Mikrofon und Sprachtests besitzen in der Android-App jeweils genau einen nativen Klickweg; alte Browser-, Pointer- und Touch-Handler werden entfernt.
- Die lokale On-Device-Erkennung startet nach dem Antippen direkt, ohne eine vorgeschaltete Dienstdiagnose, die auf Samsung hängen bleiben kann.
- Die App zeigt ihre native Versionsnummer bei der lokalen Spracherkennung an; Release-Titel und App lesen dieselbe zentrale Versionsnummer, damit sie bei Updates übereinstimmen.
- Bei erkanntem „Rhia“ antwortet sie mit „Ja, Sir?“.
- Für die Ausgabe wird nur eine installierte TTS-Stimme akzeptiert, die keine Netzwerkverbindung benötigt.
- Die Android-Stimme wird einmal beim App-Start vorbereitet und danach wiederverwendet.
- Start und Ende jeder gesprochenen Antwort werden über native Android-Rückmeldungen gesteuert; geschätzte Wartezeiten entfallen.
- Nicht verstandene Befehle verlassen den Antwortzustand spätestens nach 2,5 Sekunden mit einer hörbaren Rückmeldung.
- Lokale Befehle funktionieren ohne vorangestellten Namen; typische Fehlerkennungen des Namens wie „wir“, „Urea“, „Kurier“, „Maria“, „ihr“ und „hier“ werden nur vor einem bekannten lokalen Befehl entfernt.

## Testablauf

1. APK installieren und Mikrofon erlauben.
2. Mikrofonpunkt antippen und „Rhia“ sagen.
3. Zehn Versuche in Ruhe zählen.
4. Flugmodus einschalten und dieselben zehn Versuche wiederholen.
5. Danach mit normalen Hintergrundgeräuschen testen.

Falls das deutsche Offline-Sprachpaket fehlt: Android-Einstellungen öffnen, nach „Offline-Spracherkennung“ oder „Sprachpakete“ suchen und Deutsch herunterladen.

Die Internetberechtigung wird nur für die sichtbare Web-/KI-Funktion und die Synchronisierung der freigegebenen Oberfläche verwendet. Die Spracherkennung weicht dadurch nicht auf einen Online-Dienst aus.
