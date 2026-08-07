# RHIA – Projektstand

**Letzte Aktualisierung:** 07.08.2026  
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

## Verbindlicher RHIA-Aufbauplan

Der vollständige verbindliche Entwicklungsplan steht in **`RHIA_AUFBAUPLAN.md`**. Er ersetzt am 07.08.2026 die frühere Reihenfolge, in der Stimme und App-Komfort vor der eigentlichen Arbeitszentrale lagen.

Die verbindliche Reihenfolge lautet nun:

0. Kurskorrektur und belastbares Fundament
1. Strukturiertes Gehirn und Gedächtnis
2. RHIA-Arbeitszentrale
3. Briefing, Planung und echte Assistenz
4. Kalender und Dateien
5. Ereigniszentrale und Eigeninitiative
6. E-Mail und Arbeitswerkzeuge
7. RHIA-Runner für kontrollierte Handlungen
8. Wahrnehmung und Spezialmodule
9. kontrollierte Lern- und Verbesserungsschleife
10. Bedienkomfort, Stimme, Wake-Word und lokale Robustheit

Bei jedem Baustein gilt: technischer Test, Daten- und Sicherheitstest, Fehlerfall, Mikes Praxistest, Ergebnis dokumentieren, erst dann der nächste Baustein.

## Aktueller verbindlicher Stand

### 07.08.2026, 09:30 Uhr – Stufe 0.1 technisch repariert; Geräte-Praxistest offen

**Bereich:** Besitzerzugang / zentrales Gedächtnis / Export und Löschung / Kosten- und Datenschutz

**Änderung:**

- Lesen, Schreiben, Exportieren und Löschen des zentralen Gedächtnisses verlangen jetzt den gültigen RHIA-Besitzerschlüssel.
- Der Schlüssel wird nicht mehr vor seiner Prüfung gespeichert. Die Eingabe erfolgt verdeckt; der Wert erscheint nicht in Programmcode, Protokollen oder Fehlermeldungen.
- Ein lokal gespeicherter falscher oder veralteter Schlüssel wird erkannt, entfernt und kann im selben Vorgang durch den aktuellen Schlüssel ersetzt werden. Der vorgemerkte Speichervorgang bleibt bei einem Fehler erhalten.
- In den Einstellungen kann Mike den Besitzerzugang prüfen oder ersetzen und das zentrale Gedächtnis als JSON-Datei exportieren.
- Der Befehl „Vergiss dauerhaft: …“ löscht nach einer zusätzlichen Ja-/Nein-Bestätigung genau den gewählten zentralen Eintrag.
- Persönliche Fragen wie „Wie lautet mein Testcode?“ werden bei passendem bestätigtem Eintrag direkt aus dem zentralen Gedächtnis beantwortet. Dafür wird kein OpenAI-Aufruf und kein Credit benötigt.
- Ein bestätigter kostenpflichtiger KI-Aufruf verlangt ebenfalls den gültigen Besitzerzugang; kostenlose lokale Antworten bleiben ohne Schlüssel nutzbar.
- Abhängigkeitfreie automatische Tests und ein GitHub-Actions-Testlauf wurden ergänzt.

**Technischer Test:**

- Sechs automatische Tests bestanden: fehlender, falscher, korrekter und veralteter Schlüssel; Schreiben; Neustart; simuliertes Zweitgerät; Export; geschützte Löschung; kostenlose Chatantwort; Schutz kostenpflichtiger Aufrufe; CORS und sichere verdeckte Eingabe.
- JavaScript-Syntax von Wissens- und Chat-Endpunkt bestanden.
- Die eingebettete Oberfläche wurde syntaktisch geprüft.
- Sicherheitssuche ohne fest eingetragenen Schlüssel, sichtbare `prompt`-Eingabe oder Token-Ausgabe im Protokoll bestanden.
- Für diese Tests wurden weder der echte Besitzerschlüssel noch OpenAI-Credits oder Produktionsdaten verwendet.

**Offen:**

- Nach Veröffentlichung muss Cloudflare Pages den neuen Stand bereitstellen.
- Mike muss den vollständigen Praxistest mit echtem Besitzerschlüssel auf Gerät A und Gerät B durchführen. Bis dahin ist Stufe 0.1 technisch vorbereitet, aber noch nicht vollständig abgenommen.
- Die sichtbare Versionsnummer bleibt deshalb zunächst v0.26.

**Nächster Schritt:**

Nach erfolgreicher Bereitstellung genau den Stufe-0.1-Praxistest durchführen: korrekten Schlüssel, falschen beziehungsweise veralteten Schlüssel, Speichern von „Mein Testcode ist Bordeaux 47“, vollständigen Neustart, Abruf auf dem Zweitgerät, Export und anschließende bestätigte Löschung prüfen. Erst nach Mikes Bestätigung wird Stufe 0.1 abgeschlossen und Stufe 1 begonnen.

