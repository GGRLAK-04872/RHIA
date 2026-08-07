# RHIA – verbindlicher Aufbauplan zur persönlichen KI-Assistentin

**Beschlossen am:** 07.08.2026  
**Projekt:** RHIA – RH Intelligent Assistant  
**Ziel:** Eine persönliche, geräteübergreifende KI-Assistentin für Mike, RH Produktion, RHIA und Shadow Grown. Sie kennt den Arbeitsstand, plant mit, verbindet freigegebene Informationsquellen, meldet Wichtiges selbstständig und führt bestätigte Aktionen kontrolliert aus.

## 1. Was RHIA werden soll

RHIA ist weder nur ein Chatbot noch nur eine animierte Oberfläche. Das Zielsystem besteht aus sechs zusammenarbeitenden Ebenen:

1. **Gehirn:** versteht Absicht, Kontext, Ziele und Zusammenhänge.
2. **Gedächtnis:** speichert bestätigte Fakten, Entscheidungen, Projekte, Aufgaben und Ereignisse strukturiert.
3. **Arbeitszentrale:** bewertet Prioritäten und erstellt Tagespläne, Briefings und Vorschläge.
4. **Augen und Ohren:** verarbeitet später Sprache, Dateien, Bilder, Kamera, Standort und andere freigegebene Daten.
5. **Hände:** benutzt Kalender, E-Mail, Dateien, Browser und weitere Werkzeuge innerhalb klarer Freigaben.
6. **Lernschleife:** erkennt wiederkehrende Muster, schlägt bessere Abläufe vor und übernimmt sie erst nach Mikes Bestätigung.

Die Stimme, der Organismus und das Wake-Word bleiben Teil von RHIA. Sie sind jedoch die Bedienoberfläche und nicht mehr der Entwicklungsengpass.

## 2. Nicht verhandelbare Regeln

- **Kontrolle vor Autonomie:** RHIA darf lesen und vorbereiten, aber externe oder riskante Aktionen nicht ungefragt ausführen.
- **Eine verlässliche Datenquelle:** Projekte, Aufgaben, Termine, Fakten und Entscheidungen liegen zentral und geräteübergreifend vor; lokale Daten sind nur Offline-Kopie oder Zwischenspeicher.
- **Bestätigte Fakten statt Vermutungen:** Jede Erinnerung besitzt Typ, Quelle, Zeit, Gültigkeit und Bestätigungsstatus.
- **Nachvollziehbarkeit:** Jede Änderung und Werkzeugaktion erhält ein Protokoll: was, wann, warum und durch wen.
- **Kostenkontrolle:** Kostenfreie lokale oder regelbasierte Verarbeitung zuerst; kostenpflichtige KI-Aufrufe sind sichtbar begrenzt und nachvollziehbar.
- **Datenschutz:** Minimale Datenübertragung, Export und Löschung, klar getrennte Zugriffsrechte und keine heimliche Daueraufnahme.
- **Kleine getestete Schritte:** Technischer Test, anschließend Mikes Praxistest, dann Dokumentation und erst danach die nächste Stufe.
- **Keine Demo-Abkürzung:** Ein Dashboard gilt nicht als Fähigkeit, solange Datenquelle, Logik und Aktion dahinter nicht funktionieren.

## 3. Sicherheitsstufen für Handlungen

| Stufe | RHIA darf | Beispiele |
|---|---|---|
| A – selbstständig lesen | ausdrücklich freigegebene Daten lesen und zusammenfassen | Aufgaben, Termine, Projektstand, freigegebene Dateien |
| B – selbstständig vorbereiten | Entwürfe und Vorschläge erstellen, aber nichts extern verändern | Tagesplan, E-Mail-Entwurf, Termin-Vorschlag |
| C – einzeln bestätigen | eine klar beschriebene Aktion nach Mikes Ja ausführen | E-Mail senden, Termin ändern, Webseite bedienen |
| D – besonders schützen | Ziel, Betrag und Folgen erneut anzeigen und ausdrücklich bestätigen lassen | Kauf, Buchung, Veröffentlichung, Löschen, Finanztransaktion |
| Verboten | keine heimliche oder unkontrollierte Ausführung | Passwörter offenlegen, Schutz umgehen, Geld selbstständig handeln |

## 4. Zielarchitektur

RHIA bleibt zunächst ein **modularer Monolith**: ein gemeinsam betreibbares System mit klar getrennten Modulen. Erst bei echtem Bedarf werden Dienste ausgelagert.

### Zentrale Module

