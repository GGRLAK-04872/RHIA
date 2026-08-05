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

### 05.08.2026, 14:35 Uhr – Punkt 1: Ist-Stand geprüft und abgesichert

**Bereich:** Sprachzentrum / Online-KI / Gedächtnis / Android-App

**Änderung:**

- Keine Funktionsänderung vorgenommen; zuerst wurde der tatsächlich veröffentlichte Stand geprüft.
- Der Android-Code verwendet echte On-Device-Spracherkennung für Deutsch und eine installierte Offline-TTS-Stimme.
- Die Android-App lädt die gemeinsame RHIA-Oberfläche und behält eine lokale Kopie.
- Der Code für freie Online-KI-Antworten und eine zentrale RHIA-Persönlichkeit ist bereits vorhanden.
- Die bisherige Behauptung, das zentrale RHIA-Gedächtnis sei schon vorhanden, wurde korrigiert: Erinnerungen liegen aktuell nur im jeweiligen Browser-/App-Speicher und werden nicht geräteübergreifend synchronisiert.
- Die frühere Updater-Priorität wird zurückgestellt. Persönlichkeit, Wörter, Ausdruck und Erinnerungen sollen als kleine zentrale Daten aktualisiert werden; dafür ist keine neue APK vorgesehen.

**Test:**

- GitHub-Repository, neueste Commits, `index.html`, Android-Code, Manifest, Build-Konfiguration, Cloudflare-Funktionen und Worker-Konfiguration wurden abgeglichen.
- Die veröffentlichte Oberfläche unter `https://ggrlak-04872.github.io/RHIA/` antwortet mit HTTP 200.
- Der von der Oberfläche verwendete relative Endpunkt `/api/chat` ergibt auf GitHub Pages HTTP 404. Freie Online-KI-Antworten sind über diese veröffentlichte Adresse damit nicht funktionsfähig.
- Lokale Befehle bleiben davon unabhängig verfügbar.
- Es wurde keine neue APK gebaut und nichts auf dem Tablet verändert.

**Offen:**

- Die tatsächlich veröffentlichte Cloudflare-Worker- oder Pages-Backend-Adresse eindeutig bestimmen und mit der gemeinsamen Oberfläche verbinden.
- Zulässige Web-Herkunft (CORS) konsistent auf die echte RHIA-Adresse einstellen.
- Danach einen automatisierten Test für lokale Antwort, Kostenfreigabe, Online-KI-Antwort und Offline-Rückfall durchführen.
- Anschließend ein kleines zentrales, datiertes RHIA-Gedächtnis mit geräteübergreifender Synchronisierung entwickeln.
- Für persönliche Daten sind vor Speicherung Zugriffsschutz, Nutzeridentität und Lösch-/Exportmöglichkeit festzulegen.

**Nächster Schritt:**

Baustein 2 beginnt mit der funktionsfähigen und getesteten Verbindung der gemeinsamen RHIA-Oberfläche zum bereits vorhandenen Online-KI-Backend. Erst nach bestandenem Test wird das zentrale Gedächtnis ergänzt.


### 05.08.2026 – Audioänderung getestet; Android-App-Updates vereinfachen

**Bereich:** Android-App / Sprachzentrum / Aktualisierung

**Änderung:**

- Der lokale Android-Sprachdienst verbindet sich bei Fehler 11 einmal neu.
- Die Android-Testversion wurde auf **v0.3** erhöht.
- Mike hat Änderungen am Audio beziehungsweise Sprachzentrum erfolgreich in einer neu installierten APK getestet.
- Neue feste Anforderung: Android-/Audioänderungen dürfen künftig nicht mehr das Deinstallieren der alten App und die manuelle Installation einer weiteren App erfordern.
- RHIA soll online nach einer freigegebenen neuen App-Version suchen, diese herunterladen und als normales Android-Update anbieten.
- Reine Änderungen der zentralen Web-Oberfläche werden weiterhin ohne neue APK automatisch übernommen.

**Test:**

- Die neue App-Version wurde installiert.
- Der Sprach-/Audiotest wurde von Mike durchgeführt und hat funktioniert.
- Beim Wechsel auf die neue APK musste die alte App deinstalliert werden; dieser Ablauf ist als zu aufwändig abgelehnt.

**Offen:**

- Einen stabilen, versionsübergreifenden Signierschlüssel für alle künftigen APKs festlegen. Ohne identische Signatur behandelt Android einen neuen Build nicht als Update derselben App.
- Einen sicheren Update-Mechanismus in RHIA einbauen: Versionsprüfung, Download einer freigegebenen APK und Übergabe an Androids Installationsbestätigung.
- Prüfen, ob der aktuelle GitHub-Build bei jedem Lauf eine neue Debug-Signatur erzeugt; das wäre die wahrscheinliche Ursache für die nötige Deinstallation.
- Android verlangt bei selbst verteilten APKs weiterhin eine sichtbare Bestätigung durch Mike; eine heimliche Installation ist nicht vorgesehen.

**Nächster Schritt:**

Den Android-Build dauerhaft signieren und danach den RHIA-App-Updater einbauen. Für die einmalige Umstellung auf die stabile Signatur kann noch eine letzte Neuinstallation nötig sein; anschließend sollen neue Versionen als Update über die bestehende RHIA-App installiert werden und ihre lokalen Daten behalten.

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
