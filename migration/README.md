# Kontrollierte Gedächtnismigration

Dieses Verzeichnis beschreibt ausschließlich die spätere, ausdrücklich freizugebende Migration. Kein Skript verbindet sich selbstständig mit Cloudflare, liest Browserdaten aus der Ferne oder verändert Produktionsdaten.

## Sicherheitsgrenzen

- Der alte zentrale Export wird außerhalb des produktiven RHIA-Datenwegs als Datei bereitgestellt.
- Bestätigte Altlöschungen werden als eigene Löschmarkierungen übergeben. Sie haben Vorrang vor aktiven Fakten.
- `prepare-memory-migration.mjs` normalisiert die Eingaben und bildet eine SHA-256-Prüfsumme. Ohne `--out` schreibt es keine Datei.
- Die erste zentrale Migration setzt einen leeren Durable-Object-Speicher voraus.
- Der API-Endpunkt `/api/memory-migration` ist standardmäßig gesperrt und antwortet erst, wenn `RHIA_MIGRATION_ENABLED=true` bewusst gesetzt wurde.
- Vorschau und Import sind getrennte Schritte. Der Import verlangt Besitzerschlüssel, Ausgangsrevision und exakt die zuvor bestätigte Prüfsumme.
- Derselbe `sourceId` kann nur einmal mit derselben Prüfsumme übernommen werden. Abweichende Wiederholungen werden abgelehnt.
- Nach Import werden `storeId`, Revision, Importprotokoll sowie Fakten und Tombstones über den Exportweg erneut gelesen. Jeder erwartete Fakt muss mit ID, Aussage und SHA-256-Fingerabdruck aktiv vorhanden oder durch einen inhaltlich passenden Tombstone geschützt sein; jeder erwartete Tombstone muss nachweisbar sein.
- Die exakten Rohwerte der drei alten Browserquellen werden vor der Vorschau per SHA-256 gebunden, vor dem Import und unmittelbar vor der Bereinigung neu inventarisiert. Eine Abweichung verwirft die Freigabe und verlangt eine neue Vorschau.
- Aufgaben, Notizen, Ideen, UI-Einstellungen und Besitzerschlüssel sind keine Bereinigungsziele. Aus den Einstellungen wird ausschließlich der nachweislich migrierte alte `profile`-Teil entfernt.
- Der alte Chat besitzt einen getrennten Export. SHA-256-Prüfsumme, Anzahl und Reihenfolge werden vor der Löschung erneut geprüft; danach sind zwei ausdrückliche Löschbetätigungen erforderlich.
- Es gibt weder während noch nach der Migration einen Rückfall auf den alten Speicher.

## Isolierte Vorschaukonfiguration

- Die Browseroberfläche verwendet ausschließlich same-origin-Adressen unter `/api/...`.
- Production bindet `RHIA_MEMORY` an `rhia-memory-store`; Preview bindet denselben Namen an den eigenständigen Worker `rhia-memory-store-preview` und damit an eine getrennte Durable-Object-Namespace.
- Preview akzeptiert ausschließlich das separat einzurichtende Secret `RHIA_PREVIEW_OWNER_TOKEN`. `RHIA_OWNER_TOKEN` wird im Preview-Modus auch dann nicht verwendet, wenn es versehentlich vorhanden wäre.
- Ein optionaler Online-KI-Test in Preview akzeptiert ausschließlich `RHIA_PREVIEW_OPENAI_API_KEY`; ohne dieses getrennte Secret bleibt er gesperrt.
- `RHIA_MIGRATION_ENABLED` steht in Preview und Production standardmäßig auf `false`.
- `pages_build_output_dir` zeigt auf `dist`. Der Build kopiert ausschließlich `index.html`; insbesondere `knowledge/rhia-core.json`, Quellcode, Konfiguration und Projektdokumentation sind nicht öffentlich enthalten.
- Diese Repository-Konfiguration legt selbst keine Cloudflare-Ressource an. Ein späterer Deploy erfordert weiterhin eine eigene Freigabe und getrennte Secrets.

## Spätere Reihenfolge

1. Schreibpause bestätigen.
2. Alten zentralen Speicher einmal exportieren; nichts löschen.
3. Liste der bestätigten Altlöschungen erstellen und von Mike prüfen lassen.
4. Lokal nur die Vorschau erzeugen:

   ```sh
   node scripts/prepare-memory-migration.mjs \
     --source alter-export.json \
     --deletions bestaetigte-loeschungen.json \
     --source-id central-export-YYYY-MM-DD
   ```

5. Erst nach Prüfung mit einem neuen Dateinamen das Manifest schreiben (`--out ...`). Vorhandene Dateien werden nicht überschrieben.
6. Zuerst ausschließlich den Preview-Durable-Object-Worker und das Preview-Pages-Binding mit getrenntem Preview-Besitzerschlüssel bereitstellen; Production und alte Bindungen bleiben unangetastet.
7. Migrationszugang vorübergehend aktivieren, Vorschau ausführen, Faktenliste und Prüfsumme erneut bestätigen.
8. Einmal importieren und vollständig zurücklesen.
9. Oberfläche, Export und Chat gemeinsam auf dieselbe `storeId` und Revision prüfen.
10. Erst danach die produktive alte Bindung entfernen. Der alte Speicherinhalt bleibt bis zu einer gesonderten Löschfreigabe eingefroren.
11. Pro Browser „Altgedächtnis nur prüfen“ und anschließend den ausdrücklich bestätigten Import ausführen. Alte Browserwerte werden nur nach vollständiger Inhalts-, Rohwert- und Rückleseprüfung entfernt. Der alte Chat bleibt davon getrennt.
12. Den Migrationszugang wieder deaktivieren.
13. Tablet-Test 14 durchführen. Stufe 0.1 bleibt bis zu diesem Praxistest offen.

`knowledge/rhia-core.json` bleibt bis zur tatsächlichen Migration ein nicht angeschlossenes Vergleichsarchiv. Es wird von keiner Laufzeitdatei importiert.