- **Identität und Rechte:** Mike als Besitzer, später weitere Rollen und Geräte.
- **Kontextdienst:** stellt für jede Anfrage nur die passenden Informationen zusammen.
- **Strukturiertes Gedächtnis:** Fakten, Präferenzen, Entscheidungen und Episoden mit Quellen.
- **Arbeitsmodell:** Bereiche, Projekte, Ziele, Aufgaben, Termine, Abhängigkeiten und Arbeitsblöcke.
- **Planer:** priorisiert nach Frist, Geldwirkung, Wichtigkeit, Aufwand und Schutzzeit.
- **Ereigniszentrale:** verarbeitet neue oder veränderte Informationen und entscheidet zwischen sofort melden, Briefing oder nur speichern.
- **Werkzeugzentrale:** einheitliche Schnittstelle zu Kalender, E-Mail, Dateien, Recherche und später Browser-/Gerätesteuerung.
- **Freigabe und Aktionsprotokoll:** zeigt geplante Aktionen vor Ausführung und speichert das Ergebnis.
- **Lern- und Auswertungsschleife:** bewertet Vorschläge und Aktionen anhand bestätigter Ergebnisse.
- **Oberfläche und Sprache:** Handy, Tablet und später Computer greifen auf denselben Kern zu.

### Gemeinsames Datenmodell

Mindestens diese Objekte werden getrennt gespeichert:

- Person und Rolle
- Bereich/Welt
- Projekt und Ziel
- Aufgabe und Unteraufgabe
- Termin und Arbeitsblock
- Entscheidung und Begründung
- Fakt/Erinnerung mit Quelle und Gültigkeit
- Ereignis und Priorität
- Datei/Quelle als Verweis, nicht als unkontrollierte Kopie
- Werkzeugaktion, Freigabe und Ergebnis
- wiederverwendbarer Ablauf/Playbook
- Feedback: hilfreich, falsch, erledigt, verworfen oder korrigiert

## 5. Verbindliche Entwicklungsreihenfolge

### Stufe 0 – Kurskorrektur und belastbares Fundament

**Ergebnis für Mike:** Der aktuelle Stand bleibt benutzbar, das zentrale Gedächtnis ist erreichbar, und wir besitzen einen ehrlichen technischen Ausgangspunkt.

**Bauen:**

- den fehlerhaften Owner-Token-/Gedächtnisfluss reparieren;
- zentrale Fehler- und Kostenprotokolle ohne geheime Inhalte ergänzen;
- Datenexport, Löschweg und Sicherung für zentrale RHIA-Daten festlegen;
- vorhandene lokale Aufgaben, Notizen, Ideen und Erinnerungen inventarisieren;
- veraltete Projektplan-Prioritäten durch dieses Dokument ersetzen;
- automatische Tests für Authentifizierung, Lesen, Schreiben, Neustart und zwei Geräte anlegen.

**Abnahmetest:** Eine bestätigte Information wird auf Gerät A gespeichert, nach vollständigem Neustart auf Gerät B korrekt abgerufen, exportiert und testweise wieder gelöscht. Falsche Schlüssel werden ohne Datenänderung abgelehnt.

**Noch nicht:** Stimme, Wake-Word oder Optik perfektionieren.

---

### Stufe 1 – Strukturiertes Gehirn und Gedächtnis v1

**Ergebnis für Mike:** RHIA kennt nicht nur einzelne Sätze, sondern versteht, ob etwas eine Person, ein Projekt, ein Ziel, eine Entscheidung oder eine Präferenz ist.

**Bauen:**

- zentrales strukturiertes Datenmodell;
- bestätigtes Speichern, Korrigieren, Vergessen und Zusammenführen;
- Quellen- und Datumsangaben;
- relevante Kontextsuche statt Übertragung des gesamten Archivs;
- Widerspruchserkennung: RHIA fragt nach, wenn neue Angaben alten widersprechen;
- Trennung von dauerhaftem Wissen, Gesprächsverlauf und kurzlebigem Arbeitszustand.

**Abnahmetest:** Mike korrigiert eine falsche Angabe, wechselt das Gerät und RHIA verwendet danach nur die neue bestätigte Fassung samt richtiger Projektzuordnung.

---

### Stufe 2 – RHIA-Arbeitszentrale v1

**Ergebnis für Mike:** RHIA kann auf jedem Gerät beantworten: Was läuft, was ist offen, was ist als Nächstes wichtig und warum?

**Bauen:**