### 07.08.2026 – Aufbauplan auf echte Assistenz ausgerichtet

**Bereich:** Gesamtarchitektur / Prioritäten / Lernfähigkeit / Moritz-Maaker-Videoanalyse

**Änderung:**

- Die bisherige Reihenfolge wurde ersetzt, weil Stimme und App-Komfort zu früh und Arbeitszentrale, Datenquellen, Ereignisse und Werkzeuge zu spät eingeordnet waren.
- `RHIA_AUFBAUPLAN.md` definiert nun Zielarchitektur, gemeinsames Datenmodell, Sicherheitsstufen, zehn Entwicklungsstufen und verbindliche Abnahmetests.
- Die ausgewerteten Video-Fähigkeiten wurden den realen technischen Modulen Gehirn, Gedächtnis, Arbeitszentrale, Ereigniszentrale, Werkzeugzentrale, Runner, Wahrnehmung und Lernschleife zugeordnet.
- „Selbst lernen“ ist verbindlich als kontrollierte Entwicklung von bestätigtem Gedächtnis über Muster und Playbooks bis zu getesteten Verbesserungsvorschlägen definiert. RHIA darf ihren Produktionscode nicht heimlich selbst verändern.

**Test:**

- Plan mit dem tatsächlichen Repository-Stand von v0.26 abgeglichen.
- Jede Entwicklungsstufe besitzt ein sichtbares Nutzerergebnis, technische Bausteine, Grenzen und einen Praxistest.
- Der vorhandene Token-/Gedächtnisfehler bleibt als erster technischer Schritt erhalten, ohne Stimme oder Optik vorzuziehen.

**Offen:**

- Der neue Plan ist eine Architektur- und Reihenfolgeentscheidung; die beschriebenen neuen Assistentenmodule sind noch nicht implementiert.
- Der zentrale Besitzerzugang und vollständige Gerätewechseltest sind weiterhin fehlerhaft beziehungsweise unbestätigt.

**Nächster Schritt:**

Stufe 0.1 umsetzen: Owner-Token-/Gedächtnisfluss reproduzierbar reparieren und mit korrektem, falschem sowie veraltetem Schlüssel, Neustart, Zweitgerät, Export und Löschung testen.

### 07.08.2026 – v0.26 live; Übergabe- und Teststand gesichert

**Bereich:** Zentrales Gedächtnis / Cloudflare / Browser / Android-App / Sprache

**Bestätigter Stand:**

- PR 19 „Release RHIA v0.26 central memory“ wurde mit genau sechs Dateien in `main` zusammengeführt.
- Die öffentliche Cloudflare-Pages-Seite `https://rhia.pages.dev/` zeigt v0.26.
- Der neue Gedächtnis-Endpunkt antwortet mit HTTP 200 und das zentrale Grundwissen wird geladen.
- Im tatsächlichen Cloudflare-Pages-Projekt `rhia` sind `OPENAI_API_KEY`, die KV-Bindung `RHIA_KNOWLEDGE` und das Secret `RHIA_OWNER_TOKEN` eingerichtet.
- Die gleichnamigen Einträge im älteren Worker `falling-bar-25b6` dürfen vorerst bestehen bleiben; sie stören nicht und werden nicht ohne gesonderte Prüfung gelöscht.
- Die installierte Android-App zeigt weiterhin v0.25, während der Browser bereits v0.26 zeigt. Die App wurde nicht gelöscht und es wurde keine neue APK installiert.

**Bisheriger Praxistest:**

- Bei der freien Formulierung „Mein Testcode ist …, merke dir das“ erschien zunächst die Kostenfreigabe. Mike hat korrekt „Nein“ gewählt; dadurch sollte kein kostenpflichtiger KI-Aufruf erfolgen.
- Der eindeutige Befehl „Merke dir dauerhaft: Mein Testcode ist …“ löste korrekt die einmalige Abfrage des RHIA-Besitzerschlüssels aus.
- Der Besitzerschlüssel wurde in diesem Test noch nicht als erfolgreich eingegeben bestätigt. Dauerhaftes Speichern und Wiederabrufen sind deshalb noch nicht als bestanden dokumentiert.
- Im Browser klingt RHIA teilweise natürlicher, verwendet aber hörbar unterschiedliche Stimmen. Das ist ein offener Fehler; Systemmeldungen und normale Antworten sollen dieselbe feste RHIA-Stimme verwenden.

**Sicherheitsregel:**

