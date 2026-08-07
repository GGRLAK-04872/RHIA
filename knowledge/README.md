# Nicht angeschlossenes Vergleichsarchiv

`rhia-core.json` dokumentiert den früher geprüften Grundbestand. Die Datei wird von Oberfläche, API, Chat und Durable Object nicht zur Laufzeit gelesen und ist keine Rückfallquelle. Nach abgeschlossener Migration und bestandenem Tablet-Test 14 kann sie in einem eigenen, ausdrücklich freigegebenen Bereinigungsschritt aus dem aktuellen Stand entfernt werden; die GitHub-Historie bleibt erhalten.

Der Pages-Build verwendet eine feste öffentliche Allowlist und legt nur `index.html` in `dist` ab. Dieses Archiv sowie alle übrigen internen Repository-Dateien gelangen dadurch nicht in das veröffentlichbare Pages-Artefakt.