- zentrale Bereiche: Privat, RH Produktion, RHIA und Shadow Grown;
- Projekte, Ziele, Aufgaben, Unteraufgaben, Fristen, Status und Abhängigkeiten;
- Termine und Arbeitsblöcke;
- Prioritätslogik nach Dringlichkeit, Geldwirkung, Wichtigkeit, Aufwand und Blockaden;
- wöchentliche 20-%-Schutzzeit für Langzeitprojekte und 60-Minuten-Schutzblöcke;
- Migration der bisherigen lokalen Aufgaben und Ideen;
- einfache Arbeitszentrale in der vorhandenen Oberfläche.

**Abnahmetest:** Mike legt auf dem Handy eine Aufgabe mit Projekt und Frist an. Auf dem Tablet erscheint sie korrekt einsortiert; RHIA erklärt nachvollziehbar, warum sie heute, später oder gar nicht vorgeschlagen wird.

---

### Stufe 3 – Briefing, Planung und echte Assistenz v1

**Ergebnis für Mike:** RHIA erstellt morgens ein persönliches Lagebild und einen realistischen Tagesvorschlag statt nur Listen anzuzeigen.

**Bauen:**

- Morgenbriefing: Termine, wichtigste Aufgaben, Blockaden, Risiken und freie Zeit;
- Tagesplanung mit Arbeitsblöcken und Ersatzblöcken;
- Abendrückblick: erledigt, offen, verschoben, gelernt;
- Rückfragen nur bei entscheidenden Lücken;
- Prioritätsbegründung in natürlicher Sprache;
- Feedbackknöpfe/-befehle: übernehmen, ändern, falsch, später;
- Benachrichtigungs-Ruhezeiten und tägliche Zusammenfassung.

**Abnahmetest:** RHIA erstellt an fünf aufeinanderfolgenden Tagen einen brauchbaren Plan. Änderungen und unerledigte Aufgaben fließen am Folgetag korrekt ein, ohne dass Mike alles neu erklären muss.

**Erster echter Assistenten-Meilenstein:** Nach dieser Stufe fühlt sich RHIA erstmals wie eine persönliche Assistentin und nicht nur wie eine Oberfläche an.

---

### Stufe 4 – Erste Datenquellen: Kalender und Dateien

**Ergebnis für Mike:** RHIA verbindet den eigenen Arbeitsstand mit echten Terminen und freigegebenen Unterlagen.

**Bauen:**

- Kalender zunächst nur lesen, danach Änderungen als Vorschlag;
- ausgewählte Dateien lesen, zusammenfassen und Projekten zuordnen;
- Quellenanzeige und Aktualitätsdatum;
- Berechtigungen je Datenquelle;
- Änderungsabgleich ohne Duplikate;
- Werkzeugfehler verständlich anzeigen und sicher zurückfallen.

**Abnahmetest:** RHIA erkennt einen Terminkonflikt mit einer wichtigen Aufgabe, nennt die Quellen und schlägt eine Änderung vor. Ohne Bestätigung wird nichts verändert.

---

### Stufe 5 – Ereigniszentrale und kontrollierte Eigeninitiative

**Ergebnis für Mike:** RHIA wartet nicht immer auf eine Frage, sondern meldet sich bei wirklich relevanten Veränderungen.

**Bauen:**

- Ereignisse aus Fristen, Kalender, Projektstatus und verbundenen Quellen;
- Relevanzbewertung für Mike und das aktuelle Projekt;
- drei Ausgänge: sofort melden, nächstes Briefing, nur protokollieren;
- Drosselung gegen Benachrichtigungsflut;
- Eskalation bei wiederholt ignorierten kritischen Aufgaben;
- später Push-Mitteilungen und optionaler Anruf nur nach ausdrücklicher Einrichtung.

**Abnahmetest:** Eine simulierte Terminänderung erzeugt genau eine passende Meldung; eine unwichtige Änderung landet nur im Briefing. RHIA erklärt jeweils, warum.

---

### Stufe 6 – E-Mail und weitere Arbeitswerkzeuge

**Ergebnis für Mike:** RHIA kann wichtige Nachrichten mit Projekten verbinden und Antworten vorbereiten.

**Bauen:**

- E-Mail zuerst lesen, sortieren und zusammenfassen;
- wichtige Nachrichten Aufgaben/Projekten zuordnen;
- Antwortentwürfe erstellen;
- Senden ausschließlich nach Vorschau und Bestätigung;
- Kontakte eindeutig auflösen;
- später Betriebszahlen, Content-Daten und weitere RH-Produktion-Quellen anbinden.

**Abnahmetest:** RHIA erkennt eine projektbezogene Nachricht, erstellt Aufgabe und Antwortentwurf. Mike sieht Empfänger und Text; erst sein Ja versendet.

---