- Der Wert von `RHIA_OWNER_TOKEN` darf niemals in Chat, Screenshot, Repository oder Programmcode erscheinen.
- Mike gibt ihn nur auf seinem eigenen Gerät und nur auf der echten Adresse `rhia.pages.dev` ein. Er wird dort einmalig lokal gespeichert.
- Neue Informationen werden nur nach dem ausdrücklichen dauerhaften Merkbefehl und anschließender Bestätigung gespeichert.

**Exakter nächster Schritt:**

1. Im Browser auf `rhia.pages.dev` bei der bereits ausgelösten Abfrage den vorhandenen Owner-Token eingeben und mit OK bestätigen.
2. Nur die sichtbare Antwort von RHIA berichten, niemals den Token.
3. Speichern von „Mein Testcode ist Bordeaux 47“ mit „Ja“ bestätigen.
4. Browser-Tab vollständig schließen, neu öffnen und fragen: „Wie lautet mein Testcode?“
5. Erst wenn „Bordeaux 47“ wiedergegeben wird, den geräteübergreifenden Gedächtnistest als bestanden dokumentieren.
6. Danach den Wechsel der Stimmen beheben und anschließend dafür sorgen, dass die bestehende Android-App den zentralen v0.26-Stand lädt, ohne sie zu löschen.


### 06.08.2026, 13:30 Uhr – v0.26 begonnen: falsche Identitätsannahme entfernt

**Bereich:** KI-Kern / zentrales Wissen / Datenqualität

**Bestätigte Korrektur:**

- Mike ist Gründer und Verantwortlicher von RH Produktion.
- Shadow Grown ist ein eigenständiger Künstler und Mitarbeiter von RH Produktion.
- Mike und Shadow Grown dürfen von RHIA nicht automatisch als dieselbe Person behandelt werden.

**Änderung:**

- Die falschen vorbereiteten Antworten zu Mikes angeblichem Künstlernamen wurden aus Oberfläche und Backend entfernt.
- Die falsche Identitätszuordnung wurde aus der KI-Anweisung entfernt.
- `knowledge/rhia-core.json` wurde als geprüfter Grundbestand für bestätigte Fakten angelegt. Jeder Eintrag besitzt Kennung, Subjekt, Aussage, Bestätigungsstatus, Quelle und Datum.
- Das KI-Backend lädt das verbindliche Wissen selbst aus dem zentralen Cloudflare-KV-Speicher `RHIA_KNOWLEDGE`. Die Oberfläche kann der KI keine eigenen angeblichen Zentralfakten mehr unterschieben.
- Der neue Endpunkt `/api/knowledge` liest das zentrale Wissen geräteübergreifend und schreibt neue bestätigte Fakten nur mit dem serverseitig geprüften Besitzerschlüssel `RHIA_OWNER_TOKEN`.
- Der Sprach-/Textbefehl „Merke dir dauerhaft, dass …“ erzeugt zunächst nur einen Vorschlag. Erst ein anschließendes „Ja“ löst den geschützten Speichervorgang aus; „Nein“ verwirft ihn.
- Das KI-Backend formuliert Antworten aus bestätigtem Wissen; es enthält keinen fertigen Antwortsatz für „Wer ist Shadow Grown?“.
- OpenAI-Anfragen verwenden ausdrücklich `store: false`; RHIA behandelt den Gesprächszustand nicht als dauerhaftes Faktenarchiv.
- Die sichtbare Webversion wurde auf Alpha v0.26 erhöht. Eine neue APK ist für diese zentrale Änderung nicht erforderlich.

**Technischer Test:**

- JavaScript-Syntax von Oberfläche, Chat-Backend und Wissens-Backend bestanden.
- Der vollständige Gedächtnisfluss wurde mit einem simulierten Cloudflare-KV getestet: Grundwissen lesen, falschen Besitzerschlüssel ablehnen, bestätigte Information schreiben und nach erneutem Lesen wiederfinden.
- JSON-Syntax des Grundbestands bestanden.
- Suche nach den drei früheren falschen Zuordnungen im ausführbaren Code ohne Treffer.
- Git-Diff-Prüfung ohne Leerraumfehler bestanden.

**Offen:**

- Vor dem Live-Test müssen in Cloudflare einmalig die KV-Bindung `RHIA_KNOWLEDGE` und das Geheimnis `RHIA_OWNER_TOKEN` eingerichtet werden.
- Der Besitzerschlüssel wird beim ersten Speichern auf Mikes Gerät abgefragt und nur lokal auf diesem Gerät gespeichert.
- Der echte KI-Test aus der App benötigt weiterhin eine ausdrückliche Kostenbestätigung.

**Nächster Schritt:**

Den v0.26-Grundstand veröffentlichen, Cloudflare-KV und Besitzerschlüssel verbinden und anschließend den vollständigen Meilensteintest auf zwei Geräten durchführen.

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
