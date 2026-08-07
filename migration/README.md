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
- Nach Import werden `storeId`, Revision, Importprotokoll und der normale Gedächtnisabruf erneut gelesen. Erst eine vollständige Übereinstimmung erlaubt die Browserbereinigung.
- Es gibt weder während noch nach der Migration einen Rückfall auf den alten Speicher.

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
6. Durable Object und Pages-Binding getrennt bereitstellen, ohne die alte Bindung bereits zu entfernen.
7. Migrationszugang vorübergehend aktivieren, Vorschau ausführen, Faktenliste und Prüfsumme erneut bestätigen.
8. Einmal importieren und vollständig zurücklesen.
9. Oberfläche, Export und Chat gemeinsam auf dieselbe `storeId` und Revision prüfen.
10. Erst danach die produktive alte Bindung entfernen. Der alte Speicherinhalt bleibt bis zu einer gesonderten Löschfreigabe eingefroren.
11. Pro Browser „Altgedächtnis nur prüfen“ und anschließend den ausdrücklich bestätigten Import ausführen. Alte Browserwerte werden nur nach der Rückleseprüfung entfernt.
12. Den Migrationszugang wieder deaktivieren.
13. Tablet-Test 14 durchführen. Stufe 0.1 bleibt bis zu diesem Praxistest offen.

`knowledge/rhia-core.json` bleibt bis zur tatsächlichen Migration ein nicht angeschlossenes Vergleichsarchiv. Es wird von keiner Laufzeitdatei importiert.