### Stufe 7 – RHIA-Runner: kontrollierte Handlungen

**Ergebnis für Mike:** RHIA kann klar begrenzte mehrstufige Abläufe in Diensten oder im Browser vorbereiten und nach Freigabe ausführen.

**Bauen:**

- Werkzeugplan vor Ausführung;
- einzelne überprüfbare Schritte mit Status;
- Freigabepunkte vor externen Änderungen;
- Abbruch, Zeitüberschreitung, Wiederaufnahme und Rückmeldung;
- sichere Playbooks für wiederkehrende Abläufe;
- später Fernsteuerung des eigenen Computers/Handys nur über bewusst gekoppelte Geräte;
- Käufe, Buchungen, Veröffentlichungen und Löschungen immer Sicherheitsstufe D.

**Abnahmetest:** RHIA recherchiert eine klar begrenzte Option, füllt einen Vorgang bis vor den verbindlichen Abschluss aus und stoppt. Nach Bestätigung führt sie aus und protokolliert Ergebnis oder Fehler.

---

### Stufe 8 – Wahrnehmung und Spezialmodule

**Ergebnis für Mike:** RHIA kann freigegebene Bilder, Kamera-, Gesprächs-, Standort-, Gesundheits-, Markt- oder Live-Daten verstehen und mit Mikes Kontext verbinden.

**Mögliche Module, einzeln statt gleichzeitig:**

1. Bilder, PDFs und Videos analysieren;
2. Kamera nur nach sichtbarer Aktivierung;
3. Gesprächsnotizen nur mit Einwilligung aller Beteiligten;
4. Standort- und Reisehinweise;
5. Gesundheitsdaten erklären, ohne medizinische Diagnosen;
6. Aktien/Krypto analysieren, niemals selbstständig handeln;
7. öffentliche Nachrichten-, Karten- und Live-Daten zu einem Lagebild verbinden;
8. Entwicklungsagent für Code mit Tests und kontrollierter Veröffentlichung.

**Abnahmetest:** Jedes Spezialmodul erhält einen eigenen Daten-, Genauigkeits-, Datenschutz- und Sicherheitstest. Ein Modul wird erst freigegeben, wenn seine Unsicherheit sichtbar ist.

---

### Stufe 9 – Lernende RHIA und Verbesserungsschleife

**Ergebnis für Mike:** RHIA passt sich schrittweise an Mikes Arbeitsweise an, ohne unkontrolliert ihre Regeln oder ihren Produktionscode zu verändern.

#### Lernstufe L1 – bestätigtes Lernen

RHIA speichert Korrekturen, Präferenzen und Ergebnisse nach Bestätigung. Beispiel: „Dienstags keine langen RHIA-Blöcke“ oder „Diese Art Aufgabe gehört zu RH Produktion“.

#### Lernstufe L2 – Muster erkennen

RHIA erkennt wiederkehrende Verschiebungen, produktive Zeiten, typische Abläufe und Prioritätsentscheidungen. Sie sagt: „Mir fällt auf … Soll ich das künftig berücksichtigen?“ Ohne Ja bleibt es nur ein Vorschlag.

#### Lernstufe L3 – Abläufe lernen

Aus mehrfach bestätigten Aktionsfolgen erstellt RHIA ein Playbook. Mike prüft Name, Auslöser, Schritte, erlaubte Werkzeuge und Freigabepunkte, bevor es aktiv wird.

#### Lernstufe L4 – sich selbst verbessern, aber kontrolliert

RHIA sammelt Fehlerfälle und Bewertungen, erstellt daraus Verbesserungsvorschläge für Regeln, Prompts oder Code und testet diese in einer getrennten Testumgebung. Nur Änderungen, die automatische Tests und Mikes Freigabe bestehen, gelangen in die echte RHIA.

#### Was „selbst trainieren“ nicht bedeutet

- RHIA trainiert nicht laufend ein eigenes großes Sprachmodell auf Mikes Geräten.
- RHIA darf ihren Produktionscode nicht heimlich umschreiben oder veröffentlichen.
- Das erste wirksame Lernen geschieht über strukturiertes Gedächtnis, Feedback, Regeln, Playbooks und Tests – nicht über teures Modelltraining.
- Ein späteres Modell-Finetuning ist nur sinnvoll, wenn genügend saubere, erlaubte Beispieldaten und messbare Tests vorliegen. Es ersetzt weder Gedächtnis noch Werkzeuge.

**Abnahmetest:** RHIA schlägt aus echten Korrekturen eine neue Regel oder ein Playbook vor, kann die Belege nennen, wendet es erst nach Bestätigung an und lässt es vollständig zurücknehmen.

