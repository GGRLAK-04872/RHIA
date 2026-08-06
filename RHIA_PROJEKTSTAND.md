# RHIA – Projektstand

**Letzte Aktualisierung:** 06.08.2026, 12:58 Uhr  
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

### 06.08.2026, 12:58 Uhr – Datenübertragung freigegeben; Backend-Verbindung vorbereitet

**Bereich:** Datenschutz / KI-Verbindung / Kostenkontrolle

**Bestätigte Entscheidung:**

- Mike hat ausdrücklich freigegeben, dass RHIA die aktuelle freie Frage, die letzten acht Gesprächseinträge und ausdrücklich in RHIA gespeicherte Erinnerungen an das eigene Backend `https://rhia.pages.dev` überträgt.
- Diese Freigabe erlaubt keine automatische kostenpflichtige OpenAI-Anfrage.
- Die Kostenbremse bleibt verbindlich: Zuerst kostenlose lokale Antwort; andernfalls Kostenschätzung; OpenAI erst nach einem weiteren ausdrücklichen „Ja“.

**Änderung:**

- Die zentrale Oberfläche verwendet für freie Fragen nun den eindeutigen Endpunkt `https://rhia.pages.dev/api/chat` statt des auf GitHub Pages nicht vorhandenen relativen Pfads `/api/chat`.
- Das Backend erlaubt Anfragen ausschließlich von der RHIA-Oberfläche auf GitHub Pages und von der eigenen Cloudflare-Adresse.
- Die notwendige CORS-Vorabprüfung für JSON-Anfragen wurde ergänzt.

**Technischer Test vor Veröffentlichung:**

- JavaScript-Syntaxprüfung bestanden.
- Git-Diff-Prüfung ohne Leerraumfehler bestanden.
- Live-Test und Veröffentlichung stehen noch aus; sie dürfen erst nach erfolgreicher Bereitstellung als bestanden dokumentiert werden.

**Nächster Schritt:**

Änderungen veröffentlichen. Danach die CORS-Vorabprüfung, eine kostenlose Grundfrage und eine freie Frage bis ausschließlich zur Kostenwarnung testen. Es darf bei diesem technischen Test kein OpenAI-Aufruf und kein Credit-Verbrauch stattfinden. Erst danach testet Mike die vorhandene v0.25-App.

### 06.08.2026, 12:49 Uhr – v0.25 getestet; kostenlose Grundfragen erweitert

**Bereich:** Android-App / Sprachzentrum / KI-Verbindung / Kostenkontrolle

**Bestätigter Teststand:**

- RHIA v0.25, Build 38 wurde auf Mikes Tablet installiert; im App-Menü wird Version 0.25 angezeigt.
- Die dauerhaft gleiche App-Signatur ist damit als neue Grundlage installiert. Künftige korrekt signierte APKs sollen als Update über v0.25 installiert werden, ohne vorherige Deinstallation.
- Spracheingabe, Übergabe an die Antwortlogik und hörbare lokale Sprachausgabe funktionieren.
- „Wie geht es dir?“ wurde korrekt erkannt und kostenlos lokal beantwortet.
- „Wie heiße ich?“ wurde korrekt mit Mike, der Anrede Sir und den Bereichen RHIA, Shadow Grown und RH Produktion beantwortet.
- „Was ist mein Künstlername?“ wurde zwar korrekt erkannt, konnte im bisherigen Stand aber wegen der nicht erreichbaren KI-Adresse nicht beantwortet werden.
- „Shadow Grown“ wurde von der Offline-Spracherkennung mindestens einmal als „Shadow großen“ erkannt.

**Änderung:**

