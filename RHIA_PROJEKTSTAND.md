# RHIA – Projektstand

**Letzte Aktualisierung:** 05.08.2026  
**Projekt:** RHIA – RH Intelligent Assistant

## Fester Synchronisationsbefehl

Wenn Mike in einem RHIA-Chat den genauen Befehl **„RHIA Projektstand“** schreibt, gilt:

1. Den aktuellen Stand des GitHub-Repositorys `GGRLAK-04872/RHIA` lesen.
2. Die neuesten Commits und tatsächlich vorhandenen Dateien/Funktionen prüfen.
3. Diese Datei vollständig lesen.
4. Die neuesten datierten Einträge zuerst auswerten.
5. Kurz erklären, was inzwischen funktioniert, was offen ist und wo weitergearbeitet wird.
6. Erst danach Änderungen planen oder umsetzen.

Der Befehl ist chatübergreifend die Aufforderung, den gemeinsamen technischen Projektstand neu zu laden. Alte Chatannahmen dürfen den neueren Repository-Stand nicht überschreiben.

## Verbindliche Datumsregel

Jeder neue bestätigte Projektstand wird mit Datum dokumentiert.

Format:

- **Datum:** TT.MM.JJJJ
- **Uhrzeit:** HH:MM Uhr (Europe/Berlin), wenn bekannt
- **Bereich:** z. B. Optik, Sprachzentrum, Android-App
- **Änderung:** Was wurde umgesetzt?
- **Test:** Was wurde geprüft und mit welchem Ergebnis?
- **Offen:** Was funktioniert noch nicht?
- **Nächster Schritt:** Wo wird weitergemacht?

Neue Einträge werden oben in der Chronik ergänzt, damit RHIA sie zeitlich sortieren und später Fragen wie „Was haben wir am 05.08.2026 geändert?“ beantworten kann. Vermutungen dürfen nicht als getestete Ergebnisse eingetragen werden.

## Aktueller verbindlicher Stand

### 05.08.2026 – Android-App und gemeinsame Oberfläche

**Bereich:** Android-App / Optik / Sprachzentrum

**Änderung:**

- Eine native Android-Test-App wurde erstellt.
- Die App wurde auf dem Samsung-Tablet installiert.
- Die Android-App heißt jetzt **RHIA**.
- Web, Smartphone und Tablet verwenden die zentrale RHIA-Oberfläche aus `index.html`.
- Die Android-App übernimmt diese freigegebene Oberfläche und hält eine lokale Kopie für den Offlinebetrieb vor.
- Reine spätere Optikänderungen sollen dadurch zentral auf allen Geräten erscheinen.
- Der vorhandene Mikrofonknopf wurde mit Androids On-Device-Spracherkennung verbunden.
- Die lokale Spracherkennung darf nicht unbemerkt auf eine Online-Erkennung ausweichen.
- Die bisherige funktionierende Webversion bleibt die gemeinsame optische Referenz und das Backup.

**Test:**

- Die aktualisierte APK wurde erfolgreich gebaut und veröffentlicht.
- Installation und Übernahme der erarbeiteten RHIA-Optik haben auf dem Samsung-Tablet funktioniert.
- Sprachtests wurden bereits begonnen.

**Vorheriger Sprachtest der Webversion:**

- 10 Versuche im ruhigen Umfeld
- 9-mal korrekte Antwort „Ja, Sir?“
- 1-mal öffneten sich die Einstellungen
- Erfolgsquote: 90 %

**Offen:**

- Lokales und gezielt verwendetes Online-Sprachzentrum zuverlässig fertigstellen.
- Offline-Erkennung im Flugmodus systematisch testen.
- Ergebnisse der neuen Sprachtests genau dokumentieren.
- Eigene lokale RHIA-Stimme und Ausdruck später entwickeln.

**Nächster Schritt:**

Im Chat beziehungsweise Arbeitsbereich **Sprachzentrum** den aktuellen Android-App-Stand über den Befehl **„RHIA Projektstand“** laden und lokale sowie Online-Sprachfunktionen auf dieser gemeinsamen App-Grundlage weiterentwickeln.

## Grundregeln

- Stabilität vor Funktionsmenge.
- Kleine Änderung, Test, Bestätigung, dann nächster Schritt.
- Datenschutz und Kontrolle vor Autonomie.
- Keine geheimen Zugangsdaten im Quellcode.
- Keine heimliche Online-Ausweichlösung.
- Die Webversion funktionsfähig halten.
- Optische Änderungen zentral und responsiv für Smartphone, Tablet, Web und Android-App umsetzen.
- Getestete Fakten, offene Punkte und Vermutungen klar voneinander trennen.