---

### Stufe 10 – Bedienkomfort und lokale Robustheit

**Ergebnis für Mike:** Der bereits nützliche Assistent wird angenehm, natürlich und zuverlässig bedienbar.

**Bauen:**

- eine konsistente RHIA-Stimme;
- zuverlässige Spracheingabe mit Störgeräuschen und Offline-/Online-Rückfall;
- Wake-Word;
- stabile automatische Aktualisierung der bestehenden signierten Android-App;
- flüssige Handy-, Tablet- und Computeransicht;
- optimierter Organismus, Rollen und optionale Stimmen;
- Offline-Grundfunktionen und Synchronisation nach Wiederverbindung.

**Hinweis:** Sicherheits- oder notwendige App-Update-Reparaturen dürfen früher erfolgen. Reine Komfort- und Designarbeit bleibt hinter den Assistenten-Meilensteinen.

## 6. Qualitäts- und Abnahmeverfahren für jede Stufe

Eine Stufe gilt erst als abgeschlossen, wenn alle fünf Tore bestanden sind:

1. **Funktion:** Der definierte Kernablauf arbeitet technisch.
2. **Daten:** Neustart, Gerätewechsel, Duplikate, Korrektur und Löschung sind geprüft.
3. **Sicherheit:** Rechte, Freigabe, Protokoll und Abbruch verhalten sich korrekt.
4. **Fehlerfall:** Offline, Zeitüberschreitung, falsche Daten und Werkzeugfehler erzeugen keine stille Fehlaktion.
5. **Mike-Test:** Mike führt den beschriebenen Praxistest selbst durch und bestätigt das Ergebnis.

Erst danach werden Projektstand, Versionsnummer, Testdatum und nächster Schritt im Repository aktualisiert.

## 7. Was wir aus den Moritz-Maaker-Videos übernehmen – und was nicht

### Übertragbare Kernideen

- zentrale Assistenz plus spezialisierte Werkzeuge;
- Daten aus mehreren Quellen zu einem Lagebild verbinden;
- Briefings, Prioritäten und Handlungsvorschläge statt bloßer Chatantworten;
- Ereignisse erkennen und situationsgerecht selbstständig melden;
- Runner für längere Browser-, Computer- und Geräteaktionen;
- sichtbarer Fortschritt, Freigabepunkte und Rückmeldung;
- mobile und stationäre Nutzung mit demselben Kontext;
- spezialisierte Module für Arbeit, Finanzen, Gesundheit, Medien und Live-Daten.

### Nicht ungeprüft übernehmen

- Werbe-Dashboards ohne echte Datenanbindung;
- behauptete Vollautonomie, die das Video nicht belegt;
- „Geheimdienst“-Sprache für öffentlich verfügbare Daten;
- unkontrollierte Bestellungen, Buchungen, Finanztransaktionen oder Gerätezugriffe;
- Zukunftsvisionen als angeblich bereits funktionierende Technik.

### Letzter Videoblock 17110–17119

Der letzte Block bestätigt: Gesten-/Bewegungsreaktion, Live-Sport-Kommentar, Weltlage, Telefonoberfläche, Claude-Code-Steuerung, Laptop- und Handy-Steuerung, aktive Warnung sowie ein eigeninitiierter Anruf. Für RHIA entstehen daraus keine neuen Sofortbaustellen. Die Funktionen gehören sauber in Wahrnehmung, Ereigniszentrale, Runner, Entwicklungsagent und Benachrichtigungskanäle.

## 8. Exakter nächster Arbeitsschritt

**Stufe 0.1: zentralen Besitzerzugang und Gedächtnisfluss reparieren und automatisiert testen.**

Dabei wird nicht weiter mit einem Testwort herumprobiert, bis der Fehler verstanden ist. Zuerst werden folgende technische Fälle reproduzierbar geprüft:

1. kein Schlüssel vorhanden;
2. korrekter Schlüssel;
3. falscher Schlüssel;
4. lokal gespeicherter veralteter Schlüssel;
5. erfolgreicher Schreibvorgang mit sichtbarer Bestätigung;
6. Abruf nach Neustart;
7. Abruf auf einem zweiten Gerät;
8. Export und Löschung;
9. keine Geheimnisse in Code, Protokoll oder Fehlermeldung.

Nach bestandenem Stufe-0-Test beginnt **Stufe 1: strukturiertes Datenmodell und Gedächtnis v1**. Stimmenwechsel und reine Optikänderungen sind ausdrücklich nicht der nächste Entwicklungsbaustein.