- Die Fragen „Was ist mein Künstlername?“, „Wie lautet mein Künstlername?“, „Wie heiße ich als Rapper/Künstler?“ sowie „Wer/Was ist Shadow Grown?“ werden jetzt lokal und ohne OpenAI-Credits beantwortet.
- Häufige Erkennungsvarianten „Shadow großen“, „Shadow grossen“, „Shadow grauen“ und „Shadow Ground“ werden in der Oberfläche automatisch zu „Shadow Grown“ normalisiert.
- Die Antwortwartezeit wurde von 2,5 auf 10 Sekunden erhöht.
- Technische Fehler werden nicht mehr als „Befehl nicht verstanden“ ausgegeben, sondern als Verbindungs-, Internet- oder Zeitüberschreitungsfehler benannt.
- Dieselben persönlichen Grundfragen wurden auch im Cloudflare-Backend als `local-zero-credit` ergänzt.
- Die Kostenbremse bleibt verbindlich: Bekannte Fragen werden lokal beantwortet; ein OpenAI-Aufruf erfolgt erst nach Kostenschätzung und ausdrücklicher Bestätigung mit Ja.

**Sicherheitsentscheidung offen:**

- Die Android-App lädt die Oberfläche von GitHub Pages. Dort verweist `/api/chat` weiterhin ins Leere.
- Der vorhandene funktionierende Endpunkt ist `https://rhia.pages.dev/api/chat`.
- Eine direkte Verbindung würde bei freien Fragen Gesprächsverlauf und lokal bestätigte Erinnerungen an dieses RHIA-Backend übertragen. Diese Übertragung wird erst nach ausdrücklicher Freigabe durch Mike aktiviert.
- Bis dahin funktionieren lokale Befehle und die neu ergänzten kostenlosen Grundfragen; freie Online-KI-Fragen bleiben deaktiviert.

**Nächster Schritt:**

Mike entscheidet ausdrücklich, ob RHIA freie Fragen samt begrenztem Gesprächskontext und bestätigten Erinnerungen an das eigene Backend `rhia.pages.dev` senden darf. Bei Freigabe wird die Adresse verbunden, anschließend ohne OpenAI-Aufruf bis zur Kostenabfrage technisch getestet und erst danach von Mike in der vorhandenen v0.25-App geprüft.


### 05.08.2026, 15:07 Uhr – Baustein 3.1: situationsgerechte Ausdrucksweise

**Bereich:** Persönlichkeit / Antwortlogik / Online-KI

**Änderung:**

- RHIA beantwortet die konkrete Frage zuerst und stellt sich nur noch vor, wenn ausdrücklich nach ihrer Identität gefragt wird.
- Für Befindensfragen wie „Wie geht es dir?“ wurde eine passende natürliche Antwort ergänzt.
- Diese häufige Befindensfrage wird lokal und ohne OpenAI-Kosten beantwortet.
- Die zentrale Online-Persönlichkeitsanweisung wurde gegen allgemeine, unpassende Standardsätze präzisiert.
- Keine neue APK erforderlich; die Änderung wird zentral über die veröffentlichte RHIA-Oberfläche beziehungsweise Cloudflare-Funktion übernommen.

**Technischer Test:**

- Live-Endpunkt `https://rhia.pages.dev/api/chat` mit vier getrennten Fragen geprüft.
- „Wie geht es dir?“ → passende Befindensantwort, `local-zero-credit`.
- „Wer bist du?“ → RHIA-Vorstellung.
- „Was kannst du?“ → Funktionsübersicht.
- „Hallo RHIA“ → Begrüßung.
- Alle vier Tests bestanden; die veröffentlichte Funktion liefert HTTP 200.

**Offen:**

- Mike testet die neue Antwort einmal in der Android-App.
- Danach folgt Baustein 3.2: zentrales, datiertes und geräteübergreifendes RHIA-Gedächtnis mit Zugriffsschutz, Löschung und Export.

**Nächster Schritt:**

In der vorhandenen RHIA-App „Rhia, wie geht es dir?“ sagen. Nach bestätigter passender Antwort wird das zentrale Gedächtnis geplant und umgesetzt.


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
